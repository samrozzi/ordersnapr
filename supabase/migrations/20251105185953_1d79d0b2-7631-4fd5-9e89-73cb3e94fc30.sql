-- Allow users to mark their own submitted forms as logged
CREATE POLICY "Users can mark own submissions as logged"
ON public.form_submissions
FOR UPDATE
USING (
  auth.uid() = created_by 
  AND status = 'submitted'
  AND is_user_approved(auth.uid())
)
WITH CHECK (
  auth.uid() = created_by 
  AND status = 'logged'
  AND is_user_approved(auth.uid())
);