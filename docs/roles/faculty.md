**Quick Start**
- Log in: Use your institutional `domain_email` and password via the Faculty portal login.
- Complete profile: Navigate to the Profile page and `UpdateMe` (edit fields such as `name_first`, `name_last`, `domain_email`, `educational_attainment`).
- Create an application: Use the `Create Application` action to submit an application for the active cycle.
- Upload submissions: Use `Create Submission` to upload area submissions and supporting files.
- View templates: Open `Templates` to download area-part templates before preparing submissions.

**Common Tasks**
| Task | Action / Feature | Notes |
|---|---:|---|
| Log in | Call `AuthController::login` (Auth → Login) | Enter institutional email and password.|
| Validate session | Call `AuthController::validateToken` | Used by the frontend to keep you signed-in.|
| Change password | Call `AuthController::changePassword` | Required on first login if prompted.|
| View dashboard data | `FacultyPortalController::bootstrap` | Loads current cycle, applications, areas, positions and submissions.|
| View/Edit profile | `FacultyPortalController::me` / `updateMe` | Edit fields like `current_rank`, `teaching_experience_years`.|
| Create Application | `FacultyPortalController::createApplication` | Provide `application_number`, `target_position_id`, `cycle_id`.|
| Update Application | `FacultyPortalController::updateApplication` | Update `status`, `vpaa_comment`, scores (where permitted).|
| Upload Submission | `FacultyPortalController::createSubmission` | Provide `application_id`, `area_id`, optional `file_path` or CSV fields.|
| Update / Delete Submission | `updateSubmission` / `deleteSubmission` | Update fields or delete a previously uploaded submission.|
| List Templates | `FacultyPortalController::templates` | Retrieve active templates for areas/parts.|
| Upload files | `StorageController::upload` / `signedUrl` | Used by the frontend to store submission files.|

**Troubleshooting**
- Cannot log in / Invalid credentials: Verify your `domain_email` and password. If `is_first_login` is set, you may need to change your password using Change Password.
- API returns 401 Unauthorized: Ensure the frontend stored the bearer token from login and sends it in the `Authorization: Bearer <token>` header (calls use `api.token` middleware).
- Submission upload fails or file not found: Verify the returned `signedUrl`/upload path, and ensure the file was saved to configured storage (check `storage/app/public` or the configured `FACULTY_PORTAL_PUBLIC_STORAGE_PATH`).
- Missing templates or downloads: If a template file returns 404, contact HR Admin to confirm the `Upload Template` step completed and template file exists.
- SQL connection refused: If you see SQLSTATE[HY000] [2002], ask the admin to confirm backend `.env` `DB_HOST` and `DB_PORT` (e.g., XAMPP may use `3307`) and run `php artisan config:clear` on the backend.

**Need technical help?**
[See architecture and integration details](../architecture.md)
