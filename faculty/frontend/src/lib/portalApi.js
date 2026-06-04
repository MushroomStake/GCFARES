import { apiRequest, clearStoredApiToken, setStoredApiToken } from "./apiClient.js";

const SESSION_STORAGE_KEY = "api_session";
const authListeners = new Set();
let currentSession = readStoredSession();
let lastVerifiedPassword = null;

function readStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  currentSession = session ?? null;

  try {
    if (currentSession) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
      if (currentSession.access_token) {
        setStoredApiToken(currentSession.access_token);
      }
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      clearStoredApiToken();
    }
  } catch {
    // ignore storage errors
  }
}

function emitAuthStateChange(event, session) {
  authListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch {
      // ignore listener errors
    }
  });
}

function createResult(data = null, error = null) {
  return { data, error };
}

function parseRowsPayload(data) {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  return [data];
}

async function executeDatabaseOperation(payload) {
  try {
    const response = await apiRequest("/database/query", {
      method: "POST",
      body: payload,
    });

    return createResult(response?.data ?? null, null);
  } catch (error) {
    return createResult(null, error);
  }
}

function createQueryBuilder(table) {
  const state = {
    table,
    operation: "select",
    select: "*",
    filters: [],
    order: null,
    limit: null,
    offset: null,
    single: false,
    values: null,
  };

  const builder = {
    select(columns = "*") {
      state.select = columns;
      return builder;
    },
    eq(column, value) { state.filters.push({ column, operator: "eq", value }); return builder; },
    neq(column, value) { state.filters.push({ column, operator: "neq", value }); return builder; },
    gt(column, value) { state.filters.push({ column, operator: "gt", value }); return builder; },
    gte(column, value) { state.filters.push({ column, operator: "gte", value }); return builder; },
    lt(column, value) { state.filters.push({ column, operator: "lt", value }); return builder; },
    lte(column, value) { state.filters.push({ column, operator: "lte", value }); return builder; },
    like(column, value) { state.filters.push({ column, operator: "like", value }); return builder; },
    ilike(column, value) { state.filters.push({ column, operator: "ilike", value }); return builder; },
    in(column, values) { state.filters.push({ column, operator: "in", value: values }); return builder; },
    is(column, value) { state.filters.push({ column, operator: "is", value }); return builder; },
    order(column, options = {}) {
      state.order = { column, direction: options.ascending === false ? "desc" : "asc" };
      return builder;
    },
    limit(value) { state.limit = value; return builder; },
    offset(value) { state.offset = value; return builder; },
    range(from, to) { state.offset = from; state.limit = Math.max(0, to - from + 1); return builder; },
    insert(values) { state.operation = "insert"; state.values = values; return builder; },
    update(values) { state.operation = "update"; state.values = values; return builder; },
    delete() { state.operation = "delete"; return builder; },
    maybeSingle() {
      state.single = true;
      return executeDatabaseOperation(state).then((result) => {
        const rows = parseRowsPayload(result.data);
        return createResult(rows[0] ?? null, result.error);
      });
    },
    single() {
      state.single = true;
      return executeDatabaseOperation(state).then((result) => {
        const rows = parseRowsPayload(result.data);
        if (result.error) return result;
        if (rows.length === 0) return createResult(null, new Error("No rows returned"));
        return createResult(rows[0], null);
      });
    },
    then(resolve, reject) {
      return executeDatabaseOperation(state).then(resolve, reject);
    },
  };

  return builder;
}

async function loadSessionFromServer() {
  const token = getStoredApiToken();
  if (!token) return createResult({ session: null, user: null }, null);

  try {
    const response = await apiRequest("/auth/validate", { method: "GET" });
    const user = response?.user ?? null;
    const session = user ? { access_token: token, user } : null;
    writeStoredSession(session);
    return createResult({ session, user }, null);
  } catch (error) {
    writeStoredSession(null);
    return createResult({ session: null, user: null }, error);
  }
}

function getStoredApiToken() {
  try {
    const directToken = localStorage.getItem("api_token");
    if (directToken) return directToken;

    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) return null;

    const session = JSON.parse(rawSession);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export const portalApi = {
  auth: {
    async getSession() {
      const storedSession = currentSession ?? readStoredSession();
      if (storedSession?.access_token) {
        setStoredApiToken(storedSession.access_token);
        return loadSessionFromServer();
      }

      return loadSessionFromServer();
    },

    async getUser() {
      const sessionResult = await this.getSession();
      return createResult({ user: sessionResult.data?.session?.user ?? null }, sessionResult.error);
    },

    async signInWithPassword({ email, password }) {
      try {
        const response = await apiRequest("/auth/login", {
          method: "POST",
          body: { email, password },
        });

        const session = response?.token ? { access_token: response.token, user: response.user ?? null } : null;
        lastVerifiedPassword = password;
        writeStoredSession(session);
        emitAuthStateChange("SIGNED_IN", session);

        return createResult({ session, user: response?.user ?? null }, null);
      } catch (error) {
        return createResult(null, error);
      }
    },

    async updateUser({ password }) {
      try {
        const response = await apiRequest("/auth/change-password", {
          method: "POST",
          body: { current_password: lastVerifiedPassword, new_password: password },
        });

        lastVerifiedPassword = null;
        if (response?.user && currentSession?.access_token) {
          const nextSession = { ...currentSession, user: response.user };
          writeStoredSession(nextSession);
          emitAuthStateChange("USER_UPDATED", nextSession);
        }

        return createResult({ user: response?.user ?? null }, null);
      } catch (error) {
        return createResult(null, error);
      }
    },

    async signOut() {
      const token = currentSession?.access_token || getStoredApiToken();

      if (token) {
        try {
          await apiRequest("/auth/logout", { method: "POST", body: {} });
        } catch {
          // ignore logout errors during cleanup
        }
      }

      lastVerifiedPassword = null;
      writeStoredSession(null);
      emitAuthStateChange("SIGNED_OUT", null);
      return createResult({}, null);
    },

    onAuthStateChange(callback) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  },

  from(table) {
    return createQueryBuilder(table);
  },

  storage: {
    from(bucket) {
      return {
        async upload(path, file, options = {}) {
          const formData = new FormData();
          formData.append("bucket", bucket);
          formData.append("path", path);
          formData.append("file", file);
          formData.append("upsert", String(Boolean(options.upsert)));

          try {
            const response = await apiRequest("/storage/upload", { method: "POST", body: formData });
            return createResult(response?.data ?? null, null);
          } catch (error) {
            return createResult(null, error);
          }
        },

        async createSignedUrl(path, expiresIn = 3600) {
          try {
            const response = await apiRequest("/storage/signed-url", {
              method: "POST",
              body: { bucket, path, expires_in: expiresIn },
            });

            return createResult(response?.data ?? null, null);
          } catch (error) {
            return createResult(null, error);
          }
        },
      };
    },
  },

  channel() {
    return { on() { return this; }, subscribe() { return this; } };
  },

  removeChannel() {
    return null;
  },
};
