-- Add 'tech' category to sponsors table
-- This migration adds support for Tech Partners category
--
-- NOTE: If your sponsors table has a CHECK constraint on the category column,
-- you may need to update it manually in Supabase. This script attempts to handle it automatically.

-- Drop existing category check constraint if it exists
DO $$ 
DECLARE
    constraint_record record;
BEGIN
    -- Find and drop any existing CHECK constraint on the category column
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'sponsors'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%category%'
    LOOP
        EXECUTE format('ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
    END LOOP;
END $$;

-- Create or replace the constraint to include 'tech'
ALTER TABLE sponsors 
DROP CONSTRAINT IF EXISTS sponsors_category_check;

ALTER TABLE sponsors 
ADD CONSTRAINT sponsors_category_check 
CHECK (category IN ('title', 'gold', 'silver', 'tech', 'community', 'media'));

-- Alternative: If your table structure is different, you may need to manually update
-- the constraint in Supabase Dashboard -> Database -> Table Editor -> sponsors -> Constraints
