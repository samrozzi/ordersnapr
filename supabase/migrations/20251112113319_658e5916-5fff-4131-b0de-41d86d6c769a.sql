-- Add archived_at column to notes table for soft delete functionality
ALTER TABLE notes ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

-- Create index for archived notes queries (improves performance when fetching archived notes)
CREATE INDEX idx_notes_archived_at ON notes(archived_at) WHERE archived_at IS NOT NULL;

-- Create index for active notes (most common query - improves performance)
CREATE INDEX idx_notes_active ON notes(user_id, org_id, archived_at) WHERE archived_at IS NULL;