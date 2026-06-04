# Cycle Status Lifecycle Update - Implementation Guide

## Overview
This update changes the cycle lifecycle to properly distinguish between:
- **`open`** — Submissions are open
- **`submissions_closed`** — Submissions are blocked, but evaluation is ongoing  
- **`finished`** — Evaluation is complete

Previously, both "Close Submissions" and "Finish Evaluation" set status to `'closed'`, making them indistinguishable in the database.

## Database Changes Required

### 1. Apply the SQL Migration
Run the following SQL in your Supabase SQL Editor:

```sql
-- Migration: Update ranking_cycles status enum to support distinct lifecycle states
-- Purpose: Distinguish between "submissions closed" and "evaluation finished"

ALTER TABLE public.ranking_cycles
DROP CONSTRAINT IF EXISTS ranking_cycles_status_check;

ALTER TABLE public.ranking_cycles
ADD CONSTRAINT ranking_cycles_status_check 
CHECK (status IN ('open', 'submissions_closed', 'finished', 'closed'));

-- Note: 'closed' is kept for backward compatibility with existing cycles
```

**Path:** `Hr Admin/hradmin/migrations/update_cycle_status_enum.sql`

### Steps:
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the migration SQL above
3. Click "Run" button

## Code Changes Summary

### Admin Dashboard (HR Admin)
**File:** `Hr Admin/hradmin/src/pages/dashboard.jsx`

#### Changes:
- `getStatusBadge()` now displays: 'Finished', 'Submissions Closed', or status from date logic
- `getActionButtons()` now shows different buttons based on status:
  - **open:** Edit + Lock/Unlock + Close Submissions + Finish Evaluation
  - **submissions_closed:** Edit + Lock/Unlock + Finish Evaluation + Re-open Submissions
  - **finished:** Edit + Open Cycle (restart)
- `confirmCycleAction()` logic updated:
  - `close` action → sets status to `'submissions_closed'` (not `'closed'`)
  - `finish` action → sets status to `'finished'` (not `'closed'`)
  - `reopen` action → sets status back to `'open'` (allows re-opening submissions after closure)

### Faculty Portal
**File:** `Faculty Portal/frontend/src/pages/faculty/tabs/Home.jsx`

#### Changes:
- Submission window logic updated to check cycle status:
  - `status === 'open'` → submissions allowed ✅
  - `status === 'submissions_closed'` or `'finished'` → submissions blocked ❌
  - Fallback to legacy fields for backward compatibility

### VPAA Dashboard
**Files:** 
- `VPAA/src/pages/DashboardPage.tsx`
- `VPAA/src/pages/HistoryPage.tsx`
- `VPAA/src/pages/CycleDetailsPage.tsx`
- `VPAA/src/pages/FacultyReviewPage.tsx`

#### Changes:
- Status display labels updated to show 'In Progress', 'Submissions Closed', 'Finished'
- Badge display logic updated to distinguish all three states
- `FacultyReviewPage` now checks for `in(['open', 'submissions_closed'])` to find active/ongoing cycles

## Workflow

### Admin Flow:
1. **Create/Edit Cycle** → Status starts as `'open'`
2. **Close Submissions** → Status changes to `'submissions_closed'`
   - Faculty cannot submit new files
   - Evaluation continues
   - Admin can review existing submissions
3. **Finish Evaluation** → Status changes to `'finished'`
   - All profiles locked
   - Evaluation workflow complete
4. **Re-open Submissions** (optional) → Status back to `'submissions_closed'` or `'open'`
   - Allows reopening if needed before finalizing

### Faculty Flow:
1. **When status = 'open'** → Can submit files ✅
2. **When status = 'submissions_closed'** → Submission buttons disabled, shows "Submissions are currently closed"
3. **When status = 'finished'** → Same as submissions_closed, all operations locked

## Backward Compatibility
- The `'closed'` status value is still accepted in the database constraint for backward compatibility
- Existing cycles with `status = 'closed'` will work but display as "Finished"
- Any new cycles created will use the new explicit status values

## Testing Checklist
- [ ] Migration applied successfully in Supabase
- [ ] Create a new cycle (should start as 'open')
- [ ] Click "Close Submissions" → status should be 'submissions_closed'
- [ ] Faculty dashboard shows submissions blocked
- [ ] Click "Finish Evaluation" → status should be 'finished'
- [ ] All faculty profile editing locked
- [ ] Click "Re-open Submissions" → status back to 'open'
- [ ] VPAA dashboard shows correct status labels

## Rollback (if needed)
If you need to revert to the old logic, run:
```sql
UPDATE public.ranking_cycles 
SET status = 'closed' 
WHERE status IN ('submissions_closed', 'finished');
```

Then revert the code changes from the git repository.
