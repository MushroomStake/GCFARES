**Quick Start**
- Log in: Use your HR Admin credentials (Auth → Login).
- Manage users: Use `UserManagementController` actions to create, update, archive, or change status for faculty accounts.
- Create a ranking cycle: Use `Create Cycle` to start a new ranking period.
- Add participants: Use `upsertParticipant` to add or invite faculty to the cycle.
- Review applications: Use `ReviewController::applications` and `submissions` to inspect faculty applications and supporting submissions.
- Score submissions: Use `upsertAreaScore` and `updateSubmissionScoring` to evaluate and record per-area scores.

**Common Tasks**
| Task | Action / Feature | Notes |
|---|---:|---|
| Log in | `AuthController::login` | Use your HR admin account.|
| List faculty users | `UserManagementController::index` | Returns non-archived faculty accounts.|
| Create faculty user | `UserManagementController::store` | Supply `email`, `name_first`, `name_last`, `password`, and optional profile fields.|
| Update faculty user | `UserManagementController::update` | Modify profile and employment fields.|
| Change user status | `UserManagementController::updateStatus` | Set `status` to `ranking` or `inactive`.|
| Archive user | `UserManagementController::archive` | Moves user to `archived_faculty_users` and marks inactive.|
| Create Cycle | `UserManagementController::createCycle` / `ReviewController::createCycle` | Provide `title`, `year`, `semester`, `start_date`, `deadline`.|
| Finalize Cycle | `UserManagementController::finalizeCycle` / `ReviewController::finalizeCycle` | Sets cycle `status` to `finished` and closes editing.|
| Add participant | `UserManagementController::upsertParticipant` | Invite or accept a faculty; fields include `faculty_id`, `invite_email`, `status`.|
| List applications | `ReviewController::applications` | Returns applications and computed `display_score` and `submission_count`.|
| View submissions | `ReviewController::submissions` | Returns per-application submission rows with area metadata.|
| Upsert area score | `ReviewController::upsertAreaScore` | Provide `application_id`, `area_id`, `cycle_id`, `hr_points` to set area totals.|
| Manage area IV imports | `replaceAreaIvImports`, `areaIvImports`, `latestAreaIvImport` | Import and map IV evaluation rows for matching.|
| Upload templates | `ReviewController::uploadTemplate` | Upload a PDF/DOCX; file stored on `public` disk and DB upserted.|

**Troubleshooting**
- Permission denied or 403: Ensure the token used is an HR-admin token (routes use `api.token:HR` where applicable).
- Created user doesn't receive cycle participant entry: After creating a user, call `upsertParticipant` with `cycle_id` to add them to the cycle.
- Unexpected missing submissions or scores: Confirm `area_submissions` and `area_submission_criterion_scores` exist in DB; the controller auto-creates criterion rows but storage paths and uploads must exist.
- Template upload fails: Check file size and mime-type (allowed `pdf, docx`, max 5MB) and storage disk permissions for `public`.
- Finalize Cycle unexpected side-effects: Finalize sets many accounts to `inactive` and removes participants; run in staging first and verify backups of `applications` and `cycle_participants`.

**Data Privacy & Ethics**
- Handle PII and evaluation data with strict confidentiality: user profiles, evaluation scores, and imported IV data are sensitive.
- Limit exports: Use `area_iv_student_evaluation_imports` and `users` exports sparingly and only for authorized audits.
- Use secure storage: Uploaded templates and submissions are saved to the configured storage disks; ensure `public` storage roots are access-controlled and that external roots (e.g., `FACULTY_PORTAL_PUBLIC_STORAGE_PATH`) are approved.
- Audit and logging: Make sure changes to `hr_score`, `final_score`, participant lists, and user archives are tracked externally if needed.
- Encryption: The backend may encrypt user profile fields; do not attempt to manually decrypt or export encrypted columns without approval.

**Need technical help?**
[See architecture and integration details](../architecture.md)
