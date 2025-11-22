-- Make user_id nullable in notes table (org_id is already nullable)
ALTER TABLE notes 
ALTER COLUMN user_id DROP NOT NULL;