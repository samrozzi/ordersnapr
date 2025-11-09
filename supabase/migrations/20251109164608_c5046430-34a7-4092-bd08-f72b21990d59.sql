-- Fix onboarding_completed for existing approved users
-- This migration ensures all users who were approved before the onboarding system
-- was implemented are marked as having completed onboarding

UPDATE profiles
SET onboarding_completed = true
WHERE approval_status = 'approved'
  AND (onboarding_completed = false OR onboarding_completed IS NULL);