# GCFARES Firestore Database Schema
**Project:** gcfares-6bf1e  
**Generated:** March 18, 2026  
**Source:** Live database inspection

---

## Overview

Your Firestore database contains **7 top-level collections**:

1. `applications` — Faculty ranking applications (with sub-collections)
2. `areas` — Ranking criteria/areas (e.g., "AREA IV: PERFORMANCE EVALUATION")
3. `departments` — Academic departments
4. `faculty` — Faculty member records
5. `facultyrows` — Additional faculty table rows (legacy?)
6. `positions` — Target academic positions/ranks
7. `ranking_cycles` — Semester/year promotion cycles
8. `users` — Authentication + profile data

---

## 1. Collection: `applications`

**Purpose:** Faculty ranking/promotion applications  
**Document ID:** `app_001`, `app_002`, etc. (auto-generated or manual)

### Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `application_id` | number | `500` | Numeric application ID |
| `application_number` | string | `"APP-2026-0001"` | Human-readable app number |
| `faculty_id` | string | `"faculty_101"` | References `users` collection |
| `cycle_id` | string | `"cycle_2026"` | References `ranking_cycles` |
| `current_rank_at_time` | string | `"Instructor I"` | Rank when applied |
| `target_position_id` | string | `"1"` | References `positions` |
| `status` | string | `"Under_HR_Review"` | Enum: Draft, Submitted, Under_HR_Review, etc. |
| `hr_score` | number | `45` | HR score |
| `vpaa_score` | number | `0` | VPAA score |
| `final_score` | number | `45` | Combined/calculated score |
| `created_at` | Timestamp | `Timestamp(...)` | Application creation date |

### Sub-collections

#### `applications/{appId}/application_logs`
Activity log for status changes.

| Field | Type | Example |
|-------|------|---------|
| `log_id` | number | `1` |
| `changed_by` | string | `"dummy_auth_uid_123"` |
| `old_status` | string | `"Draft"` |
| `new_status` | string | `"Submitted"` |
| `comment` | string | `"Initial Application Submitted"` |
| `changed_at` | Timestamp | `Timestamp(...)` |

#### `applications/{appId}/area_submissions`
Per-area file uploads and scores.

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `submission_id` | number | `900` | |
| `area_id` | string | `"4"` | References `areas` |
| `file_path` | string | `"https://supabase-bucket.../evaluation.pdf"` | Supabase Storage URL or direct downloadable link to PDF |
| `csv_total_average_rate` | number | `92.5` | CSV-based calculation |
| `hr_points` | number | `10` | HR points assigned (editable in review screen) |
| `vpaa_points` | number | `0` | VPAA points |
| `uploaded_at` | Timestamp | `Timestamp(...)` | Upload timestamp |

**PDF Storage:** PDFs are stored in Supabase Storage bucket and referenced via `file_path`. The file is downloadable directly from the provided URL. The review interface shows a "Download PDF" button instead of the file path, providing a cleaner user experience.

---

## 2. Collection: `areas`

**Purpose:** Defines ranking criteria/areas  
**Document ID:** Numeric string (`"4"`, `"5"`, etc.)

### Fields

| Field | Type | Example |
|-------|------|---------|
| `area_name` | string | `"AREA IV: PERFORMANCE EVALUATION"` |
| `description` | string | `"Automated Evaluation via CSV"` |
| `template_file_path` | string | `"/templates/area4.pdf"` |
| `is_csv_based` | boolean | `true` |
| `max_possible_points` | number | `10` |

**Note:** Only one sample document (`"4"`) exists. You'll likely add more areas (1-10 based on the HTML mockups).

---

## 3. Collection: `departments`

**Purpose:** Academic departments  
**Document ID:** Numeric string (`"1"`, `"2"`, etc.)

### Fields

| Field | Type | Example |
|-------|------|---------|
| `department_name` | string | `"College of Computer Studies"` |

**Current records:** Only 1 department exists.

---

## 4. Collection: `faculty`

**Purpose:** Faculty member records (user management table)  
**Document ID:** Auto-generated (Supabase IDs like `0KkM8iujCxldW2ddpgwK`)

### Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `name` | string | `""` | Empty in most records |
| `email` | string | `""` | Empty in most records |
| `department` | string | `"CCS"` | Department code |
| `rank` | string | `"Instructor I"` | Current academic rank |
| `status` | string | `"ranking"` | Enum: `"ranking"` or `"inactive"` |
| `createdAt` | string | `"3/17/2026"` | Date string (not Timestamp) |

**Issue:** Most faculty records have empty `name` and `email`. These appear to be placeholder/test records.

---

## 5. Collection: `facultyrows`

**Purpose:** Unclear — appears to be a legacy/test table  
**Document ID:** Human-readable string (`"faculty number 1"`)

### Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `name` | string | `""` | Empty |
| `current ranks` | string | `""` | Typo: should be singular? |
| `email` | string | `""` | Empty |
| `deparment` | string | `""` | Typo: "deparment" |
| `current rank` | string | `""` | Duplicate of "current ranks"? |
| `current taker` | string | `""` | Meaning unclear |
| `createdAt` | Timestamp | `Timestamp(...)` | Proper timestamp here |

