import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createMissingSupabaseShim() {
	const warning =
		'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
		'Legacy Supabase calls still exist outside the migrated review flow. This shim will return safe no-op responses.';

	const noopPromise = async (value = null) => ({ data: value, error: null });

	const fromStub = (/* table */) => ({
		select: () => noopPromise([]),
		insert: () => noopPromise(null),
		upsert: () => noopPromise(null),
		update: () => noopPromise(null),
		delete: () => noopPromise(null),
	});

	const storageFromStub = () => ({
		list: async () => ({ data: [], error: null }),
		upload: async () => ({ data: null, error: null }),
		getPublicUrl: async (path) => ({ data: { publicURL: `/storage/${encodeURIComponent(path)}` }, error: null }),
		createSignedUrl: async (path) => ({ data: { signedUrl: `/storage/${encodeURIComponent(path)}` }, error: null }),
		remove: async () => ({ data: null, error: null }),
	});

	const shim = {
		// surface a few properties some code expects
		supabaseUrl: '',
		// minimal auth surface
		auth: {
			getUser: async () => ({ data: { user: null }, error: null }),
			onAuthStateChange: (_cb) => ({ data: null }),
			signInWithPassword: async () => ({ data: null, error: null }),
			signOut: async () => ({ data: null, error: null }),
			getSession: async () => ({ data: null, error: null }),
		},
		from: fromStub,
		storage: {
			from: storageFromStub,
			getPublicUrl: async (bucket, path) => ({ data: { publicURL: `/storage/${encodeURIComponent(path)}` }, error: null }),
		},
		channel: () => {
			const ch = {
				on: function () { return ch; },
				subscribe: async function () { return ch; },
			};
			return ch;
		},
		removeChannel: () => {},
	};

	// Proxy to log accesses for easier migration tracking
	return new Proxy(shim, {
		get(target, prop) {
			if (prop === 'then') return undefined; // avoid being treated as a promise
			if (!(prop in target)) {
				console.warn(`Supabase shim: accessed unknown property "${String(prop)}". Consider migrating this usage.`);
				return () => noopPromise(null);
			}
			return target[prop];
		},
	});
}

export const supabase = (supabaseUrl && supabaseKey)
	? createClient(supabaseUrl, supabaseKey)
	: createMissingSupabaseShim();
