# Manual Migration Application

## Quick Add Customization Feature

The Quick Add customization feature requires a new database table. This migration will be **automatically applied** when you deploy to Lovable.

However, if you want to test it **immediately** without deploying:

### Option 1: Wait for Deployment (Recommended)
- Merge the PR to main
- Lovable will automatically apply the migration
- Feature will work immediately after deploy

### Option 2: Manual Application (For Immediate Testing)

Go to your Supabase Dashboard → SQL Editor and run this:

```sql
-- Create user_preferences table for storing Quick Add customization and other user settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quick_add_enabled BOOLEAN DEFAULT true,
  quick_add_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores per-user preferences like Quick Add customization';
```

### Verify Migration

After applying (either way), verify the table exists:

```sql
SELECT * FROM user_preferences LIMIT 1;
```

You should see no errors. The table will be empty until users customize their Quick Add preferences.
