-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Note',
  content jsonb DEFAULT '{"blocks": []}'::jsonb,
  background_color text,
  banner_image text,
  is_favorite boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  kanban_position integer,
  kanban_column text DEFAULT 'default',
  view_mode text DEFAULT 'note' CHECK (view_mode IN ('note', 'checklist', 'canvas', 'table')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user notes preferences table
CREATE TABLE IF NOT EXISTS public.user_notes_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_view text DEFAULT 'list' CHECK (default_view IN ('list', 'kanban')),
  sidebar_dropdown_open boolean DEFAULT true,
  kanban_columns jsonb DEFAULT '["To Do", "In Progress", "Done"]'::jsonb,
  list_sort_by text DEFAULT 'updated_at',
  list_sort_order text DEFAULT 'desc' CHECK (list_sort_order IN ('asc', 'desc')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes_preferences ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can view their own notes"
  ON public.notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_notes_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_notes_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_notes_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_org_id ON public.notes(org_id);
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_is_favorite ON public.notes(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_notes_kanban ON public.notes(kanban_column, kanban_position) WHERE kanban_position IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();

CREATE TRIGGER user_notes_preferences_updated_at
  BEFORE UPDATE ON public.user_notes_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notes_updated_at();
