-- Add updated_at column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Approve samrozzi@gmail.com account
UPDATE profiles 
SET approval_status = 'approved' 
WHERE id = 'bd3a5b81-f3c3-4dee-b334-18130dcebe73';

-- Make samrozzi@gmail.com an admin
INSERT INTO user_roles (user_id, role)
VALUES ('bd3a5b81-f3c3-4dee-b334-18130dcebe73', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;