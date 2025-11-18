-- Add hours column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS hours TEXT;