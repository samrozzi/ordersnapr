-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content JSONB NOT NULL DEFAULT '{"blocks": []}'::jsonb,
  background_color TEXT,
  banner_image TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  kanban_position INTEGER,
  kanban_column TEXT,
  view_mode TEXT NOT NULL DEFAULT 'note' CHECK (view_mode IN ('note', 'checklist', 'canvas', 'table')),
  linked_entity_type TEXT CHECK (linked_entity_type IN ('customer', 'work_order', 'invoice')),
  linked_entity_id UUID,
  template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can create own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for notes
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_org_id ON public.notes(org_id) WHERE org_id IS NOT NULL;
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_is_favorite ON public.notes(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_notes_linked_entity ON public.notes(linked_entity_type, linked_entity_id) WHERE linked_entity_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create user_notes_preferences table
CREATE TABLE IF NOT EXISTS public.user_notes_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_view TEXT NOT NULL DEFAULT 'list' CHECK (default_view IN ('list', 'kanban')),
  sidebar_dropdown_open BOOLEAN NOT NULL DEFAULT true,
  kanban_columns JSONB NOT NULL DEFAULT '["To Do", "In Progress", "Done"]'::jsonb,
  list_sort_by TEXT NOT NULL DEFAULT 'updated_at',
  list_sort_order TEXT NOT NULL DEFAULT 'desc' CHECK (list_sort_order IN ('asc', 'desc')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notes_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notes_preferences
CREATE POLICY "Users can manage own preferences"
  ON public.user_notes_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_user_notes_preferences_updated_at
  BEFORE UPDATE ON public.user_notes_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create note_templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('work', 'personal')),
  icon TEXT,
  default_title TEXT NOT NULL,
  default_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_templates
CREATE POLICY "Anyone can view templates"
  ON public.note_templates FOR SELECT
  USING (true);

-- Insert system templates
INSERT INTO public.note_templates (name, description, category, icon, default_title, default_blocks, is_system) VALUES
  ('Blank Note', 'Start with a blank canvas', 'personal', 'FileText', 'Untitled Note', '[{"id": "block-1", "type": "paragraph", "content": ""}]'::jsonb, true),
  ('Meeting Notes', 'Track meeting discussions and action items', 'work', 'Users', 'Meeting Notes - [Date]', '[{"id": "block-1", "type": "heading", "level": 1, "content": "Meeting Notes"}, {"id": "block-2", "type": "paragraph", "content": "Date: "}, {"id": "block-3", "type": "paragraph", "content": "Attendees: "}, {"id": "block-4", "type": "heading", "level": 2, "content": "Discussion"}, {"id": "block-5", "type": "paragraph", "content": ""}, {"id": "block-6", "type": "heading", "level": 2, "content": "Action Items"}, {"id": "block-7", "type": "checklist", "items": []}]'::jsonb, true),
  ('Project Plan', 'Organize project goals and milestones', 'work', 'FolderKanban', 'Project Plan', '[{"id": "block-1", "type": "heading", "level": 1, "content": "Project Plan"}, {"id": "block-2", "type": "heading", "level": 2, "content": "Goals"}, {"id": "block-3", "type": "paragraph", "content": ""}, {"id": "block-4", "type": "heading", "level": 2, "content": "Milestones"}, {"id": "block-5", "type": "checklist", "items": []}]'::jsonb, true),
  ('Daily Journal', 'Reflect on your day', 'personal', 'BookOpen', 'Journal Entry - [Date]', '[{"id": "block-1", "type": "heading", "level": 1, "content": "Daily Journal"}, {"id": "block-2", "type": "paragraph", "content": "Today I..."}, {"id": "block-3", "type": "heading", "level": 2, "content": "Grateful For"}, {"id": "block-4", "type": "paragraph", "content": ""}, {"id": "block-5", "type": "heading", "level": 2, "content": "Tomorrow''s Goals"}, {"id": "block-6", "type": "checklist", "items": []}]'::jsonb, true),
  ('Quick List', 'Simple checklist for tasks', 'personal', 'ListChecks', 'Quick List', '[{"id": "block-1", "type": "heading", "level": 1, "content": "Quick List"}, {"id": "block-2", "type": "checklist", "items": []}]'::jsonb, true)
ON CONFLICT DO NOTHING;