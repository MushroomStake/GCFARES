import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
			'Create a .env (or .env.local) in the project root with these values and restart the dev server.'
	);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
