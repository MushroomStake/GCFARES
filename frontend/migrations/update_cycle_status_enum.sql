-- Migration: Update ranking_cycles status enum to support distinct lifecycle states
-- Purpose: Distinguish between "submissions closed" and "evaluation finished"
-- Date: 2026-05-02

-- Add new status constraint that allows: open, submissions_closed, finished
-- This allows admin to close submissions while evaluation continues,
-- then separately finish the evaluation to mark it truly complete

ALTER TABLE public.ranking_cycles
DROP CONSTRAINT IF EXISTS ranking_cycles_status_check;

ALTER TABLE public.ranking_cycles
ADD CONSTRAINT ranking_cycles_status_check 
CHECK (status IN ('open', 'submissions_closed', 'finished', 'closed'));

-- Note: 'closed' is kept for backward compatibility with existing cycles
-- New cycles should use 'submissions_closed' or 'finished'
