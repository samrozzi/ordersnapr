-- Add presentation_mode column to notes table
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS is_presentation_mode BOOLEAN DEFAULT false;

-- Update existing notes to have presentation mode off by default
UPDATE notes
SET is_presentation_mode = false
WHERE is_presentation_mode IS NULL;
