# Fix Public Overrun Report Access - Instructions

## Problem
The public overrun report page at `https://ordersnapr.com/private/overrun` shows "Form Not Found" when accessed by logged-out users.

## Root Cause
The Row Level Security (RLS) policy on the `form_templates` table requires authentication, preventing anonymous users from loading the form template.

## Solution
Apply the SQL script to modify RLS policies and ensure the overrun template is accessible publicly.

---

## Quick Fix (Recommended)

### Option 1: Run SQL in Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your `ordersnapr` project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the entire contents** of `FIX_PUBLIC_OVERRUN_ACCESS.sql`

4. **Run the query**
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - You should see a success message

5. **Verify**
   - The last SELECT statement will show you the overrun template details
   - Confirm that `is_global` is `true`

6. **Test**
   - Open an incognito/private browser window
   - Navigate to https://ordersnapr.com/private/overrun
   - The form should now load successfully!

---

### Option 2: Deploy via Lovable (Automatic)

If you're using Lovable's deployment system:

1. **Merge this branch** to your main branch
2. **Deploy through Lovable**
   - Lovable will automatically apply the migration file:
     `supabase/migrations/20251202000000_allow_public_access_to_global_templates.sql`

---

## What This Fix Does

1. **Removes the restrictive RLS policy** that required authentication for all template reads

2. **Creates two new policies**:
   - `"Public can view global templates"` - Allows anonymous access to templates marked `is_global = true`
   - `"Org members can view org templates"` - Allows authenticated org members to view their org's templates

3. **Ensures the overrun template exists** and is marked as `is_global = true`

4. **Maintains security**:
   - Anonymous users can VIEW the form
   - Only authenticated users can SAVE or SUBMIT (controlled by separate RLS policies on `form_submissions`)

---

## Expected Behavior After Fix

### For Logged-Out Users:
✅ Can view the overrun report form
✅ Can fill out all fields
✅ Can download PDF/DOCX
❌ Cannot save drafts (requires login)
❌ Cannot submit form (requires login)

### For Logged-In Users:
✅ Can view the overrun report form
✅ Can fill out all fields
✅ Can download PDF/DOCX
✅ Can save drafts
✅ Can submit form

---

## Troubleshooting

### Issue: "Form Not Found" still appears after running the fix

**Check 1: Verify the policy was created**
```sql
SELECT * FROM pg_policies
WHERE tablename = 'form_templates'
AND policyname = 'Public can view global templates';
```

**Check 2: Verify the template exists and is global**
```sql
SELECT id, name, is_global, is_active
FROM form_templates
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26';
```

**Check 3: Test the query as an anonymous user**
```sql
-- This simulates what an unauthenticated user sees
SELECT id, name, schema
FROM form_templates
WHERE id = '06ef6c3a-84ad-4b01-b18b-be8647e94b26'
  AND is_global = true
  AND is_active = true;
```

If this returns no rows, the template might not exist. Run the `FIX_PUBLIC_OVERRUN_ACCESS.sql` script again.

### Issue: Browser still showing old error

Clear your browser cache or try in an incognito window.

---

## Questions?

If you continue to experience issues after applying this fix, please check:
1. The Supabase SQL Editor shows no errors when running the script
2. Your browser console for any JavaScript errors (press F12)
3. The network tab to see what error the API is returning
