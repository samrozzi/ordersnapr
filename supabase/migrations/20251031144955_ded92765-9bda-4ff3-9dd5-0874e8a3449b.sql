-- Phase 2.1a: Add org_admin enum value (must be separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org_admin';