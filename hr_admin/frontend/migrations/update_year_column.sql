-- Migration: Update ranking_cycles year column to store full academic year range
-- Changes year from INTEGER to VARCHAR to store format like "2026-2027"

-- Step 1: Add new temporary column
ALTER TABLE public.ranking_cycles
ADD COLUMN year_new character varying(20) NULL;

-- Step 2: Migrate existing data - convert year to academic year range format
UPDATE public.ranking_cycles
SET year_new = CONCAT(year::text, '-', (year + 1)::text)
WHERE year IS NOT NULL;

-- Step 3: Drop the old column
ALTER TABLE public.ranking_cycles
DROP COLUMN year;

-- Step 4: Rename new column to year
ALTER TABLE public.ranking_cycles
RENAME COLUMN year_new TO year;

-- Step 5: Update column constraint (optional but recommended)
ALTER TABLE public.ranking_cycles
ALTER COLUMN year TYPE character varying(20);

-- Verify the changes
-- SELECT cycle_id, title, year FROM public.ranking_cycles LIMIT 5;
