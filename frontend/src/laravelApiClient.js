const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002/api';
const ENCRYPTION_KEY = import.meta.env.VITE_API_ENCRYPTION_KEY || '';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const API_BASE_URL = DEFAULT_API_BASE_URL.replace(/\/$/, '');
export const laravelApiBaseUrl = API_BASE_URL.replace(/\/api$/, '');

let importedKeyPromise = null;
const authListeners = new Set();
const activeChannels = new Set();

function getApiUrl(path) {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${API_BASE_URL}${normalizedPath}`;
}

function ensureEncryptionKey() {
	const rawKeyBytes = encoder.encode(ENCRYPTION_KEY);

	if (!ENCRYPTION_KEY) {
		throw new Error('Missing VITE_API_ENCRYPTION_KEY. Add the shared AES-256-GCM key to the frontend environment.');
	}

	if (rawKeyBytes.length !== 32) {
		throw new Error('VITE_API_ENCRYPTION_KEY must be exactly 32 bytes for AES-256-GCM.');
	}
}

function toBase64(bytes) {
	let binary = '';

	for (let index = 0; index < bytes.length; index += 1) {
		binary += String.fromCharCode(bytes[index]);
	}

	return btoa(binary);
}

function fromBase64(value) {
	const binary = atob(value || '');
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
			'raw',
			encoder.encode(ENCRYPTION_KEY),
			{ name: 'AES-GCM' },
			false,
			['encrypt', 'decrypt'],
		);
	}

	return importedKeyPromise;
}

async function encryptBody(body) {
	const key = await getCryptoKey();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const plaintext = encoder.encode(JSON.stringify(body ?? {}));
	const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
	const tagLength = 16;

	return {
		ciphertext: toBase64(encrypted.slice(0, encrypted.length - tagLength)),
		iv: toBase64(iv),
		tag: toBase64(encrypted.slice(encrypted.length - tagLength)),
	};
}

async function decryptBody(wrapper) {
	const key = await getCryptoKey();
	const ciphertext = fromBase64(wrapper.ciphertext || '');
	const iv = fromBase64(wrapper.iv || '');
	const tag = fromBase64(wrapper.tag || '');

	if (!ciphertext.length || !iv.length || !tag.length) {
		throw new Error('Malformed encrypted response from server.');
	}

	const combined = new Uint8Array(ciphertext.length + tag.length);
	combined.set(ciphertext);
	combined.set(tag, ciphertext.length);

	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv, tagLength: tag.length * 8 },
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

function getStoredLaravelSession() {
	try {
		const rawSession = localStorage.getItem('laravel_api_session');
		if (!rawSession) {
			return null;
		}

		return JSON.parse(rawSession);
	} catch {
		return null;
	}
}

function getStoredLaravelToken() {
	try {
		const directToken = localStorage.getItem('laravel_api_token');
		if (directToken) {
			return directToken;
		}

		return getStoredLaravelSession()?.access_token || null;
	} catch {
		return null;
	}
}

function setStoredLaravelSession(session) {
	try {
		if (session) {
			localStorage.setItem('laravel_api_session', JSON.stringify(session));
			if (session.access_token) {
				localStorage.setItem('laravel_api_token', session.access_token);
			}
		} else {
			localStorage.removeItem('laravel_api_session');
			localStorage.removeItem('laravel_api_token');
		}
	} catch {
		// ignore storage failures
	}
}

function emitAuthState(event, session) {
	authListeners.forEach((listener) => {
		try {
			listener(event, session);
		} catch {
			// ignore listener failures
		}
	});
}

async function apiRequest(path, options = {}) {
	const method = String(options.method || 'GET').toUpperCase();
	const headers = { ...(options.headers || {}) };
	const token = getStoredLaravelToken();

	if (token && !headers.Authorization && !headers.authorization) {
		headers.Authorization = `Bearer ${token}`;
	}

	if (!headers.Accept && !headers.accept) {
		headers.Accept = 'application/json';
	}

	const fetchOptions = {
		method,
		headers,
	};

	if (options.body instanceof FormData) {
		fetchOptions.body = options.body;
	} else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		headers['Content-Type'] = 'application/json';
		const encryptedPayload = await encryptBody(options.body ?? {});
		fetchOptions.body = JSON.stringify({ payload: encryptedPayload });
	} else if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json';
		fetchOptions.body = JSON.stringify(options.body);
	}

	const response = await fetch(getApiUrl(path), fetchOptions);
	const parsed = await parseResponse(response);

	if (!response.ok) {
		const message = parsed?.error || parsed?.message || response.statusText || 'Request failed';
		throw new Error(message);
	}

	return parsed;
}

function toRows(value) {
	if (Array.isArray(value)) {
		return value;
	}

	if (value) {
		return [value];
	}

	return [];
}

async function requestTableRows(table, query = {}) {
	const response = await apiRequest('/database/query', {
		method: 'POST',
		body: {
			table,
			action: 'select',
			columns: '*',
			filters: query.filters || [],
			order: query.order || [],
			limit: query.limit,
			offset: query.offset,
			single: Boolean(query.single),
			maybeSingle: Boolean(query.maybeSingle),
		},
	});

	return toRows(response?.data);
}

async function hydrateRows(table, rows) {
	if (!rows.length) {
		return rows;
	}

	if (table === 'users') {
		const departmentIds = [...new Set(rows.map((row) => row.department_id).filter(Boolean).map(String))];

		let departmentsById = new Map();
		if (departmentIds.length > 0) {
			const departments = await requestTableRows('departments', {
				filters: [{ column: 'department_id', operator: 'in', value: departmentIds }],
			});
			departmentsById = new Map(departments.map((department) => [String(department.department_id), department]));
		}

		return rows.map((row) => {
			const department = departmentsById.get(String(row.department_id)) || null;
			return {
				...row,
				departments: department,
			};
		});
	}

	if (table === 'applications') {
		const facultyIds = [...new Set(rows.map((row) => row.faculty_id).filter(Boolean).map(String))];
		let facultyById = new Map();

		if (facultyIds.length > 0) {
			const facultyRows = await requestTableRows('users', {
				filters: [{ column: 'user_id', operator: 'in', value: facultyIds }],
			});
			facultyById = new Map(facultyRows.map((faculty) => [String(faculty.user_id), faculty]));
		}

		return rows.map((row) => {
			const faculty = facultyById.get(String(row.faculty_id)) || null;
			return {
				...row,
				faculty,
				users: faculty,
			};
		});
	}

	if (table === 'area_submissions') {
		const areaIds = [...new Set(rows.map((row) => row.area_id).filter(Boolean).map(String))];
		let areasById = new Map();

		if (areaIds.length > 0) {
			const areas = await requestTableRows('areas', {
				filters: [{ column: 'area_id', operator: 'in', value: areaIds }],
			});
			areasById = new Map(areas.map((area) => [String(area.area_id), area]));
		}

		return rows.map((row) => ({
			...row,
			areas: areasById.get(String(row.area_id)) || null,
		}));
	}

	return rows;
}

class QueryBuilder {
	constructor(client, table) {
		this.client = client;
		this.table = table;
		this.operation = 'select';
		this.filters = [];
		this.orderings = [];
		this.limitCount = undefined;
		this.offsetCount = undefined;
		this.singleMode = false;
		this.maybeSingleMode = false;
		this.values = undefined;
	}

	select() {
		this.operation = 'select';
		return this;
	}

	update(values) {
		this.operation = 'update';
		this.values = values;
		return this;
	}

	insert(values) {
		this.operation = 'insert';
		this.values = values;
		return this;
	}

	delete() {
		this.operation = 'delete';
		return this;
	}

	eq(column, value) {
		this.filters.push({ column, operator: 'eq', value });
		return this;
	}

	not(column, operator, value) {
		this.filters.push({ column, operator: `not ${String(operator || '').toLowerCase()}`.trim(), value });
		return this;
	}

	in(column, value) {
		this.filters.push({ column, operator: 'in', value });
		return this;
	}

	order(column, options = {}) {
		this.orderings.push({
			column,
			direction: options.ascending === false ? 'desc' : 'asc',
		});
		return this;
	}

	limit(count) {
		this.limitCount = count;
		return this;
	}

	maybeSingle() {
		this.maybeSingleMode = true;
		return this;
	}

	single() {
		this.singleMode = true;
		return this;
	}

	then(resolve, reject) {
		return this.execute().then(resolve, reject);
	}

	async execute() {
		try {
			if (this.operation === 'select') {
				const rows = await requestTableRows(this.table, {
					filters: this.filters,
					order: this.orderings,
					limit: this.limitCount,
					single: this.singleMode,
					maybeSingle: this.maybeSingleMode,
				});
				const hydratedRows = await hydrateRows(this.table, rows);
				const data = this.singleMode || this.maybeSingleMode ? (hydratedRows[0] || null) : hydratedRows;

				return { data, error: null };
			}

			const response = await apiRequest('/database/query', {
				method: 'POST',
				body: {
					table: this.table,
					action: this.operation,
					values: this.values,
					filters: this.filters,
				},
			});

			return { data: response?.data ?? null, error: null };
		} catch (error) {
			return { data: null, error };
		}
	}
}

class RealtimeChannel {
	constructor(name) {
		this.name = name;
		this.handlers = [];
		this.intervalId = null;
	}

	on(_eventType, _criteria, callback) {
		if (typeof callback === 'function') {
			this.handlers.push(callback);
		}

		return this;
	}

	subscribe() {
		if (this.intervalId) {
			return this;
		}

		this.intervalId = window.setInterval(() => {
			this.handlers.forEach((handler) => {
				try {
					handler({});
				} catch {
					// ignore polling errors in subscribers
				}
			});
		}, 15000);

		activeChannels.add(this);

		return this;
	}

	unsubscribe() {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		activeChannels.delete(this);
	}
}

async function getSession() {
	const session = getStoredLaravelSession();
	return { data: { session } };
}

async function getUser() {
	const token = getStoredLaravelToken();

	if (!token) {
		return { data: { user: null }, error: null };
	}

	try {
		const response = await apiRequest('/auth/validate', { method: 'GET' });
		const user = normalizeAuthUser(response?.user || null);
		const session = response?.session || null;

		if (session) {
			setStoredLaravelSession(session);
		}

		return { data: { user }, error: null };
	} catch (error) {
		clearStoredLaravelSession();
		return { data: { user: null }, error };
	}
}

function clearStoredLaravelSession() {
	setStoredLaravelSession(null);
}

function normalizeAuthUser(user) {
	if (!user || typeof user !== 'object') {
		return user;
	}

	const normalized = { ...user };

	if (!normalized.email && normalized.domain_email) {
		normalized.email = normalized.domain_email;
	}

	if (!normalized.domain_email && normalized.email) {
		normalized.domain_email = normalized.email;
	}

	return normalized;
}

async function signInWithPassword({ email, password }) {
	try {
		const response = await apiRequest('/auth/login', {
			method: 'POST',
			body: { email, password },
		});

		const session = response?.session || null;
		const user = normalizeAuthUser(response?.user || session?.user || null);

		if (session) {
			const normalizedSession = {
				...session,
				user,
			};
			setStoredLaravelSession(normalizedSession);
			emitAuthState('SIGNED_IN', normalizedSession);
		}

		return {
			data: { user, session },
			error: null,
		};
	} catch (error) {
		return {
			data: { user: null, session: null },
			error,
		};
	}
}

async function signOut() {
	try {
		await apiRequest('/auth/logout', {
			method: 'POST',
			body: {},
		});
	} catch {
		// ignore logout failures and still clear client state
	}

	clearStoredLaravelSession();
	emitAuthState('SIGNED_OUT', null);

	return { error: null };
}

async function updateUser(payload) {
	try {
		const response = await apiRequest('/auth/change-password', {
			method: 'POST',
			body: payload,
		});

		const user = normalizeAuthUser(response?.user || null);
		const session = getStoredLaravelSession();

		if (session && user) {
			setStoredLaravelSession({ ...session, user });
			emitAuthState('USER_UPDATED', { ...session, user });
		}

		return {
			data: { user },
			error: null,
		};
	} catch (error) {
		return {
			data: { user: null },
			error,
		};
	}
}

function onAuthStateChange(callback) {
	if (typeof callback === 'function') {
		authListeners.add(callback);
		queueMicrotask(() => {
			callback('INITIAL_SESSION', getStoredLaravelSession());
		});
	}

	return {
		data: {
			subscription: {
				unsubscribe() {
					if (typeof callback === 'function') {
						authListeners.delete(callback);
					}
				},
			},
		},
	};
}

function channel(name) {
	return new RealtimeChannel(name);
}

function removeChannel(channelInstance) {
	if (channelInstance && typeof channelInstance.unsubscribe === 'function') {
		channelInstance.unsubscribe();
	}

	return channelInstance;
}

export const laravelApiClient = {
	laravelApiBaseUrl,
	auth: {
		getSession,
		getUser,
		signInWithPassword,
		signOut,
		updateUser,
		onAuthStateChange,
	},
	from(table) {
		return new QueryBuilder(this, table);
	},
	channel,
	removeChannel,
};

export { laravelApiClient as supabase };
