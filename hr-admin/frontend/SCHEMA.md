# Firestore Database Schema

> Auto-generated on **2026-03-17** by `scripts/inspectFullSchema.mjs`.
> Updated on **2026-03-18** with `cycles` collection for dashboard integration.
> Re-run the script any time new collections are added.

---

## Collections Found

| Collection | Docs Sampled | Top-level Fields |
|---|---|---|
| `users` | 2 | `createdAt`, `email`, `password`, `role`, `presentRank`, `school`, `lastPromotionDate`, `natureOfAppointment`, `teachingExperienceYears`, `department`, `cycle_id`, `currentSalary`, `educationalAttainment`, `eligibility`, `industryExperienceYears`, `applyingFor`, `name` |

---

## Collection: `users`

**2** document(s) sampled.  
Sample IDs: `YZTz5yTd8iebCyWVFcQ2A2TZTl22`, `faculty_101`

| Field | Type(s) | Notes |
|---|---|---|
| `createdAt` | `Timestamp` | |
| `email` | `string` | |
| `password` | `string` | |
| `role` | `string` | |
| `presentRank` | `string` | |
| `school` | `string` | |
| `lastPromotionDate` | `string` | |
| `natureOfAppointment` | `string` | |
| `teachingExperienceYears` | `number` | |
| `department` | `string` | |
| `cycle_id` | `string` | |
| `currentSalary` | `number` | |
| `educationalAttainment` | `array<{ school, degree }>` | |
| `eligibility` | `string` | |
| `industryExperienceYears` | `number` | |
| `applyingFor` | `string` | |
| `name` | `string` | |

---

## Field Name Quick-Reference

| UI Label | Collection | Firestore Field |
|---|---|---|
| Created At | `users` | `createdAt` |
| Email | `users` | `email` |
| Password | `users` | `password` |
| Role | `users` | `role` |
| Present Rank | `users` | `presentRank` |
| School | `users` | `school` |
| Last Promotion Date | `users` | `lastPromotionDate` |
| Nature Of Appointment | `users` | `natureOfAppointment` |
| Teaching Experience Years | `users` | `teachingExperienceYears` |
| Department | `users` | `department` |
| Cycle id | `users` | `cycle_id` |
| Current Salary | `users` | `currentSalary` |
| Educational Attainment | `users` | `educationalAttainment` |
| Eligibility | `users` | `eligibility` |
| Industry Experience Years | `users` | `industryExperienceYears` |
| Applying For | `users` | `applyingFor` |
| Name | `users` | `name` |

---

## Collections Not Yet Created

Add entries here as the system grows.

| Collection | Purpose |
|---|---|
| `ranking_cycles` | ✅ **Used by Dashboard** — Evaluation cycles (semester, start/end dates, status) |
| `applications` | ✅ **Used by Dashboard** — Faculty applications (for stats calculation) |
| `faculty` | ✅ **Used by Dashboard** — Faculty records (for total count) |
| `users` | ✅ **Used by Dashboard & User Management** — User accounts with roles |
| `areas` | Ranking criteria/evaluation areas |
| `departments` | Academic departments |
| `positions` | Target academic positions/ranks |
| `facultyrows` | ⚠️ **Legacy/test collection** — consider removing |

---

## Dashboard Integration Status ✅

The dashboard now uses the **existing database structure** from `DATABASE-SCHEMA.md`:

### **Collections Used:**
- `ranking_cycles` — Gets current open cycle + historical cycles
- `applications` — Counts pending/completed applications for stats
- `faculty` + `users` — Counts total faculty members
- Uses proper **snake_case** field names and **Firestore Timestamps**

### **Field Mapping:**
- `ranking_cycles.status`: `"open"` (active) / `"close"` (historical) 
- `ranking_cycles.start_date` / `deadline`: Firestore Timestamp objects
- `applications.status`: `"Under_HR_Review"`, `"Submitted"` (pending) / others (completed)

---

