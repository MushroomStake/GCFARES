const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getApiUrl(path) {
  const baseUrl = DEFAULT_API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function getStoredApiToken() {
  try {
    const directToken = localStorage.getItem("api_token");
    if (directToken) return directToken;

    const rawSession = localStorage.getItem("api_session");
    if (!rawSession) return null;

    const session = JSON.parse(rawSession);
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export function setStoredApiToken(token) {
  try {
    if (token) {
      localStorage.setItem("api_token", token);
    } else {
      localStorage.removeItem("api_token");
    }
  } catch {
    // ignore
  }
}

export function clearStoredApiToken() {
  setStoredApiToken(null);
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  const token = getStoredApiToken();

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!headers.Accept && !headers.accept) {
    headers.Accept = "application/json";
  }

  const fetchOptions = {
    method,
    headers,
  };

  if (options.body instanceof FormData) {
    fetchOptions.body = options.body;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  } else if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify({});
  }

  const response = await fetch(getApiUrl(path), fetchOptions);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    const message = parsed?.error || parsed?.message || response.statusText || "Request failed";
    throw new Error(message);
  }

  return parsed;
}
