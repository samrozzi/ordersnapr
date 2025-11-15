-- Test if openai_api_key column exists
-- Run this in Supabase SQL Editor to check migration status

-- Check if column exists in user_preferences
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_preferences'
AND column_name = 'openai_api_key';

-- Check if column exists in profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'last_username_change';

-- If both queries return empty, the migrations haven't been applied yet
-- If they return rows, the columns exist and something else is wrong
