-- Create form_drafts table for saving partial form data
CREATE TABLE IF NOT EXISTS public.form_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_type text NOT NULL,
  draft_name text,
  form_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
  ON public.form_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own drafts
CREATE POLICY "Users can create own drafts"
  ON public.form_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
  ON public.form_drafts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
  ON public.form_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_form_drafts_user_id ON public.form_drafts(user_id);
CREATE INDEX idx_form_drafts_form_type ON public.form_drafts(form_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();