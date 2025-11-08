-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'error'

  -- Link to related entities
  entity_type TEXT, -- 'work_order', 'invoice', 'form_submission', 'calendar_event', etc.
  entity_id UUID,

  -- Notification metadata
  action_url TEXT, -- Where to navigate when clicked
  icon TEXT, -- Icon name from lucide-react

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Indexes for performance
  CONSTRAINT notifications_type_check CHECK (type IN ('info', 'success', 'warning', 'error'))
);

-- Create indexes
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_org ON notifications(org_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-delete old read notifications (keep for 30 days)
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE notifications IS 'In-app notifications for users';
-- Create user_preferences table for storing Quick Add customization and other user settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quick_add_enabled BOOLEAN DEFAULT true,
  quick_add_items JSONB DEFAULT '[]'::jsonb, -- Array of enabled feature modules
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores per-user preferences like Quick Add customization';
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create work orders table
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bpc TEXT,
  ban TEXT,
  package TEXT,
  job_id TEXT,
  customer_name TEXT NOT NULL,
  contact_info TEXT,
  address TEXT,
  notes TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
  completion_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_orders
CREATE POLICY "Users can view own work orders"
  ON public.work_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own work orders"
  ON public.work_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work orders"
  ON public.work_orders
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own work orders"
  ON public.work_orders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at on work_orders
CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();-- Fix security issue: Set search_path for update_updated_at function
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();-- Create enum for user roles if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for approval status if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add approval_status column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'approval_status') THEN
    ALTER TABLE public.profiles ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND approval_status = 'approved'
  )
$$;

-- Drop and recreate RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  approval_status = (SELECT approval_status FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate RLS policies for user_roles table
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update work_orders RLS policies to require approval
DROP POLICY IF EXISTS "Users can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can view own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can create own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can update own work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can delete own work orders" ON public.work_orders;

CREATE POLICY "Approved users can view own work orders"
ON public.work_orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id AND 
  public.is_user_approved(auth.uid())
);

CREATE POLICY "Approved users can create own work orders"
ON public.work_orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND 
  public.is_user_approved(auth.uid())
);

CREATE POLICY "Approved users can update own work orders"
ON public.work_orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id AND 
  public.is_user_approved(auth.uid())
);

CREATE POLICY "Approved users can delete own work orders"
ON public.work_orders
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id AND 
  public.is_user_approved(auth.uid())
);

-- Update the trigger function for new users to set pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updating updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER update_profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();-- Fix the search_path for update_profiles_updated_at function
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;-- Add updated_at column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Approve samrozzi@gmail.com account
UPDATE profiles 
SET approval_status = 'approved' 
WHERE id = 'bd3a5b81-f3c3-4dee-b334-18130dcebe73';

-- Make samrozzi@gmail.com an admin
INSERT INTO user_roles (user_id, role)
VALUES ('bd3a5b81-f3c3-4dee-b334-18130dcebe73', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;-- Add updated_at column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Approve samrozzi@gmail.com account
UPDATE profiles 
SET approval_status = 'approved' 
WHERE id = 'bd3a5b81-f3c3-4dee-b334-18130dcebe73';

-- Make samrozzi@gmail.com an admin
INSERT INTO user_roles (user_id, role)
VALUES ('bd3a5b81-f3c3-4dee-b334-18130dcebe73', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;-- Create storage bucket for work order photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-photos', 'work-order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Add photos column to work_orders table to store array of photo URLs
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Storage policies for work order photos
CREATE POLICY "Users can view own work order photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own work order photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-order-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own work order photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);-- Add explicit restrictive policy to block all anonymous access to profiles table
-- This ensures that even if other policies are added in the future, 
-- anonymous users will never be able to access profile data containing emails and names
CREATE POLICY "Require authentication for profile access" 
ON public.profiles 
AS RESTRICTIVE 
FOR SELECT 
USING (auth.uid() IS NOT NULL);-- Security Enhancement: Add restrictive policies to prevent unauthorized data access

-- 1. Add RESTRICTIVE policy to work_orders to ensure users can ONLY access their own work orders
-- This prevents any potential bypass of the user_id check and ensures data isolation
CREATE POLICY "Restrict work orders to own records only" 
ON public.work_orders 
AS RESTRICTIVE 
FOR ALL
USING (auth.uid() = user_id);

-- 2. Allow users to view their own role assignments for transparency
-- This helps users understand their permissions and reduces support burden
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);-- Fix storage access: Allow public viewing of work order photos
-- Since the bucket is public, photos should be viewable by anyone with the URL

-- Drop the restrictive policy that only allows users to view their own photos
DROP POLICY IF EXISTS "Users can view own work order photos" ON storage.objects;

-- Add a public SELECT policy for the work-order-photos bucket
CREATE POLICY "Public can view work order photos" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'work-order-photos');

-- Keep the restrictive policies for INSERT and DELETE (users can only manage their own photos)
-- These already exist and are working correctly-- Add scheduled_time column to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN scheduled_time time;-- Add access requirements fields to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN access_required boolean NOT NULL DEFAULT false,
ADD COLUMN access_notes text;-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_name TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  access_information TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create policies for property access
CREATE POLICY "Approved users can view own properties" 
ON public.properties 
FOR SELECT 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can create own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can update own properties" 
ON public.properties 
FOR UPDATE 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

CREATE POLICY "Approved users can delete own properties" 
ON public.properties 
FOR DELETE 
USING ((auth.uid() = user_id) AND is_user_approved(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();-- Fix critical security issue: Remove overly permissive profile access policy
-- This policy allows ANY authenticated user to see ALL profiles
DROP POLICY IF EXISTS "Require authentication for profile access" ON public.profiles;

-- Update the work-order-photos bucket to be private (if it's currently public)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'work-order-photos' AND public = true;-- Fix critical security issues

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
);-- Create form_drafts table for saving partial form data
CREATE TABLE IF NOT EXISTS public.form_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_type text NOT NULL,
  draft_name text,
  form_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.form_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create own drafts"
  ON public.form_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
  ON public.form_drafts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON public.form_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_form_drafts_user_id ON public.form_drafts(user_id);
CREATE INDEX idx_form_drafts_form_type ON public.form_drafts(form_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add organization_id to profiles table
ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.organization_id = organizations.id
    )
  );

-- Add trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update properties RLS policies for organization sharing
DROP POLICY IF EXISTS "Approved users can view own properties" ON public.properties;
CREATE POLICY "Approved users can view organization properties"
  ON public.properties FOR SELECT
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can create own properties" ON public.properties;
CREATE POLICY "Approved users can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Approved users can update own properties" ON public.properties;
CREATE POLICY "Approved users can update organization properties"
  ON public.properties FOR UPDATE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can delete own properties" ON public.properties;
CREATE POLICY "Approved users can delete organization properties"
  ON public.properties FOR DELETE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = properties.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

-- Update work_orders RLS policies for organization sharing
DROP POLICY IF EXISTS "Approved users can view own work orders" ON public.work_orders;
CREATE POLICY "Approved users can view organization work orders"
  ON public.work_orders FOR SELECT
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can create own work orders" ON public.work_orders;
CREATE POLICY "Approved users can create work orders"
  ON public.work_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Approved users can update own work orders" ON public.work_orders;
CREATE POLICY "Approved users can update organization work orders"
  ON public.work_orders FOR UPDATE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "Approved users can delete own work orders" ON public.work_orders;
CREATE POLICY "Approved users can delete organization work orders"
  ON public.work_orders FOR DELETE
  USING (
    is_user_approved(auth.uid()) AND (
      auth.uid() = user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles p1
        JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
        WHERE p1.id = auth.uid() 
          AND p2.id = work_orders.user_id 
          AND p1.organization_id IS NOT NULL
      )
    )
  );

