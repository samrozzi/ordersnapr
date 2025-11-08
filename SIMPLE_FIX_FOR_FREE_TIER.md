# Simple Fix: Enable Free Tier Users

## Your Situation

✅ **Database exists and works** - Organization users can do everything
❌ **Free tier users blocked** - Users without an organization can't do anything

## The Fix (2 minutes)

Run ONE small SQL file to enable free tier users.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Click on your OrderSnapr project (vqudyddedeacspujotsa)

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste**
   - Open `FREE_TIER_FIX_ONLY.sql` from this repo
   - Copy all contents (Ctrl+A, Ctrl+C)
   - Paste into SQL Editor
   - Click "Run" (or Ctrl+Enter)

4. **Wait for Success**
   - Should complete in 2-5 seconds
   - Look for "Success. No rows returned"

5. **Test Immediately**
   - Log in as a free tier user (like testing5@gmail.com)
   - Should NOT see onboarding again (marked complete)
   - Calendar should be visible in sidebar
   - Create a work order - should succeed
   - Create a form - should appear in list

## What This Does

The SQL file makes TWO changes:

### 1. Update RLS Policies (Row Level Security)

**Before:**
- Only organization users can create work orders
- Only approved users can create properties
- Forms require organization membership
- Calendar blocked for non-org users

**After:**
- ✅ Free tier users can create work orders (with org_id = NULL)
- ✅ Free tier users can create properties
- ✅ Free tier users can create forms
- ✅ Free tier users can access calendar
- ✅ Organization users still work normally

### 2. Auto-Approve Free Tier Users

**Before:**
- ALL users start as "pending" approval
- Even free tier users need admin approval
- Onboarding stored in localStorage (gets lost)

**After:**
- ✅ Free tier users (no org) are auto-approved
- ✅ Organization users still need admin approval
- ✅ Onboarding saved to database (persists forever)
- ✅ Adds `onboarding_completed` and `onboarding_data` columns

## What Works After Running This

### For Free Tier Users (No Organization):
✅ Auto-approved on signup
✅ Onboarding shown once (persists)
✅ Can create 3 work orders
✅ Can create 2 properties
✅ Can create 2 forms
✅ Can create 5 calendar events
✅ Calendar visible in sidebar
✅ Forms visible in sidebar
✅ All free tier features work

### For Organization Users:
✅ Everything still works normally
✅ Still require admin approval
✅ Unlimited records
✅ Team collaboration
✅ Advanced features

## If You Still Have Issues

1. **Hard refresh browser** (Ctrl+Shift+R)
2. **Clear localStorage**:
   - Open browser console (F12)
   - Type: `localStorage.clear()`
   - Press Enter
   - Refresh page
3. **Check Supabase logs** for RLS errors:
   - Dashboard → Logs → Postgres Logs

## Why Not Use APPLY_ALL_MIGRATIONS.sql?

Since your database already works for org users, all your tables and most migrations are already applied. You only need the FREE TIER specific changes.

`APPLY_ALL_MIGRATIONS.sql` would try to recreate tables that already exist and cause errors.

`FREE_TIER_FIX_ONLY.sql` is safe to run on your existing database - it only updates RLS policies and adds the free tier columns.
