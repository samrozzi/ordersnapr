-- Fix critical security issue: Remove overly permissive profile access policy
-- This policy allows ANY authenticated user to see ALL profiles
DROP POLICY IF EXISTS "Require authentication for profile access" ON public.profiles;

-- Update the work-order-photos bucket to be private (if it's currently public)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'work-order-photos' AND public = true;