-- Fix critical security issues

-- 1. Remove overly permissive profile access policy
-- This policy allows ANY authenticated user to see ALL profiles
DROP POLICY IF EXISTS "Require authentication for profile access" ON public.profiles;

-- 2. Secure the work-order-photos storage bucket
-- Make it private (update existing bucket)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'work-order-photos';

-- Drop existing storage policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view own work order photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own work order photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own work order photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all work order photos" ON storage.objects;

-- Create policy for users to view their own work order photos
CREATE POLICY "Users can view own work order photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for users to upload their own work order photos
CREATE POLICY "Users can upload own work order photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for users to delete their own work order photos
CREATE POLICY "Users can delete own work order photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for admins to view all work order photos
CREATE POLICY "Admins can view all work order photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);