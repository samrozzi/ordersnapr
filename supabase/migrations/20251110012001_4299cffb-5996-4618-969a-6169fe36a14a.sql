-- Add checklist preferences to user_notes_preferences
ALTER TABLE user_notes_preferences
ADD COLUMN IF NOT EXISTS checklist_strikethrough boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS checklist_move_completed boolean NOT NULL DEFAULT true;