-- Migration: Auto-approve free tier users and add onboarding tracking
-- Date: 2025-11-08
-- Description:
--   1. Add onboarding_completed field to profiles
--   2. Auto-approve users who are not part of an organization (free tier)
--   3. Update existing free tier users to approved status

-- Add onboarding_completed column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add onboarding_data column to store user preferences from onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}'::jsonb;

-- Update the trigger function to auto-approve free tier users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  -- Free tier users (no organization) are auto-approved
  -- Organization users start as pending and require admin approval
  INSERT INTO public.profiles (id, email, full_name, approval_status, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'approved',  -- Default to approved (free tier)
    false        -- Onboarding not completed yet
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;

-- Create function to set user to pending when they join an organization
CREATE OR REPLACE FUNCTION public.set_pending_on_org_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user joins an organization, set them to pending approval
  -- unless they're already approved
  UPDATE public.profiles
  SET approval_status = 'pending'
  WHERE id = NEW.user_id
    AND approval_status = 'approved'
    AND organization_id IS NULL;  -- Only if they were free tier

  RETURN NEW;
END;
$$;

-- Create trigger for when user is added to an organization
DROP TRIGGER IF EXISTS on_org_join_set_pending ON public.profiles;
CREATE TRIGGER on_org_join_set_pending
  AFTER UPDATE OF organization_id ON public.profiles
  FOR EACH ROW
  WHEN (OLD.organization_id IS NULL AND NEW.organization_id IS NOT NULL)
  EXECUTE FUNCTION public.set_pending_on_org_join();

-- Update existing free tier users (no organization) to approved status
UPDATE public.profiles
SET approval_status = 'approved'
WHERE organization_id IS NULL
  AND approval_status = 'pending';

-- Add comment to explain the approval logic
COMMENT ON COLUMN public.profiles.approval_status IS
  'Approval status: approved for free tier users (no org), pending/approved/rejected for org users';

COMMENT ON COLUMN public.profiles.onboarding_completed IS
  'Tracks whether user has completed the onboarding wizard';

COMMENT ON COLUMN public.profiles.onboarding_data IS
  'Stores user preferences and choices from onboarding (selected features, branding, etc.)';
