-- Add metadata column to form_submissions table to store entry label preferences
ALTER TABLE form_submissions 
ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN form_submissions.metadata IS 'Stores additional metadata like entryLabelPreferences';