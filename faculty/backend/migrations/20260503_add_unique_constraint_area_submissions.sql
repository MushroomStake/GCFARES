-- Migration: add unique constraint to prevent duplicate submissions per application+area+user
-- Run this carefully against your Postgres database. Test in staging first.

-- Optional: ensure there are no duplicates before adding constraint
-- SELECT application_id, area_id, user_id, COUNT(*) FROM public.area_submissions
-- GROUP BY application_id, area_id, user_id HAVING COUNT(*) > 1;

-- If duplicates exist, resolve them (either remove or consolidate) before adding the constraint.

ALTER TABLE public.area_submissions
ADD CONSTRAINT uq_area_submissions_app_area_user
UNIQUE (application_id, area_id, user_id);
