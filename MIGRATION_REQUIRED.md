# 🚨 CRITICAL: Database Migration Required

## Issue
The free tier features won't work until you apply the database migration to your Supabase instance.

## Symptoms You're Experiencing
- ❌ "Error failed to make work order" when saving work orders
- ❌ "new row violates row-level security policy" for properties
- ❌ Form templates not appearing in list
- ❌ Quick Add button not showing for free users

## Root Cause
The migration file exists in your codebase but hasn't been applied to your Supabase database yet.

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
# From your project root
cd /home/user/ordersnapr

# Apply all pending migrations
supabase db push

# Or apply this specific migration
supabase migration up
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Copy the contents of `/home/user/ordersnapr/supabase/migrations/20251108000000_support_free_tier_users.sql`
5. Paste into the SQL editor
6. Click "Run"

### Option 3: Manual SQL Execution
1. Open the migration file: `/home/user/ordersnapr/supabase/migrations/20251108000000_support_free_tier_users.sql`
2. Copy ALL the SQL content
3. Run it in your Supabase SQL editor

## What This Migration Does

### Makes organization_id Optional
- `work_orders.organization_id` → nullable (allows free tier users)
- `form_submissions.org_id` → nullable (allows free tier users)
- `calendar_events.organization_id` → nullable (if exists)

### Updates ALL RLS Policies
- **work_orders**: Free tier users can CRUD their own (org_id = null)
- **properties**: Removes approval requirement, allows free tier
- **form_templates**: Free tier users can view global + their own templates
- **form_submissions**: Free tier users can CRUD their own (org_id = null)
- **calendar_events**: Free tier users can CRUD their own (org_id = null)

## Verification After Migration

Run this query in Supabase SQL Editor to verify:
```sql
-- Check if organization_id is nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'work_orders'
AND column_name = 'organization_id';
-- Should return: is_nullable = 'YES'

-- Check RLS policies
SELECT policyname
FROM pg_policies
WHERE tablename = 'work_orders';
-- Should see policies like "Users can view own work orders"
```

## Once Migration is Applied
All the free tier features will work:
- ✅ Free tier users can create work orders
- ✅ Free tier users can create properties
- ✅ Free tier users can create forms
- ✅ Quick Add button will appear
- ✅ Everything scoped to user_id (org_id = null)
