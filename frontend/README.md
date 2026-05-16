# HR Admin Frontend (Vite + React)

This app is the HR Admin portal for the GCFARES system and connects directly to Supabase for auth and table operations.

## 1) Local Setup

Install dependencies and run development server:

```bash
npm install
npm run dev
```

## 2) Required Environment Variables

Create `.env` (or `.env.local`) in this `hradmin` folder:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Important:

- Use **ANON/PUBLISHABLE** key for frontend.
- Never use `SUPABASE_SERVICE_ROLE_KEY` in frontend.
- Restart `npm run dev` after changing `.env`.

## 3) Why these errors happen

### Error: `supabaseUrl is required`

Cause: `VITE_SUPABASE_URL` (or anon key) is missing in frontend environment.

Fix:

1. Add the two `VITE_` variables above.
2. Restart Vite dev server.

### Error: `403 (Forbidden)` on REST insert

Cause: Row Level Security (RLS) policy does not allow this operation for the current role.

Fix: Add or update policies in Supabase SQL editor.

## 4) RLS Fixes Applied (SQL)

### A. Open `users` table to all authenticated users

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated full access on users" ON public.users;

CREATE POLICY "Authenticated full access on users"
	ON public.users
	FOR ALL
	TO authenticated
	USING (true)
	WITH CHECK (true);
```

### B. Open `ranking_cycles` table to all authenticated users

```sql
ALTER TABLE public.ranking_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_cycles_select_authenticated" ON public.ranking_cycles;
DROP POLICY IF EXISTS "ranking_cycles_insert_authenticated" ON public.ranking_cycles;
DROP POLICY IF EXISTS "ranking_cycles_update_authenticated" ON public.ranking_cycles;
DROP POLICY IF EXISTS "ranking_cycles_delete_authenticated" ON public.ranking_cycles;
DROP POLICY IF EXISTS "Policy with security definer functions" ON public.ranking_cycles;

CREATE POLICY "ranking_cycles_select_authenticated"
	ON public.ranking_cycles
	FOR SELECT
	TO authenticated
	USING (true);

CREATE POLICY "ranking_cycles_insert_authenticated"
	ON public.ranking_cycles
	FOR INSERT
	TO authenticated
	WITH CHECK (true);

CREATE POLICY "ranking_cycles_update_authenticated"
	ON public.ranking_cycles
	FOR UPDATE
	TO authenticated
	USING (true)
	WITH CHECK (true);

CREATE POLICY "ranking_cycles_delete_authenticated"
	ON public.ranking_cycles
	FOR DELETE
	TO authenticated
	USING (true);
```

### C. Apply same authenticated full-access policy to all public tables

Use this only if you intentionally want all signed-in users to read/write all tables.

```sql
BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

DO $$
DECLARE
	t RECORD;
	p RECORD;
BEGIN
	FOR t IN
		SELECT tablename
		FROM pg_tables
		WHERE schemaname = 'public'
	LOOP
		EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
	END LOOP;

	FOR p IN
		SELECT schemaname, tablename, policyname
		FROM pg_policies
		WHERE schemaname = 'public'
	LOOP
		EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
	END LOOP;

	FOR t IN
		SELECT tablename
		FROM pg_tables
		WHERE schemaname = 'public'
	LOOP
		EXECUTE format(
			'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
			t.tablename || '_select_authenticated', t.tablename
		);
		EXECUTE format(
			'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',
			t.tablename || '_insert_authenticated', t.tablename
		);
		EXECUTE format(
			'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
			t.tablename || '_update_authenticated', t.tablename
		);
		EXECUTE format(
			'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',
			t.tablename || '_delete_authenticated', t.tablename
		);
	END LOOP;
END $$;

COMMIT;
```

## 5) Known Policy Pitfall

If a policy references custom SQL functions (for example `get_teams_for_user(auth.uid())`) and that function does not exist with matching argument types, inserts/updates fail with SQL errors.

Use direct predicates (`USING (true)` / `WITH CHECK (true)`) or create the required function with exact signature.

## 6) Authentication Notes

- This app signs in via `supabase.auth.signInWithPassword(...)`.
- These table writes run as the authenticated user role, so RLS policies must allow `authenticated`.
- Service-role bypass should only be done in backend code.

## 7) Security Recommendation

The permissive policies above are useful for development. For production, restrict access by role and ownership (for example HR-only writes, faculty own-row access).
