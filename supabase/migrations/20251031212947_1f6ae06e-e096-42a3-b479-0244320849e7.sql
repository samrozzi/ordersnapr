-- Create user_favorites table
CREATE TABLE public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorites" ON public.user_favorites
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites" ON public.user_favorites
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.user_favorites
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_user_favorites_user_entity ON public.user_favorites(user_id, entity_type);