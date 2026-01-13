-- Add 'internet' and 'printing' categories to sponsors table
-- This migration updates the check constraint to allow the new partner types
--

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

-- Create or replace the constraint to include 'internet' and 'printing'
ALTER TABLE sponsors 
DROP CONSTRAINT IF EXISTS sponsors_category_check;

ALTER TABLE sponsors 
ADD CONSTRAINT sponsors_category_check 
CHECK (category IN ('title', 'gold', 'silver', 'tech', 'internet', 'printing', 'community', 'media'));

-- Optional: Comments to describe the new categories
COMMENT ON COLUMN sponsors.category IS 'Category of sponsorship: title, gold, silver, tech, internet, printing, community, media';
