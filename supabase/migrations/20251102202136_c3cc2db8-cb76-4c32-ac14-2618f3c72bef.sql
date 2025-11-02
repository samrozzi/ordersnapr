-- Add new columns to work_orders table for Jobs functionality
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS type text,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS linked_invoice_id uuid REFERENCES invoices(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_work_orders_type ON work_orders(type);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);