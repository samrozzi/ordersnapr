-- Security Enhancement: Add restrictive policies to prevent unauthorized data access

-- 1. Add RESTRICTIVE policy to work_orders to ensure users can ONLY access their own work orders
-- This prevents any potential bypass of the user_id check and ensures data isolation
CREATE POLICY "Restrict work orders to own records only" 
ON public.work_orders 
AS RESTRICTIVE 
FOR ALL
USING (auth.uid() = user_id);

-- 2. Allow users to view their own role assignments for transparency
-- This helps users understand their permissions and reduces support burden
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);