-- Update form_drafts RLS policies for organization sharing
DROP POLICY IF EXISTS "Users can view own drafts" ON public.form_drafts;
CREATE POLICY "Users can view organization drafts"
  ON public.form_drafts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_drafts;
CREATE POLICY "Users can update organization drafts"
  ON public.form_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_drafts;
CREATE POLICY "Users can delete organization drafts"
  ON public.form_drafts FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid() 
        AND p2.id = form_drafts.user_id 
        AND p1.organization_id IS NOT NULL
    )
  );-- Create RLS policies for work-order-photos storage bucket

-- Users can upload photos to their own folder
CREATE POLICY "Users can upload own photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'work-order-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view own photos and organization photos
CREATE POLICY "Users can view organization photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
      AND p2.id::text = (storage.foldername(name))[1]
      AND p1.organization_id IS NOT NULL
    )
  )
);

-- Users can delete own photos
CREATE POLICY "Users can delete own photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'work-order-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);-- Drop the restrictive policy that blocks organization sharing on work_orders
-- This policy requires auth.uid() = user_id for ALL operations, which prevents
-- users from seeing records created by other users in their organization
DROP POLICY IF EXISTS "Restrict work orders to own records only" ON work_orders;

-- The remaining PERMISSIVE policies will now work correctly to allow:
-- 1. Users to see their own records
-- 2. Users to see records from other users in the same organization-- Create a security definer function to check if two users are in the same organization
CREATE OR REPLACE FUNCTION public.in_same_org(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _u1
      AND p2.id = _u2
      AND p1.organization_id IS NOT NULL
  )
$$;

-- Update work_orders policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON work_orders;
CREATE POLICY "Approved users can view organization work orders"
ON work_orders
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization work orders" ON work_orders;
CREATE POLICY "Approved users can update organization work orders"
ON work_orders
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON work_orders;
CREATE POLICY "Approved users can delete organization work orders"
ON work_orders
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update properties policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization properties" ON properties;
CREATE POLICY "Approved users can view organization properties"
ON properties
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization properties" ON properties;
CREATE POLICY "Approved users can update organization properties"
ON properties
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization properties" ON properties;
CREATE POLICY "Approved users can delete organization properties"
ON properties
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update form_drafts policies to use the new function
DROP POLICY IF EXISTS "Users can view organization drafts" ON form_drafts;
CREATE POLICY "Users can view organization drafts"
ON form_drafts
FOR SELECT
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can update organization drafts" ON form_drafts;
CREATE POLICY "Users can update organization drafts"
ON form_drafts
FOR UPDATE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can delete organization drafts" ON form_drafts;
CREATE POLICY "Users can delete organization drafts"
ON form_drafts
FOR DELETE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);-- Create a security definer function to check if two users are in the same organization
CREATE OR REPLACE FUNCTION public.in_same_org(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _u1
      AND p2.id = _u2
      AND p1.organization_id IS NOT NULL
  )
$$;

-- Update work_orders policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON work_orders;
CREATE POLICY "Approved users can view organization work orders"
ON work_orders
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization work orders" ON work_orders;
CREATE POLICY "Approved users can update organization work orders"
ON work_orders
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON work_orders;
CREATE POLICY "Approved users can delete organization work orders"
ON work_orders
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update properties policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization properties" ON properties;
CREATE POLICY "Approved users can view organization properties"
ON properties
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization properties" ON properties;
CREATE POLICY "Approved users can update organization properties"
ON properties
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization properties" ON properties;
CREATE POLICY "Approved users can delete organization properties"
ON properties
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update form_drafts policies to use the new function
DROP POLICY IF EXISTS "Users can view organization drafts" ON form_drafts;
CREATE POLICY "Users can view organization drafts"
ON form_drafts
FOR SELECT
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can update organization drafts" ON form_drafts;
CREATE POLICY "Users can update organization drafts"
ON form_drafts
FOR UPDATE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can delete organization drafts" ON form_drafts;
CREATE POLICY "Users can delete organization drafts"
ON form_drafts
FOR DELETE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);-- Create a security definer function to check if two users are in the same organization
CREATE OR REPLACE FUNCTION public.in_same_org(_u1 uuid, _u2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p1
    JOIN profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _u1
      AND p2.id = _u2
      AND p1.organization_id IS NOT NULL
  )
$$;

-- Update work_orders policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON work_orders;
CREATE POLICY "Approved users can view organization work orders"
ON work_orders
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization work orders" ON work_orders;
CREATE POLICY "Approved users can update organization work orders"
ON work_orders
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON work_orders;
CREATE POLICY "Approved users can delete organization work orders"
ON work_orders
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update properties policies to use the new function
DROP POLICY IF EXISTS "Approved users can view organization properties" ON properties;
CREATE POLICY "Approved users can view organization properties"
ON properties
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can update organization properties" ON properties;
CREATE POLICY "Approved users can update organization properties"
ON properties
FOR UPDATE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

DROP POLICY IF EXISTS "Approved users can delete organization properties" ON properties;
CREATE POLICY "Approved users can delete organization properties"
ON properties
FOR DELETE
USING (
  is_user_approved(auth.uid()) 
  AND (auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id))
);

-- Update form_drafts policies to use the new function
DROP POLICY IF EXISTS "Users can view organization drafts" ON form_drafts;
CREATE POLICY "Users can view organization drafts"
ON form_drafts
FOR SELECT
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can update organization drafts" ON form_drafts;
CREATE POLICY "Users can update organization drafts"
ON form_drafts
FOR UPDATE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);

DROP POLICY IF EXISTS "Users can delete organization drafts" ON form_drafts;
CREATE POLICY "Users can delete organization drafts"
ON form_drafts
FOR DELETE
USING (
  auth.uid() = user_id OR public.in_same_org(auth.uid(), user_id)
);-- Phase 2.1a: Add org_admin enum value (must be separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'org_admin';-- Phase 1: Enhanced Audit Logging
-- Add completed_by field to work_orders to track who completed it
ALTER TABLE public.work_orders
ADD COLUMN IF NOT EXISTS completed_by uuid REFERENCES auth.users(id);

-- Update the audit log trigger to track properties and form_drafts changes
DROP TRIGGER IF EXISTS audit_properties_trigger ON public.properties;
CREATE TRIGGER audit_properties_trigger
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

DROP TRIGGER IF EXISTS audit_form_drafts_trigger ON public.form_drafts;
CREATE TRIGGER audit_form_drafts_trigger
  AFTER INSERT OR UPDATE ON public.form_drafts
  FOR EACH ROW EXECUTE FUNCTION public.create_audit_log();

-- Phase 2.1b: Organization Admin Infrastructure (enum already added in previous migration)
-- Create organization_settings table for custom themes
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  custom_theme_color text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on organization_settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Create is_org_admin security definer function
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'org_admin'
      AND p.organization_id = _org_id
  )
