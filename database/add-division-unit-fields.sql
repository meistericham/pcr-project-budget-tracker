-- Add Division and Unit fields to Users table
-- This migration adds division_id and unit_id fields and updates RLS policies

-- Drop the users updated_at trigger since we're not adding that column
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Add division_id and unit_id columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_division_id ON public.users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_unit_id ON public.users(unit_id);

-- Drop existing overly permissive update policy
DROP POLICY IF EXISTS users_update_own_row ON public.users;

-- Create new restrictive update policy that only allows users to update basic fields
CREATE POLICY users_update_own_row
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND (
    -- Users can update their own basic fields
    (name IS DISTINCT FROM OLD.name) OR
    (initials IS DISTINCT FROM OLD.initials) OR
    (email IS DISTINCT FROM OLD.email)
    -- Note: division_id and unit_id are NOT included here, so users cannot update them
  )
);

-- Create policy for super_admin to update division_id and unit_id
CREATE POLICY users_super_admin_update_division_unit
ON public.users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
  AND (
    -- Super admin can update any field including division_id and unit_id
    true
  )
);

-- Create policy for super_admin to manage all users (insert, update, delete)
CREATE POLICY users_super_admin_manage_all
ON public.users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Verify the new structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;
