-- Add AI provider configuration fields to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'lovable' CHECK (ai_provider IN ('lovable', 'openai')),
ADD COLUMN IF NOT EXISTS ai_provider_configured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS openai_api_key_encrypted TEXT;

COMMENT ON COLUMN user_preferences.ai_provider IS 'AI service provider: lovable (built-in) or openai (user API key)';
COMMENT ON COLUMN user_preferences.ai_provider_configured IS 'Whether user has completed AI provider setup';
COMMENT ON COLUMN user_preferences.openai_api_key_encrypted IS 'Encrypted OpenAI API key for users who choose OpenAI option';