$$;

-- Create can_manage_org_member security definer function
CREATE OR REPLACE FUNCTION public.can_manage_org_member(_acting_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p1
    JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
    WHERE p1.id = _acting_user_id
      AND p2.id = _target_user_id
      AND p1.organization_id IS NOT NULL
      AND (
        public.has_role(_acting_user_id, 'admin') 
        OR public.is_org_admin(_acting_user_id, p1.organization_id)
      )
  )
$$;

-- RLS Policies for organization_settings
CREATE POLICY "Admins can view all organization settings"
  ON public.organization_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can view own organization settings"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

CREATE POLICY "Users can view own organization settings"
  ON public.organization_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
    )
  );

CREATE POLICY "Admins can insert organization settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can insert own organization settings"
  ON public.organization_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

CREATE POLICY "Admins can update organization settings"
  ON public.organization_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can update own organization settings"
  ON public.organization_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = organization_settings.organization_id
        AND public.is_org_admin(auth.uid(), organization_id)
    )
  );

-- Update profiles RLS policies to allow org admins to manage their org members
CREATE POLICY "Org admins can view members in their organization"
  ON public.profiles FOR SELECT
  USING (
    public.can_manage_org_member(auth.uid(), id)
  );

CREATE POLICY "Org admins can update members in their organization"
  ON public.profiles FOR UPDATE
  USING (
    public.can_manage_org_member(auth.uid(), id)
    AND id != auth.uid()
  )
  WITH CHECK (
    public.can_manage_org_member(auth.uid(), id)
    AND approval_status IN ('approved', 'rejected', 'pending')
  );

-- Add trigger for organization_settings updated_at
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Phase 3: Email Change Requests
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_email text NOT NULL,
  requested_email text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on email_change_requests
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_change_requests
CREATE POLICY "Users can create own email change requests"
  ON public.email_change_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own email change requests"
  ON public.email_change_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email change requests"
  ON public.email_change_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can view email change requests in their org"
  ON public.email_change_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
        AND p2.id = email_change_requests.user_id
        AND public.is_org_admin(auth.uid(), p1.organization_id)
    )
  );

CREATE POLICY "Admins can update email change requests"
  ON public.email_change_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can update email change requests in their org"
  ON public.email_change_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p1
      JOIN public.profiles p2 ON p1.organization_id = p2.organization_id
      WHERE p1.id = auth.uid()
        AND p2.id = email_change_requests.user_id
        AND public.is_org_admin(auth.uid(), p1.organization_id)
    )
  );-- Add logo_url column to organization_settings
ALTER TABLE public.organization_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for organization logos
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Org admins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

CREATE POLICY "Org admins can update their org logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

CREATE POLICY "Org admins can delete their org logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IN (
    SELECT ur.user_id 
    FROM user_roles ur 
    WHERE ur.role = 'org_admin'
  )
);

-- Enable realtime for organization_settings so theme changes propagate
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_settings;-- Create dashboard_widgets table for storing user widget configurations
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('calendar-small', 'calendar-medium', 'calendar-large', 'weather')),
  position INTEGER NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own widgets
CREATE POLICY "Users can view own widgets"
  ON public.dashboard_widgets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widgets"
  ON public.dashboard_widgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widgets"
  ON public.dashboard_widgets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widgets"
  ON public.dashboard_widgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();-- Create calendar_events table for organization-wide events
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view events in their organization
CREATE POLICY "Users can view org events"
  ON calendar_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND is_user_approved(auth.uid())
  );

-- Users can create events in their organization
CREATE POLICY "Users can create org events"
  ON calendar_events FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) AND created_by = auth.uid() AND is_user_approved(auth.uid())
  );

-- Users can update their own events
CREATE POLICY "Users can update own events"
  ON calendar_events FOR UPDATE
  USING (created_by = auth.uid() AND is_user_approved(auth.uid()));

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON calendar_events FOR DELETE
  USING (created_by = auth.uid() AND is_user_approved(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_calendar_events_org_date ON calendar_events(organization_id, event_date);
CREATE INDEX idx_calendar_events_creator ON calendar_events(created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();-- Phase 1: Add organization_id to work_orders and update RLS policies

-- Step 1: Add organization_id column to work_orders
ALTER TABLE public.work_orders 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Step 2: Backfill organization_id from user's profile
UPDATE public.work_orders wo
SET organization_id = p.organization_id
FROM public.profiles p
WHERE wo.user_id = p.id;

-- Step 3: Make it NOT NULL after backfill
ALTER TABLE public.work_orders 
ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add indexes for performance
CREATE INDEX idx_work_orders_org_id ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_org_scheduled ON public.work_orders(organization_id, scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Step 5: Drop old RLS policies
DROP POLICY IF EXISTS "Approved users can view organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can create work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can update organization work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Approved users can delete organization work orders" ON public.work_orders;

-- Step 6: Create new org-scoped RLS policies
CREATE POLICY "Users can view org work orders" ON public.work_orders
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can create org work orders" ON public.work_orders
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND user_id = auth.uid() AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can update org work orders" ON public.work_orders
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

CREATE POLICY "Users can delete org work orders" ON public.work_orders
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND is_user_approved(auth.uid())
);

-- Step 7: Enable real-time for work_orders and calendar_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorites" ON public.user_favorites
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites" ON public.user_favorites
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.user_favorites
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_user_favorites_user_entity ON public.user_favorites(user_id, entity_type);-- Drop the old check constraint
ALTER TABLE dashboard_widgets DROP CONSTRAINT IF EXISTS dashboard_widgets_widget_type_check;

-- Add new check constraint with all widget types
ALTER TABLE dashboard_widgets ADD CONSTRAINT dashboard_widgets_widget_type_check 
CHECK (widget_type IN ('calendar-small', 'calendar-medium', 'calendar-large', 'weather', 'favorites', 'upcoming-work-orders'));-- Add display_order column to user_favorites for reordering
ALTER TABLE user_favorites ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX idx_user_favorites_display_order ON user_favorites(user_id, display_order DESC);

-- Update existing records to have sequential display_order based on created_at
UPDATE user_favorites
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM user_favorites
) AS subquery
WHERE user_favorites.id = subquery.id;-- Add new columns for S/M/L preset system and layout coordinates
ALTER TABLE dashboard_widgets 
  ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'M' CHECK (size IN ('S', 'M', 'L')),
  ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{"x": 0, "y": 0}';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_position 
  ON dashboard_widgets(user_id, position);

-- Migrate existing widgets to use preset sizes
-- Map old arbitrary sizes to nearest S/M/L preset
UPDATE dashboard_widgets
SET 
  size = CASE 
    WHEN (settings->'layouts'->'lg'->0->>'w')::int <= 4 THEN 'S'
    WHEN (settings->'layouts'->'lg'->0->>'h')::int >= 3 THEN 'L'
    ELSE 'M'
  END,
  layout_data = jsonb_build_object(
    'x', COALESCE((settings->'layouts'->'lg'->0->>'x')::int, 0),
    'y', COALESCE((settings->'layouts'->'lg'->0->>'y')::int, 0)
  )
WHERE size IS NULL;-- Phase 1: Enhance existing tables
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS industry text;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

ALTER TABLE dashboard_widgets
  ADD COLUMN IF NOT EXISTS page_path text DEFAULT '/dashboard';

-- Phase 2: Create org_memberships table (explicit RBAC)
CREATE TABLE IF NOT EXISTS org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, org_id)
);

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- Phase 3: Create org_features table (module toggles)
CREATE TABLE IF NOT EXISTS org_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, module)
);

