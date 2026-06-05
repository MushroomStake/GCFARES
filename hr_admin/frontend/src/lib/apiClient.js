const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function getApiUrl(path) {
  const baseUrl = DEFAULT_API_BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function getStoredApiToken() {
  try {
    return localStorage.getItem('api_token');
  } catch {
    return null;
  }
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

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };
  const token = getStoredApiToken();

  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Ensure API returns JSON errors instead of HTML redirects
  if (!headers['Accept'] && !headers['accept']) {
    headers['Accept'] = 'application/json';
  }
  const fetchOptions = {
    method,
    headers,
  };

  if (options.body instanceof FormData) {
    fetchOptions.body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(options.body);
  } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify({});
  }

  const response = await fetch(getApiUrl(path), fetchOptions);
  const parsed = await parseResponse(response);

  if (!response.ok) {
    const message = parsed?.error || parsed?.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return parsed;
}