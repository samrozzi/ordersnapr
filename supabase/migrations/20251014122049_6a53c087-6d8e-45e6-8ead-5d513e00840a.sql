-- Add access requirements fields to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN access_required boolean NOT NULL DEFAULT false,
ADD COLUMN access_notes text;