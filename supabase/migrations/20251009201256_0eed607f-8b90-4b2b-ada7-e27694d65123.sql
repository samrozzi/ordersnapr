-- Add scheduled_time column to work_orders table
ALTER TABLE public.work_orders 
ADD COLUMN scheduled_time time;