ALTER TABLE org_features ENABLE ROW LEVEL SECURITY;

-- Phase 4: Create org_pages table (dynamic page configuration)
CREATE TABLE IF NOT EXISTS org_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  path text NOT NULL,
  is_enabled boolean DEFAULT true,
  layout jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, path)
);

ALTER TABLE org_pages ENABLE ROW LEVEL SECURITY;

-- Phase 5: Create org_page_widgets table (org-level widget defaults)
CREATE TABLE IF NOT EXISTS org_page_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_page_id uuid NOT NULL REFERENCES org_pages(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  position jsonb NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE org_page_widgets ENABLE ROW LEVEL SECURITY;

-- Phase 6: Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address jsonb,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Phase 7: Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  start_at timestamptz,
  end_at timestamptz,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'scheduled',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Phase 8: Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  number text,
  total_cents int NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void', 'cancelled')),
  external_ref text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Phase 9: Create helper function to check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM profiles WHERE id = _user_id),
    false
  )
$$;

-- Phase 10: RLS Policies for org_memberships
CREATE POLICY "Users can view own memberships"
  ON org_memberships FOR SELECT
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all memberships"
  ON org_memberships FOR ALL
  USING (is_super_admin(auth.uid()));

-- Phase 11: RLS Policies for org_features
CREATE POLICY "Org members can view features"
  ON org_features FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = org_features.org_id
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage features"
  ON org_features FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Org admins can manage features"
  ON org_features FOR INSERT
  WITH CHECK (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org admins can update features"
  ON org_features FOR UPDATE
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- Phase 12: RLS Policies for org_pages
CREATE POLICY "Org members can view pages"
  ON org_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = org_pages.org_id
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins and org admins can manage pages"
  ON org_pages FOR ALL
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- Phase 13: RLS Policies for org_page_widgets
CREATE POLICY "Org members can view page widgets"
  ON org_page_widgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_pages 
      JOIN profiles ON profiles.organization_id = org_pages.org_id
      WHERE org_pages.id = org_page_widgets.org_page_id
      AND profiles.id = auth.uid()
    ) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins and org admins can manage widgets"
  ON org_page_widgets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_pages 
      WHERE org_pages.id = org_page_widgets.org_page_id
      AND (is_org_admin(auth.uid(), org_pages.org_id) OR is_super_admin(auth.uid()))
    )
  );

-- Phase 14: RLS Policies for customers
CREATE POLICY "Org members can view customers"
  ON customers FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid())) 
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create customers"
  ON customers FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update customers"
  ON customers FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete customers"
  ON customers FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = customers.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 15: RLS Policies for appointments
CREATE POLICY "Org members can view appointments"
  ON appointments FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update appointments"
  ON appointments FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete appointments"
  ON appointments FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = appointments.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 16: RLS Policies for invoices
CREATE POLICY "Org members can view invoices"
  ON invoices FOR SELECT
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can create invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can update invoices"
  ON invoices FOR UPDATE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Org members can delete invoices"
  ON invoices FOR DELETE
  USING (
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = invoices.org_id
    ) AND is_user_approved(auth.uid()))
    OR is_super_admin(auth.uid())
  );

-- Phase 17: Update triggers for updated_at
CREATE TRIGGER update_org_features_updated_at
  BEFORE UPDATE ON org_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_org_pages_updated_at
  BEFORE UPDATE ON org_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Phase 18: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_features_org_id ON org_features(org_id);
