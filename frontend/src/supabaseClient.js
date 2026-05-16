import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
// You can find these in your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = 'https://rxrvqaheqajnbsfvliad.supabase.co'; // e.g., 'https://xyzcompany.supabase.co'
const supabaseAnonKey = 'sb_publishable_Sy_dTDHX3GX0p7XfdwFerg_ovxqZEmA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);