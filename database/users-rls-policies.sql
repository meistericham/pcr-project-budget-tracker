-- Users table RLS policies
-- This script tightens Row Level Security for the public.users table

-- Enable RLS (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.users;
DROP POLICY IF EXISTS "Users can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;

-- Allow a user to create their own row (for first-login profile upsert)
DROP POLICY IF EXISTS users_insert_own_row ON public.users;
CREATE POLICY users_insert_own_row
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow a user to update their own row
DROP POLICY IF EXISTS users_update_own_row ON public.users;
CREATE POLICY users_update_own_row
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Read policy: Everyone authenticated can read everyone (simplest for now)
-- This allows users to see other users for assignment purposes
DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all
ON public.users FOR SELECT
TO authenticated
USING (true);

-- Alternative: Only read self (uncomment if you want more restrictive access)
-- CREATE POLICY users_select_self
-- ON public.users FOR SELECT
-- TO authenticated
-- USING (auth.uid() = id);

-- Super admins can manage all users (optional - uncomment if needed)
-- DROP POLICY IF EXISTS users_super_admin_manage ON public.users;
-- CREATE POLICY users_super_admin_manage
-- ON public.users FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.users 
--     WHERE id = auth.uid() 
--     AND role = 'super_admin'
--   )
-- );

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
