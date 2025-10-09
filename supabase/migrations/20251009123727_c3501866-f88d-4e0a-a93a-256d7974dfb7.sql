-- Add explicit restrictive policy to block all anonymous access to profiles table
-- This ensures that even if other policies are added in the future, 
-- anonymous users will never be able to access profile data containing emails and names
CREATE POLICY "Require authentication for profile access" 
ON public.profiles 
AS RESTRICTIVE 
FOR SELECT 
USING (auth.uid() IS NOT NULL);