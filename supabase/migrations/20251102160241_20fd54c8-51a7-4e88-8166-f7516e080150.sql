-- Add new columns for S/M/L preset system and layout coordinates
ALTER TABLE dashboard_widgets 
  ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'M' CHECK (size IN ('S', 'M', 'L')),
  ADD COLUMN IF NOT EXISTS layout_data JSONB DEFAULT '{"x": 0, "y": 0}';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user_position 
  ON dashboard_widgets(user_id, position);

-- Migrate existing widgets to use preset sizes
-- Map old arbitrary sizes to nearest S/M/L preset
UPDATE dashboard_widgets
SET 
  size = CASE 
    WHEN (settings->'layouts'->'lg'->0->>'w')::int <= 4 THEN 'S'
    WHEN (settings->'layouts'->'lg'->0->>'h')::int >= 3 THEN 'L'
    ELSE 'M'
  END,
  layout_data = jsonb_build_object(
    'x', COALESCE((settings->'layouts'->'lg'->0->>'x')::int, 0),
    'y', COALESCE((settings->'layouts'->'lg'->0->>'y')::int, 0)
  )
WHERE size IS NULL;