**Recommendation:** This collection looks like a test/duplicate. Consider removing or migrating to `faculty`.

---

## 6. Collection: `positions`

**Purpose:** Target academic ranks/positions  
**Document ID:** Numeric string (`"1"`, `"2"`, etc.)

### Fields

| Field | Type | Example |
|-------|------|---------|
| `position_name` | string | `"Assistant Professor I"` |
| `description` | string | `"Rank 1 requirements"` |
| `required_area_count` | number | `10` |
| `is_active` | boolean | `true` |

---

## 7. Collection: `ranking_cycles`

**Purpose:** Academic year/semester cycles for promotions  
**Document ID:** `cycle_2025`, `cycle_2026`, etc.

### Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `title` | string | `"Promotional Cycle 2025"` | Display name |
| `year` | number | `2026` | Academic year |
| `semester` | string | `"First Semester"` | Semester name |
| `status` | string | `"open"` | Enum: `"open"` or `"close"` |
| `start_date` | Timestamp | `Timestamp(...)` | Cycle start |
| `deadline` | Timestamp | `Timestamp(...)` | Submission deadline |
| `created_by` | string | `"dummy_auth_uid_123"` | Creator auth UID |

**Existing cycles:**
- `cycle_2025` — status: `"close"`
- `cycle_2026` — status: `"open"`

---

## 8. Collection: `users`

**Purpose:** User accounts (faculty, admin)  
**Document ID:** Supabase Auth UID or custom ID (`faculty_101`, etc.)

### Fields (vary by user type)

#### Admin User (`YZTz5yTd8iebCyWVFcQ2A2TZTl22`)

| Field | Type | Example |
|-------|------|---------|
| `email` | string | `"admin@gordoncollege.edu.ph"` |
| `password` | string | `"admin123"` ⚠️ |
| `role` | string | `"admin"` |
| `createdAt` | Timestamp | `Timestamp(...)` |

⚠️ **Security Issue:** Password stored in plain text. Use Supabase Auth instead.

#### Faculty User (`faculty_101`)

| Field | Type | Example |
|-------|------|---------|
| `name` | string | `"Jenkins, Sarah A."` |
| `department` | string | `"CCS"` |
| `school` | string | `"State University"` |
| `educationalAttainment` | array | `[{degree, school}, ...]` |
| `presentRank` | string | `"Instructor II"` |
| `natureOfAppointment` | string | `"Permanent"` |
| `currentSalary` | number | `45000` |
| `eligibility` | string | `"Civil Service Professional"` |
| `applyingFor` | string | `"Instructor III"` |
| `lastPromotionDate` | string | `"2021-12-05"` |
| `teachingExperienceYears` | number | `8` |
| `industryExperienceYears` | number | `3` |
| `cycle_id` | string | `"cycle_2026"` |

---

## Field Naming Convention Analysis

### Current patterns found:
- **snake_case:** `application_id`, `hr_score`, `created_at`, `area_name`
- **camelCase:** `createdAt`, `educationalAttainment`, `presentRank`, `applyingFor`
- **Mixed/inconsistent:** Both styles exist across collections

### Recommendations:
1. **Standardize to snake_case** (matches your `applications` collection)
2. Or **standardize to camelCase** (more JavaScript-friendly)
3. Fix typos: `deparment` → `department`, `current ranks` → `current_rank`
4. Use consistent date fields: Either all Timestamp or all ISO strings

---

## Status Enums Found

| Field | Values |
|-------|--------|
| `applications.status` | `"Draft"`, `"Submitted"`, `"Under_HR_Review"` |
| `faculty.status` | `"ranking"`, `"inactive"` |
| `ranking_cycles.status` | `"open"`, `"close"` |
| `users.role` | `"admin"`, (faculty have no role field) |

---

## Review & Scoring Interface

### Eye Icon - View Detailed Scoring Criteria
When an HR reviewer clicks the **eye icon** next to an area in the review screen:

1. **Detail Scoring Criteria Panel** opens on the right side
2. Displays the area name and current **Area Score** (HR Points)
3. Shows **Edit Score** button with an input field and save option
4. Reviewer can modify the score and save it to the database

### PDF Evidence Management
- Each area submission has a **file_path** field pointing to a Supabase Storage URL
- The review panel shows a **Download PDF** button (instead of displaying the path)
- Clicking the button downloads the PDF evidence directly
- The actual file path is hidden from the UI for a cleaner user experience

### Actual Score Editing
- Editable field for **HR Points**: The reviewer can change the score
- Scores are validated (must be numeric, within min/max bounds)
- Changes are saved to the `hr_points` field in `area_submissions` table
- Total application score is automatically recalculated

---

## Next Steps

1. **Clean up test data:** Many `faculty` docs have empty names/emails
2. **Remove `facultyrows`** if it's a test collection
3. **Standardize field naming** across all collections
4. **Move passwords to Supabase Auth** (remove plain text from `users`)
5. **Add more `areas`** (currently only 1 exists, but HTML shows 10)
6. **Add more `departments`** (currently only 1 exists)
7. **Add more `positions`** (currently only 1 rank defined)

---

## Full Output File

The complete raw database dump is in: `inspect-output.json`
