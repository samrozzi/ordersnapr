-- Create dashboard_widgets table for storing user widget configurations
CREATE TABLE public.dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('calendar-small', 'calendar-medium', 'calendar-large', 'weather')),
  position INTEGER NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own widgets
CREATE POLICY "Users can view own widgets"
  ON public.dashboard_widgets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own widgets"
  ON public.dashboard_widgets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own widgets"
  ON public.dashboard_widgets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own widgets"
  ON public.dashboard_widgets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON public.dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();