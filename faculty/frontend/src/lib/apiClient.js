const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const ENCRYPTION_KEY = import.meta.env.VITE_API_ENCRYPTION_KEY || "";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let importedKeyPromise = null;

function getApiUrl(path) {
  const baseUrl = DEFAULT_API_BASE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function ensureEncryptionKey() {
  const rawKeyBytes = encoder.encode(ENCRYPTION_KEY);

  if (!ENCRYPTION_KEY) {
    throw new Error("Missing VITE_API_ENCRYPTION_KEY. Add the shared AES-256-GCM key to the frontend environment.");
  }

  if (rawKeyBytes.length !== 32) {
    throw new Error("VITE_API_ENCRYPTION_KEY must be exactly 32 bytes for AES-256-GCM.");
  }
}

function toBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function getCryptoKey() {
  ensureEncryptionKey();

  if (!importedKeyPromise) {
    importedKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(ENCRYPTION_KEY),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }

  return importedKeyPromise;
}

async function encryptBody(body) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(body ?? {}));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));

  const tagLength = 16;
  return {
    ciphertext: toBase64(encrypted.slice(0, encrypted.length - tagLength)),
    iv: toBase64(iv),
    tag: toBase64(encrypted.slice(encrypted.length - tagLength)),
  };
}

async function decryptBody(wrapper) {
  const key = await getCryptoKey();
  const ciphertext = fromBase64(wrapper.ciphertext || "");
  const iv = fromBase64(wrapper.iv || "");
  const tag = fromBase64(wrapper.tag || "");

  if (!ciphertext.length || !iv.length || !tag.length) {
    throw new Error("Malformed encrypted response from server.");
  }

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: tag.length * 8 },
    key,
    combined,
  );

  return JSON.parse(decoder.decode(decrypted));
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }

  if (parsed?.payload?.ciphertext) {
    return decryptBody(parsed.payload);
  }

  return parsed;
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
  } else if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    const encryptedPayload = await encryptBody(options.body ?? {});
    fetchOptions.body = JSON.stringify({ payload: encryptedPayload });
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(getApiUrl(path), fetchOptions);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    const message = parsed?.error || parsed?.message || response.statusText || "Request failed";
    throw new Error(message);
  }

  return parsed;
}
