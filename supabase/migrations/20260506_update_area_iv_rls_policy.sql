-- Update RLS policy for area_iv_student_evaluation_imports to allow authenticated users to insert/update
-- (Replaces the overly-restrictive default policy)

-- First, disable RLS temporarily to modify policies
ALTER TABLE public.area_iv_student_evaluation_imports DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.area_iv_student_evaluation_imports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated to insert" ON public.area_iv_student_evaluation_imports;
DROP POLICY IF EXISTS "Allow authenticated to select" ON public.area_iv_student_evaluation_imports;
DROP POLICY IF EXISTS "Allow authenticated to update" ON public.area_iv_student_evaluation_imports;
DROP POLICY IF EXISTS "Allow authenticated to delete" ON public.area_iv_student_evaluation_imports;

-- Create permissive policies for authenticated users (any authenticated user can perform CRUD)
CREATE POLICY "Allow authenticated to select"
  ON public.area_iv_student_evaluation_imports
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated to insert"
  ON public.area_iv_student_evaluation_imports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated to update"
  ON public.area_iv_student_evaluation_imports
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated to delete"
  ON public.area_iv_student_evaluation_imports
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
