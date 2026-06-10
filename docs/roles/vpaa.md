**Quick Start**
- Log in: Use your VPAA account via the VPAA portal login.
- Validate session: Use `validateToken` to confirm an active session.
- Run database queries: Use the `Database Query` feature to inspect allowed tables when needed (see allowed tables list below).
- Change password: Use the Change Password action on first login or to rotate credentials.

**Common Tasks**
| Task | Action / Feature | Notes |
|---|---:|---|
| Log in | `AuthController::login` | Enter VPAA `domain_email` and password (role must be `VPAA`).|
| Validate session | `AuthController::validateToken` | Confirms token validity and returns public user info.|
| Change password | `AuthController::changePassword` | Updates `password_hash` and clears `is_first_login`.|
| Run database query | `DatabaseController::query` | Allowed tables are restricted; actions: `select`, `insert`, `update`, `delete`.
| Allowed tables | See `DatabaseController::ALLOWED_TABLES` | Typical tables: `applications`, `users`, `area_submissions`, `ranking_cycles`, `area_part_templates`, etc.

**Troubleshooting**
- Login returns 403 (not a VPAA account): Ensure the account `role` field is set to `VPAA` in `users`.
- Database query returns 422 "Table not allowed": Confirm the target table is in the allowed list (the backend restricts accessible tables).
- Database query returns 401/403: Confirm the bearer token is present and valid; use `validateToken` to debug.
- Unexpected DB changes: Use `select` with filters before running `update`/`delete`; the `Database Query` feature is powerful — prefer read-only queries in normal workflows.

**Data Privacy & Ethics**
- VPAA access grants the ability to read and (with certain actions) modify evaluation and personnel data. Limit use to authorized administrative tasks only.
- Do not export or share PII: `users`, `archived_faculty_users`, `area_iv_student_evaluation_imports`, and `applications` contain sensitive data.
- Use read-only queries where possible and obtain approval before performing `insert`/`update`/`delete` operations.
- Ensure any data extracts are stored and transmitted securely and access is logged.

**Need technical help?**
[See architecture and integration details](../architecture.md)
