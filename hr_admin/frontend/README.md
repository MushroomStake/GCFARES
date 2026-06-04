# HR Admin Frontend (Vite + React)

This app is the HR Admin portal for the GCFARES system and connects directly to the Laravel API and MySQL database.

## 1) Local Setup

Install dependencies and run development server:

```bash
npm install
npm run dev
```

## 2) Local Setup

Install dependencies and run development server:

```bash
npm install
npm run dev
```

## 3) Environment

Set the API base and encryption key used by the Laravel backend in `.env` or `.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
VITE_API_ENCRYPTION_KEY=your-32-byte-key-here
```

Restart `npm run dev` after changing environment variables.

## 4) Notes

The frontend now uses the Laravel API for auth, data access, uploads, and cycle management. There are no Supabase-specific runtime requirements for HR Admin anymore.
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
