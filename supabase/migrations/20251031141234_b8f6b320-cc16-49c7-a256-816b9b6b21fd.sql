-- Drop the restrictive policy that blocks organization sharing on work_orders
-- This policy requires auth.uid() = user_id for ALL operations, which prevents
-- users from seeing records created by other users in their organization
DROP POLICY IF EXISTS "Restrict work orders to own records only" ON work_orders;

-- The remaining PERMISSIVE policies will now work correctly to allow:
-- 1. Users to see their own records
-- 2. Users to see records from other users in the same organization