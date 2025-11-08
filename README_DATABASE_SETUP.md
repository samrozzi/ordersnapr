# CRITICAL: Apply All Migrations to Your Database

## Your Situation

You have a Supabase project (`vqudyddedeacspujotsa.supabase.co`) but **NO TABLES** exist yet.

All the migrations in `/supabase/migrations/` have never been applied, so your database is completely empty.

## Solution: Run All Migrations at Once

I've combined all 54 migration files into a single SQL file that you can run.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Find and click on your `ordersnapr` project (vqudyddedeacspujotsa)

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy the SQL File**
   - Open `APPLY_ALL_MIGRATIONS.sql` in this repo
   - Select all (Ctrl+A) and copy (Ctrl+C)

4. **Paste and Run**
   - Paste into the SQL Editor
   - Click "Run" (or Ctrl+Enter)
   - **This will take 10-30 seconds** - don't close the tab!
   - Wait for "Success. No rows returned"

5. **Verify It Worked**
   Run this query to check tables were created:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```

   You should see tables like:
   - profiles
   - work_orders
   - properties
   - form_templates
   - form_submissions
   - calendar_events
   - organizations
   - etc.

## What This Creates

The migrations will create:

✅ **All Database Tables**
- profiles (users)
- work_orders
- properties
- form_templates
- form_submissions
- calendar_events
- organizations
- org_memberships
- user_roles
- customers
- invoices
- inventory
- notifications
- user_preferences
- and more...

✅ **Row Level Security (RLS) Policies**
- Users can only see their own data
- Free tier users (no org) can create records
- Organization users need approval

✅ **Database Functions**
- is_user_approved()
- has_role()
- is_org_admin()
- handle_new_user() (triggers on signup)

✅ **Free Tier Support**
- organization_id is nullable
- Auto-approve free tier users
- Onboarding tracking columns

## After Running the SQL

Once complete, ALL features will work:

✅ User signup and login
✅ Onboarding (persists to database)
✅ Free tier users auto-approved
✅ Work orders (create, view, edit)
✅ Properties (create, view, edit)
✅ Forms (create templates, submit forms)
✅ Calendar (create events)
✅ All RLS policies enforced
✅ Usage limits tracked

## If You Get Errors

### "relation already exists"
- Some tables might already exist
- Run this to check: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
- If tables exist but have wrong schema, you may need to drop and recreate them

### "column already exists"
- The migration already ran partially
- Check what exists and skip those parts

### "function does not exist"
- Some migrations depend on previous ones
- Make sure you're running ALL migrations in order

## Need Help?

If errors occur, send me:
1. The exact error message
2. Which line number it failed on
3. What tables already exist (from the SELECT query above)