CREATE INDEX IF NOT EXISTS idx_org_features_module ON org_features(org_id, module);
CREATE INDEX IF NOT EXISTS idx_org_pages_org_id ON org_pages(org_id);
CREATE INDEX IF NOT EXISTS idx_org_pages_path ON org_pages(org_id, path);
CREATE INDEX IF NOT EXISTS idx_customers_org_id ON customers(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_work_order_id ON invoices(work_order_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Phase 19: Migrate existing data - create org_memberships from existing profiles
INSERT INTO org_memberships (user_id, org_id, role)
SELECT 
  p.id,
  p.organization_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id AND role = 'org_admin') THEN 'admin'
    ELSE 'staff'
  END
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Phase 20: Create default org_features for existing organizations (all enabled by default)
INSERT INTO org_features (org_id, module, enabled)
SELECT 
  o.id,
  module,
  true
FROM organizations o
CROSS JOIN (
  VALUES 
    ('work_orders'),
    ('calendar'),
    ('properties'),
    ('forms'),
    ('reports')
) AS modules(module)
ON CONFLICT (org_id, module) DO NOTHING;

-- Phase 21: Create default dashboard page for existing organizations
INSERT INTO org_pages (org_id, title, path, is_enabled)
SELECT 
  id,
  'Dashboard',
  '/dashboard',
  true
FROM organizations
ON CONFLICT (org_id, path) DO NOTHING;-- Add unique constraint and index to org_features for efficient upserts
ALTER TABLE public.org_features
  ADD CONSTRAINT org_features_org_module_key UNIQUE (org_id, module);

CREATE INDEX IF NOT EXISTS idx_org_features_org_module 
  ON public.org_features (org_id, module);-- Phase 1.2: Seed default features (all disabled) for existing orgs and new orgs

-- Insert missing features for existing orgs (all disabled by default)
INSERT INTO org_features (org_id, module, enabled, config)
SELECT o.id, m.module, false, '{}'::jsonb
FROM organizations o
CROSS JOIN (
  SELECT unnest(ARRAY[
    'work_orders', 'calendar', 'properties', 'forms', 'reports',
    'appointments', 'invoicing', 'inventory', 'customer_portal', 'pos', 'files'
  ]) AS module
) m
ON CONFLICT (org_id, module) DO NOTHING;

-- Function to auto-seed features when new org is created
CREATE OR REPLACE FUNCTION seed_org_features()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO org_features (org_id, module, enabled, config)
  VALUES
    (NEW.id, 'work_orders', false, '{}'::jsonb),
    (NEW.id, 'calendar', false, '{}'::jsonb),
    (NEW.id, 'properties', false, '{}'::jsonb),
    (NEW.id, 'forms', false, '{}'::jsonb),
    (NEW.id, 'reports', false, '{}'::jsonb),
    (NEW.id, 'appointments', false, '{}'::jsonb),
    (NEW.id, 'invoicing', false, '{}'::jsonb),
    (NEW.id, 'inventory', false, '{}'::jsonb),
    (NEW.id, 'customer_portal', false, '{}'::jsonb),
    (NEW.id, 'pos', false, '{}'::jsonb),
    (NEW.id, 'files', false, '{}'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to seed features on org creation
CREATE TRIGGER on_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION seed_org_features();

-- Utility function: check if user is member of org
CREATE OR REPLACE FUNCTION is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _user_id AND organization_id = _org_id
  )
$$;-- Add new columns to work_orders table for Jobs functionality
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES invoices(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_type ON work_orders(type);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);-- Create form_templates table
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  schema JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_templates_org ON form_templates(org_id);
CREATE INDEX idx_form_templates_slug ON form_templates(slug);
CREATE INDEX idx_form_templates_active ON form_templates(is_active);

-- Create form_submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL,
  job_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  signature JSONB,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_form_submissions_org ON form_submissions(org_id);
CREATE INDEX idx_form_submissions_template ON form_submissions(form_template_id);
CREATE INDEX idx_form_submissions_creator ON form_submissions(created_by);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_job ON form_submissions(job_id);

-- Enable RLS
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for form_templates
CREATE POLICY "Org members can view active templates"
  ON form_templates FOR SELECT
  USING (
    (is_global = true OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    AND is_active = true
  );

CREATE POLICY "Org admins can manage templates"
  ON form_templates FOR ALL
  USING (
    is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage all templates"
  ON form_templates FOR ALL
  USING (is_super_admin(auth.uid()));

-- RLS Policies for form_submissions
CREATE POLICY "Users can view org submissions"
  ON form_submissions FOR SELECT
  USING (
    org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can create submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can update own drafts"
  ON form_submissions FOR UPDATE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Org admins can update submissions"
  ON form_submissions FOR UPDATE
  USING (
    (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Users can delete own drafts"
  ON form_submissions FOR DELETE
  USING (
    auth.uid() = created_by 
    AND status = 'draft'
    AND is_user_approved(auth.uid())
  );

CREATE POLICY "Org admins can delete submissions"
  ON form_submissions FOR DELETE
  USING (
    (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
    AND is_user_approved(auth.uid())
  );

-- Add updated_at triggers
CREATE TRIGGER update_form_templates_updated_at
  BEFORE UPDATE ON form_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed AT&T Job Audit Template
INSERT INTO form_templates (org_id, name, slug, category, is_active, schema)
VALUES (
  'd7d395bf-651e-432a-8788-78d1fd90a258'::uuid,
  'Job Audit',
  'job-audit',
  'Quality Control',
  true,
  $TEMPLATE${
    "title": "Job Quality Inspection Report",
    "description": "Comprehensive technician quality audit at job site",
    "require_signature": true,
    "sections": [
      {
        "title": "Job Details",
        "fields": [
          {"key": "technician_name", "label": "Technician Name", "type": "text", "required": true},
          {"key": "ban", "label": "BAN", "type": "text", "required": true},
          {"key": "service_date", "label": "Service Date", "type": "date", "required": true},
          {"key": "address", "label": "Address", "type": "textarea", "required": true},
          {"key": "customer_name", "label": "Customer Name", "type": "text", "required": true},
          {"key": "can_be_reached", "label": "Can Be Reached", "type": "text", "placeholder": "Phone number"},
          {"key": "reported_by", "label": "Reported By", "type": "text"},
          {"key": "job_id", "label": "Related Job", "type": "job_lookup"}
        ]
      },
      {
        "title": "Observations",
        "fields": [
          {"key": "observations", "label": "General Observations", "type": "textarea", "maxLength": 2000}
        ]
      },
      {
        "title": "Administrative/Testing Checklist",
        "fields": [
          {
            "key": "admin_checklist",
            "label": "Administrative & Testing",
            "type": "checklist",
            "items": [
              "Conducted all proper required testing (Including Fiber / Copper TRUE Test)",
              "Detailed, accurate close out narrative provided, in addition to correct disposition / cause codes",
              "Bad Plant Condition (BPC) filled out properly and submitted",
              "Damage claim properly submitted (Non-Drop Related)",
              "Wi-Fi / Consultation",
              "Wi-Fi / Assessment for RG placement",
              "Wi-Fi / Assessment results and extender discussion",
              "Wi-Fi / SHM customer login and touchpoints (Do not handle customer device)",
              "Other"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Customer Experience Checklist",
        "fields": [
          {
            "key": "customer_checklist",
            "label": "Customer Experience",
            "type": "checklist",
            "items": [
              "Time Management",
              "No trouble after visit",
              "Tech visited prem first and closed job with customer",
              "Initiated proper customer contact (pre and post work); reviewed work request with customer; covered Service Promise with customer",
              "Introduced self; showed ATT ID; greeted customer by name",
              "Proper apparel and booties worn",
              "Confirmed all existing customer equipment working prior to job start",
              "Recommended additional products & services, as appropriate (you Refer)",
              "Verfied all services were working properly (upon job completion); provided customer education",
              "General housekeeping (inside & outside the home); respect the customer premises",
              "Other"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Drop Audit Checklist",
        "fields": [
          {
            "key": "drop_checklist",
            "label": "MAIN FOCUS/BSW AUDIT - Drop",
            "type": "checklist",
            "items": [
              "Buried drop properly placed in aerial plant",
              "BDR Submitted with Accurate Information",
              "BDR photos provided (Sidekick)",
              "Closure/Handhole/Terminal closed and secured",
              "Drop properly dug in at Closure/Handhole/Terminal",
              "Drop properly tagged at Terminal",
              "Copper drop bonded correctly",
              "Drop bonding meets specifications",
              "Fiber drop properly protected at building entrance",
              "Proper slack storage at premises"
            ],
            "options": ["OK", "DEV", "N/A"]
          }
        ]
      },
      {
        "title": "Photos",
        "fields": [
          {
            "key": "photos",
            "label": "Upload Photos",
            "type": "file",
            "accept": [".jpg", ".jpeg", ".png"],
            "maxFiles": 50,
            "allowCaptions": true
          }
        ]
      }
    ]
  }$TEMPLATE$::jsonb
);

-- Seed AT&T Ride-Along Template
INSERT INTO form_templates (org_id, name, slug, category, is_active, schema)
VALUES (
  'd7d395bf-651e-432a-8788-78d1fd90a258'::uuid,
  'Ride-Along',
  'ride-along',
  'Training & Observation',
  true,
  $TEMPLATE${
    "title": "Ride-Along Observation Form",
    "description": "Comprehensive fiber install ride-along evaluation",
    "require_signature": true,
    "sections": [
      {
        "title": "Form Details",
        "fields": [
          {"key": "account_number", "label": "Account Number", "type": "text", "required": true},
          {"key": "address", "label": "Address", "type": "textarea", "required": true},
          {"key": "customer_name", "label": "Customer Name", "type": "text", "required": true},
          {"key": "technician_name", "label": "Technician Name", "type": "text", "required": true},
          {"key": "observer_name", "label": "Observer Name", "type": "text", "required": true, "default": "Sam Rozzi"},
          {"key": "can_be_reached", "label": "Can Be Reached", "type": "text"},
          {"key": "date", "label": "Date", "type": "date", "required": true},
          {"key": "start_time", "label": "Start Time", "type": "time", "required": true},
          {"key": "end_time", "label": "End Time", "type": "time", "required": true}
        ]
      },
      {
        "title": "Section 1: Pre-Call",
        "fields": [
          {
            "key": "pre_call_checklist",
            "label": "Pre-Call",
            "type": "checklist",
            "items": [
              "Introduce yourself",
              "Verify appointment",
              "Verify service to be installed",
              "Share ETA"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 2: Drive To Prem",
        "fields": [
          {
            "key": "drive_checklist",
            "label": "Drive To Premises",
            "type": "checklist",
            "items": ["Did the technician drive directly to the premises?"],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 3: Meet and Greet",
        "fields": [
          {
            "key": "meet_greet_checklist",
            "label": "Meet and Greet",
            "type": "checklist",
            "items": [
              "Introduce yourself",
              "Show badge",
              "Verify customer name",
              "Offer booties",
              "Verify service to be installed",
              "Set expectations",
              "Discuss RG Placement"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 4: Site Survey",
        "fields": [
          {
            "key": "site_survey_checklist",
            "label": "Site Survey",
            "type": "checklist",
            "items": [
              "Walk property with customer",
              "Locate utilities",
              "Identify obstacles",
              "Determine entry point",
              "Discuss installation plan"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 5: Installation",
        "fields": [
          {
            "key": "installation_checklist",
            "label": "Installation Process",
            "type": "checklist",
            "items": [
              "Proper safety equipment used",
              "Work area protected",
              "Quality workmanship",
              "Proper cable management",
              "Testing performed"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 6: Customer Education",
        "fields": [
          {
            "key": "education_checklist",
            "label": "Customer Education",
            "type": "checklist",
            "items": [
              "Equipment demonstrated",
              "Features explained",
              "Questions answered",
              "Contact information provided"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 7: Cleanup",
        "fields": [
          {
            "key": "cleanup_checklist",
            "label": "Cleanup",
            "type": "checklist",
            "items": [
              "All debris removed",
              "Work area cleaned",
              "Equipment organized",
              "Customer satisfied"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 8: Paperwork",
        "fields": [
          {
            "key": "paperwork_checklist",
            "label": "Paperwork",
            "type": "checklist",
            "items": [
              "Work order completed accurately",
              "Customer signature obtained",
              "Photos uploaded",
              "Job closed properly"
            ],
            "options": ["Yes", "No", "N/A"]
          }
        ]
      },
      {
        "title": "Section 9: Overall Assessment",
        "fields": [
          {"key": "overall_score", "label": "Overall Score (1-10)", "type": "number", "min": 1, "max": 10, "required": true},
          {"key": "strengths", "label": "Strengths", "type": "textarea", "maxLength": 1000},
          {"key": "areas_for_improvement", "label": "Areas for Improvement", "type": "textarea", "maxLength": 1000}
        ]
      },
      {
        "title": "Overall Notes",
        "fields": [
          {"key": "overall_notes", "label": "Overall Notes", "type": "textarea", "maxLength": 2000}
        ]
      },
      {
        "title": "Photos",
        "fields": [
          {
            "key": "photos",
            "label": "Upload Photos",
            "type": "file",
            "accept": [".jpg", ".jpeg", ".png"],
            "maxFiles": 50,
            "allowCaptions": true
          }
        ]
      }
    ]
  }$TEMPLATE$::jsonb
);-- Create storage bucket for form attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'form-attachments',
  'form-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'video/mp4', 'video/quicktime']
);

-- Storage policies for form attachments
CREATE POLICY "Users can upload form attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can view org form attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can delete own form attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);

CREATE POLICY "Users can update own form attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  is_user_approved(auth.uid())
);-- Add created_by tracking to form_templates
ALTER TABLE form_templates 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Backfill existing templates with first user from org
UPDATE form_templates 
SET created_by = (
  SELECT id FROM profiles 
  WHERE organization_id = form_templates.org_id 
  LIMIT 1
) 
WHERE created_by IS NULL;

-- Add org admin flag to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_org_admin boolean DEFAULT false;

-- Update RLS policy for template deletion
DROP POLICY IF EXISTS "Org admins can manage templates" ON form_templates;

CREATE POLICY "Org admins can manage templates"
ON form_templates
FOR ALL
TO authenticated
USING (
  is_org_admin(auth.uid(), org_id) 
  OR is_super_admin(auth.uid())
  OR created_by = auth.uid()
);

-- Add comment for documentation
COMMENT ON COLUMN form_templates.created_by IS 'User who created this template';
COMMENT ON COLUMN profiles.is_org_admin IS 'Whether user is an admin for their organization';-- Fix storage policies for form-attachments to work with org-based folder structure
-- Drop old policies
DROP POLICY IF EXISTS "Users can upload form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own form attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own form attachments" ON storage.objects;

-- Create new policies that work with orgs/{orgId}/forms/{submissionId} structure
CREATE POLICY "Approved users can upload to their org form attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can view their org form attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can delete their org form attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Approved users can update their org form attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'form-attachments' AND
  is_user_approved(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND organization_id::text = (storage.foldername(name))[2]
  )
);-- Add scope column to form_templates
ALTER TABLE form_templates 
ADD COLUMN scope text DEFAULT 'user' CHECK (scope IN ('global', 'organization', 'user'));

-- Update existing records: global templates stay global, others become organization-scoped
UPDATE form_templates 
SET scope = CASE 
  WHEN is_global = true THEN 'global'
  ELSE 'organization'
END;

-- Create index for better query performance
CREATE INDEX idx_form_templates_scope ON form_templates(scope);
CREATE INDEX idx_form_templates_org_scope ON form_templates(org_id, scope);

-- Update RLS policies to enforce scope-based access
DROP POLICY IF EXISTS "Org admins can manage templates" ON form_templates;
DROP POLICY IF EXISTS "Super admins can manage all templates" ON form_templates;
DROP POLICY IF EXISTS "Org members can view active templates" ON form_templates;

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage all templates"
ON form_templates
FOR ALL
USING (is_super_admin(auth.uid()));

-- Org admins can create organization-scoped templates
CREATE POLICY "Org admins can create org templates"
ON form_templates
FOR INSERT
WITH CHECK (
  scope = 'organization' 
  AND is_org_admin(auth.uid(), org_id)
);

-- Org admins can update/delete organization-scoped templates in their org
CREATE POLICY "Org admins can manage org templates"
ON form_templates
FOR ALL
USING (
  scope = 'organization' 
  AND is_org_admin(auth.uid(), org_id)
);

-- Users can create user-scoped templates
CREATE POLICY "Users can create personal templates"
ON form_templates
FOR INSERT
WITH CHECK (
  scope = 'user' 
  AND created_by = auth.uid()
  AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
);

-- Users can manage their own user-scoped templates
CREATE POLICY "Users can manage own templates"
ON form_templates
FOR ALL
USING (
  scope = 'user' 
  AND created_by = auth.uid()
);

-- View access: users can see global, org, and their own templates
CREATE POLICY "Users can view applicable templates"
ON form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    scope = 'global'
    OR (scope = 'organization' AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    OR (scope = 'user' AND created_by = auth.uid())
  )
);-- Make form-attachments bucket public so images load properly
UPDATE storage.buckets 
SET public = true 
WHERE name = 'form-attachments';

-- Update all existing form templates to use maxFiles: 10 for file fields
UPDATE form_templates
SET schema = jsonb_set(
  schema,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN section ? 'fields' THEN
          jsonb_set(
            section,
            '{fields}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN field->>'type' = 'file' AND (field->>'maxFiles')::int > 10 THEN
                    jsonb_set(field, '{maxFiles}', '10'::jsonb)
                  ELSE field
                END
              )
              FROM jsonb_array_elements(section->'fields') AS field
            )
          )
        ELSE section
      END
    )
    FROM jsonb_array_elements(schema->'sections') AS section
  )
)
WHERE schema IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(schema->'sections') AS section,
       jsonb_array_elements(section->'fields') AS field
  WHERE field->>'type' = 'file' 
  AND (field->>'maxFiles')::int > 10
);-- Remove default values from all fields in existing form templates
UPDATE form_templates
SET schema = jsonb_set(
  schema,
  '{sections}',
  (
    SELECT jsonb_agg(
      jsonb_set(
        section,
        '{fields}',
        (
          SELECT jsonb_agg(field - 'default')
          FROM jsonb_array_elements(section->'fields') AS field
        )
      )
    )
    FROM jsonb_array_elements(schema->'sections') AS section
  )
)
WHERE schema IS NOT NULL
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(schema->'sections') AS section,
       jsonb_array_elements(section->'fields') AS field
  WHERE field ? 'default'
);-- Update Overrun Report template to use repeating groups
UPDATE form_templates
SET schema = jsonb_set(
  jsonb_set(
    schema,
    '{sections,0,fields}',
    jsonb_build_array(
      jsonb_build_object(
        'type', 'date',
        'key', 'date',
        'label', 'Date',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'time',
        'key', 'time',
        'label', 'Time',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'repeating_group',
        'key', 'overrun_entries',
        'label', 'Overrun Entry',
        'required', false,
        'minInstances', 1,
        'maxInstances', 50,
        'fields', (
          SELECT jsonb_build_array(
            jsonb_build_object(
              'type', 'select',
              'key', 'technician',
              'label', 'Technician',
              'options', COALESCE(
                (
                  SELECT field->'options'
                  FROM jsonb_array_elements(schema->'sections'->0->'fields') AS field
                  WHERE field->>'key' = 'technician'
                  LIMIT 1
                ),
                '["ma306g", "cr5822", "oa1451", "tg6503"]'::jsonb
              ),
              'required', false,
              'hideLabel', false
            ),
            jsonb_build_object(
              'type', 'textarea',
              'key', 'description',
              'label', 'Description',
              'placeholder', 'Enter overrun details...',
              'required', false,
              'hideLabel', false
            )
          )
        )
      )
    )
  ),
  '{sections,0,hideTitle}',
  'true'::jsonb
)
WHERE name = 'Overrun Report'
  AND org_id IS NULL;-- Update the organization-specific Overrun Report to use repeating groups
UPDATE form_templates
SET schema = jsonb_set(
  jsonb_set(
    schema,
    '{sections,0,fields}',
    jsonb_build_array(
      jsonb_build_object(
        'type', 'date',
        'key', 'date',
        'label', 'Date',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'time',
        'key', 'time',
        'label', 'Time',
        'required', false,
        'hideLabel', false
      ),
      jsonb_build_object(
        'type', 'repeating_group',
        'key', 'overrun_entries',
        'label', 'Overrun Entry',
        'required', false,
        'minInstances', 1,
        'maxInstances', 50,
        'fields', jsonb_build_array(
          jsonb_build_object(
            'type', 'select',
            'key', 'technician',
            'label', 'Technician',
            'options', jsonb_build_array(
              'Mustafa Abdul-Khaliq - ma306g',
              'Micah Armstrong - ma091b',
              'Christian Romero - cr5822',
              'Rodrigo Mendez Linares - rx400k',
              'Olu Amusan - oa1451',
              'Gustavo Benitez - gb616h',
              'Joe Derusha - jd7292',
              'Christopher Macfarlane - cm044c',
              'Dewaine Williams - dw6876',
              'James Busto - jb477g',
              'Nayarit Chapman - nc6141',
              'Sheldon Abrams - sa821y',
              'Vincent Wilkes - vw6510',
              'Brian Tyson - bt0573'
            ),
            'required', false,
            'hideLabel', false
          ),
          jsonb_build_object(
            'type', 'textarea',
            'key', 'description',
            'label', 'Description',
            'placeholder', 'Enter overrun details...',
            'required', false,
            'hideLabel', false
          )
        )
      )
    )
  ),
  '{sections,0,hideTitle}',
  'true'::jsonb
)
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26';-- Add metadata column to form_submissions table to store entry label preferences
ALTER TABLE form_submissions 
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN form_submissions.metadata IS 'Stores additional metadata like entryLabelPreferences';-- Fix audit log function to handle tables without status column
CREATE OR REPLACE FUNCTION public.create_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  action_type text;
  has_status boolean;
BEGIN
  -- Check if the table has a status column
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = TG_TABLE_NAME 
      AND column_name = 'status'
  ) INTO has_status;

  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (NEW.user_id, TG_TABLE_NAME, NEW.id, action_type, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'updated';
    
    -- Only check status if the table has a status column
    IF has_status THEN
      IF (to_jsonb(NEW)->>'status') = 'completed' AND (to_jsonb(OLD)->>'status') != 'completed' THEN
        action_type := 'completed';
      END IF;
    END IF;
    
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (NEW.user_id, TG_TABLE_NAME, NEW.id, action_type, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  END IF;
  
  RETURN NEW;
END;
$function$;-- Update storage bucket to support large Apple Health files (up to 250MB)
-- and add support for ZIP and XML MIME types

UPDATE storage.buckets
SET
  file_size_limit = 262144000, -- 250MB in bytes
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
    'video/mp4',
    'video/quicktime',
    'application/zip',
    'application/x-zip-compressed',
    'application/xml',
    'text/xml'
  ]
WHERE id = 'form-attachments';
-- Create tables for Apple Health data storage

-- Health imports tracking table
CREATE TABLE IF NOT EXISTS public.health_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2) NOT NULL,
  record_count INTEGER NOT NULL,
  filter_date TIMESTAMPTZ,
  import_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health records table (stores individual health data points)
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.health_imports(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL,
  value TEXT,
  unit TEXT,
  record_date TIMESTAMPTZ NOT NULL,
  source_name TEXT,
  device TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_imports_org_id ON public.health_imports(org_id);
CREATE INDEX IF NOT EXISTS idx_health_imports_user_id ON public.health_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_health_imports_import_date ON public.health_imports(import_date);

CREATE INDEX IF NOT EXISTS idx_health_records_import_id ON public.health_records(import_id);
CREATE INDEX IF NOT EXISTS idx_health_records_org_id ON public.health_records(org_id);
CREATE INDEX IF NOT EXISTS idx_health_records_type ON public.health_records(record_type);
CREATE INDEX IF NOT EXISTS idx_health_records_date ON public.health_records(record_date);
CREATE INDEX IF NOT EXISTS idx_health_records_type_date ON public.health_records(record_type, record_date);

-- Enable Row Level Security
ALTER TABLE public.health_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for health_imports
CREATE POLICY "Users can view health imports in their org"
  ON public.health_imports FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own health imports"
  ON public.health_imports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own health imports"
  ON public.health_imports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own health imports"
  ON public.health_imports FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for health_records
CREATE POLICY "Users can view health records in their org"
  ON public.health_records FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT ur.organization_id
      FROM user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert health records for their imports"
  ON public.health_records FOR INSERT
  TO authenticated
  WITH CHECK (
    import_id IN (
      SELECT hi.id
      FROM health_imports hi
      WHERE hi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete health records from their imports"
  ON public.health_records FOR DELETE
  TO authenticated
  USING (
    import_id IN (
      SELECT hi.id
      FROM health_imports hi
      WHERE hi.user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_imports_updated_at
  BEFORE UPDATE ON public.health_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_health_imports_updated_at();
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
);-- Drop the old status check constraint
ALTER TABLE public.form_submissions 
DROP CONSTRAINT IF EXISTS form_submissions_status_check;

-- Add new constraint that includes 'logged' status
ALTER TABLE public.form_submissions
ADD CONSTRAINT form_submissions_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'logged'));-- Migration to support free tier users (users without organization)
-- This allows individual users and standalone users to use the platform

-- ============================================================================
-- 1. Make organization_id nullable for work_orders (allow individual users)
-- ============================================================================

ALTER TABLE public.work_orders
ALTER COLUMN organization_id DROP NOT NULL;

-- ============================================================================
-- 2. Update work_orders RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update org work orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete org work orders" ON public.work_orders;

-- Free tier users can view their own work orders
-- Org users can view org work orders
CREATE POLICY "Users can view own work orders"
ON public.work_orders
FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Free tier users can create work orders without org
-- Org users can create work orders for their org (if approved)
CREATE POLICY "Users can create work orders"
ON public.work_orders
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Free tier: no org required
    organization_id IS NULL
    OR (
      -- Org users: must be approved and in org
      organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

-- Free tier users can update their own work orders
-- Org users can update org work orders (if approved)
CREATE POLICY "Users can update own work orders"
ON public.work_orders
FOR UPDATE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- Free tier users can delete their own work orders
-- Org users can delete org work orders (if approved)
CREATE POLICY "Users can delete own work orders"
ON public.work_orders
FOR DELETE
USING (
  user_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- ============================================================================
-- 3. Update properties RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Approved users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can create own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Approved users can delete own properties" ON public.properties;

-- Allow free tier users (unapproved) to view their own properties
CREATE POLICY "Users can view own properties"
ON public.properties
FOR SELECT
USING (auth.uid() = user_id);

-- Allow free tier users (unapproved) to create properties
CREATE POLICY "Users can create own properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow free tier users (unapproved) to update their properties
CREATE POLICY "Users can update own properties"
ON public.properties
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow free tier users (unapproved) to delete their properties
CREATE POLICY "Users can delete own properties"
ON public.properties
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Make org_id nullable for form_submissions (allow individual users)
-- ============================================================================

ALTER TABLE public.form_submissions
ALTER COLUMN org_id DROP NOT NULL;

-- ============================================================================
-- 5. Update form_templates RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Org members can view active templates" ON public.form_templates;

-- Allow free tier users to view global templates and their own custom templates
CREATE POLICY "Users can view templates"
ON public.form_templates
FOR SELECT
USING (
  is_active = true
  AND (
    is_global = true
    OR org_id IS NULL
    OR org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )
);

-- ============================================================================
-- 6. Update form_submissions RLS policies to support free tier users
-- ============================================================================

DROP POLICY IF EXISTS "Users can view org submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can update own drafts" ON public.form_submissions;
DROP POLICY IF EXISTS "Users can delete own drafts" ON public.form_submissions;

-- Free tier users can view their own submissions
-- Org users can view org submissions (if approved)
CREATE POLICY "Users can view submissions"
ON public.form_submissions
FOR SELECT
USING (
  created_by = auth.uid()
  OR (
    org_id IS NOT NULL
    AND org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND is_user_approved(auth.uid())
  )
);

-- Free tier users can create submissions without org
-- Org users can create submissions for their org (if approved)
CREATE POLICY "Users can create submissions"
ON public.form_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND (
    -- Free tier: no org required
    org_id IS NULL
    OR (
      -- Org users: must be approved and in org
      org_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
      AND is_user_approved(auth.uid())
    )
  )
);

-- Free tier users can update their own drafts
-- Org users can update their own drafts (if approved)
CREATE POLICY "Users can update own submissions"
ON public.form_submissions
FOR UPDATE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

-- Free tier users can delete their own drafts
-- Org users can delete their own drafts (if approved)
CREATE POLICY "Users can delete own submissions"
ON public.form_submissions
FOR DELETE
USING (
  auth.uid() = created_by
  AND (status = 'draft' OR org_id IS NULL)
);

-- Keep org admin policies
CREATE POLICY "Org admins can update submissions"
ON public.form_submissions
FOR UPDATE
USING (
  org_id IS NOT NULL
  AND (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
  AND is_user_approved(auth.uid())
);

CREATE POLICY "Org admins can delete submissions"
ON public.form_submissions
FOR DELETE
USING (
  org_id IS NOT NULL
  AND (is_org_admin(auth.uid(), org_id) OR is_super_admin(auth.uid()))
  AND is_user_approved(auth.uid())
);

-- ============================================================================
-- 7. Update calendar_events RLS policies (if they exist)
-- ============================================================================

DO $$
BEGIN
  -- Check if calendar_events table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calendar_events') THEN
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update org events" ON public.calendar_events';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete org events" ON public.calendar_events';

    -- Check if organization_id column exists and make it nullable
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'calendar_events'
      AND column_name = 'organization_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.calendar_events ALTER COLUMN organization_id DROP NOT NULL';
    END IF;

    -- Create new policies supporting free tier
    EXECUTE '
    CREATE POLICY "Users can view own events"
    ON public.calendar_events
    FOR SELECT
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
      )
    )';

    EXECUTE '
    CREATE POLICY "Users can create events"
    ON public.calendar_events
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND (
        organization_id IS NULL
        OR (
          organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
          AND is_user_approved(auth.uid())
        )
      )
    )';

    EXECUTE '
    CREATE POLICY "Users can update own events"
    ON public.calendar_events
    FOR UPDATE
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND is_user_approved(auth.uid())
      )
    )';

    EXECUTE '
    CREATE POLICY "Users can delete own events"
    ON public.calendar_events
    FOR DELETE
    USING (
      user_id = auth.uid()
      OR (
        organization_id IS NOT NULL
        AND organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND is_user_approved(auth.uid())
      )
    )';
  END IF;
END $$;
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
