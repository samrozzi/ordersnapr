-- Add is_presentation_mode column to notes table
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_presentation_mode BOOLEAN NOT NULL DEFAULT false;

-- Add index for potential querying
CREATE INDEX IF NOT EXISTS idx_notes_presentation_mode 
ON public.notes(is_presentation_mode) 
WHERE is_presentation_mode = true;