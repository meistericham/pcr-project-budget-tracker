-- Fix project budget and spent defaults to prevent 400 errors
-- Run this in your Supabase SQL editor

-- Set default values for budget and spent columns
ALTER TABLE projects ALTER COLUMN budget SET DEFAULT 0;
ALTER TABLE projects ALTER COLUMN spent SET DEFAULT 0;

-- Verify the changes
SELECT column_name, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('budget', 'spent');
