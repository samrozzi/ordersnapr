-- Add display_order column to user_favorites for reordering
ALTER TABLE user_favorites ADD COLUMN display_order INTEGER DEFAULT 0;

-- Create index for faster ordering queries
CREATE INDEX idx_user_favorites_display_order ON user_favorites(user_id, display_order DESC);

-- Update existing records to have sequential display_order based on created_at
UPDATE user_favorites
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM user_favorites
) AS subquery
WHERE user_favorites.id = subquery.id;