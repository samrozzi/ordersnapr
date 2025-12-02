# Diagnose Public Overrun Report Issue

## Current Problem
When logged out: "Form Not Found - The Overrun Report form could not be loaded"
When logged in: Works perfectly

## Root Cause
The template exists in the database but is NOT marked as `is_global = true`, so the RLS policy blocks anonymous access.

## How to Verify This is the Issue

Once you merge and deploy this PR, Lovable will apply the migration. But to verify the current state, you can check the deployment logs.

### What the migration does:
1. Drops old restrictive RLS policies
2. Creates new policy that allows public access to templates where `is_global = true`
3. **Sets the overrun template's `is_global = true`** (this is the critical fix)

## Deployment Checklist

- [ ] Merge this PR (`claude/fix-public-report-access-01UrRkEa8gJ3Ldq5d3EuEbij`) to main
- [ ] Wait for Lovable to deploy (check deployment logs)
- [ ] Verify migration `20251202000000_allow_public_access_to_global_templates.sql` was applied
- [ ] Test in incognito window: https://ordersnapr.com/private/overrun
- [ ] Should see the form load (no "Form Not Found" error)

## If Still Not Working After Deployment

The migration may have failed. Check Lovable deployment logs for errors related to:
- `DROP POLICY` statements
- `CREATE POLICY` statements
- `INSERT INTO form_templates`

## Migration File Location
`supabase/migrations/20251202000000_allow_public_access_to_global_templates.sql`

This file MUST be applied to your Supabase database for the fix to work.
