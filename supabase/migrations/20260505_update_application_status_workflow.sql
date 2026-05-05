-- Simplified applications table schema for ranking cycle workflow
-- Removes: vpaa_score, hr_comment, hr_reviewed_by, vpaa_reviewed_by, submitted_at, published_at
-- Keeps: hr_reviewed_at (renamed to hr_completed_at), vpaa_reviewed_at (renamed to vpaa_completed_at)
-- Updates status constraint to: Draft, Pending, HR_Completed, VPAA_Completed

-- Step 1: Drop the old constraint
ALTER TABLE public.applications
DROP CONSTRAINT applications_status_check;

-- Step 2: Update existing rows with invalid statuses to valid ones
-- Map old statuses to new workflow:
-- - 'Submitted' -> 'Pending'
-- - 'Under_HR_Review' -> 'Pending'
-- - 'Under_VPAA_Review' -> 'HR_Completed'
-- - 'For_Publishing' -> 'VPAA_Completed'
-- - 'Published' -> 'VPAA_Completed'
-- - 'Draft' -> 'Draft' (no change)
UPDATE public.applications SET status = 'Pending' WHERE status IN ('Submitted', 'Under_HR_Review');
UPDATE public.applications SET status = 'HR_Completed' WHERE status = 'Under_VPAA_Review';
UPDATE public.applications SET status = 'VPAA_Completed' WHERE status IN ('For_Publishing', 'Published');

-- Step 3: Drop unnecessary columns
ALTER TABLE public.applications
DROP COLUMN IF EXISTS vpaa_score,
DROP COLUMN IF EXISTS hr_comment,
DROP COLUMN IF EXISTS hr_reviewed_by,
DROP COLUMN IF EXISTS vpaa_reviewed_by,
DROP COLUMN IF EXISTS submitted_at,
DROP COLUMN IF EXISTS published_at;

-- Step 4: Rename timestamp columns for clarity
ALTER TABLE public.applications
RENAME COLUMN hr_reviewed_at TO hr_completed_at;

ALTER TABLE public.applications
RENAME COLUMN vpaa_reviewed_at TO vpaa_completed_at;

-- Step 5: Add the new simplified constraint
ALTER TABLE public.applications
ADD CONSTRAINT applications_status_check CHECK (
  status = ANY(ARRAY[
    'Draft'::text,
    'Pending'::text,
    'HR_Completed'::text,
    'VPAA_Completed'::text
  ])
);
