-- Drop the old status check constraint
ALTER TABLE public.form_submissions 
DROP CONSTRAINT IF EXISTS form_submissions_status_check;

-- Add new constraint that includes 'logged' status
ALTER TABLE public.form_submissions
ADD CONSTRAINT form_submissions_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'logged'));