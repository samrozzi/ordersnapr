# HOW TO FIX FREE TIER USERS - IMMEDIATE MANUAL FIX

## The Problem

The code changes are deployed, but the database migrations haven't been applied. This causes:
- ❌ Onboarding loop (code looks for `onboarding_completed` column that doesn't exist)
- ❌ Can't create work orders (RLS policies still require organization)
- ❌ Forms save but don't show up (RLS policies filter them out)
- ❌ Calendar blocked (feature gate logic + missing columns)

## The Solution - Run SQL Manually

Since Lovable hasn't auto-applied the migrations yet, you need to run the SQL manually.

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your OrderSnapr project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the SQL**
   - Open the file `MANUAL_FIX.sql` in this directory
   - Copy ALL the contents
   - Paste into the SQL Editor

4. **Run the Query**
   - Click "Run" or press Ctrl+Enter
   - Wait for it to complete (should take 2-5 seconds)
   - You should see "Success. No rows returned"

5. **Verify It Worked**
   - Log in as a free tier user (like testing5@gmail.com)
   - You should NOT see onboarding again
   - Calendar should be visible in sidebar
   - Try creating a work order - should succeed
   - Try creating a form - should appear in your list

## What the SQL Does

The SQL does 7 things:

1. **Makes `organization_id` nullable** - Allows free tier users to have NULL org
2. **Updates work_orders RLS policies** - Allows users to create work orders without org
3. **Updates properties RLS policies** - Removes approval requirement for free tier
4. **Updates form_templates RLS policies** - Allows free tier users to see their forms
5. **Updates form_submissions RLS policies** - Allows free tier to submit forms
6. **Adds onboarding tracking columns** - `onboarding_completed`, `onboarding_data`
7. **Auto-approves existing free tier users** - Sets all users with no org to approved

## After Running the SQL

All of these should work immediately:

✅ Free tier users auto-approved (no admin needed)
✅ Onboarding only shown once (persists to database)
✅ Calendar accessible
✅ Forms visible in list
✅ Work orders can be created
✅ Properties can be created
✅ All free tier features work

## If You Still Have Issues

If you still see problems after running the SQL:

1. **Hard refresh the browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser localStorage**:
   - Open browser console (F12)
   - Type: `localStorage.clear()`
   - Press Enter
   - Refresh page

3. **Check Supabase logs** for any RLS policy errors:
   - Supabase Dashboard → Logs → Postgres Logs
   - Look for "policy" errors

4. **Verify columns were added**:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'profiles'
   AND column_name IN ('onboarding_completed', 'onboarding_data');
   ```
   Should return 2 rows.

5. **Verify organization_id is nullable**:
   ```sql
   SELECT column_name, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'work_orders'
   AND column_name = 'organization_id';
   ```
   Should return `is_nullable: YES`

## Why This Happened

The migrations were pushed to git, but Lovable needs to detect and apply them. This can take time or may require a manual trigger. By running the SQL manually, we're applying the database changes immediately without waiting for Lovable's deployment process.
