-- ============================================================================
-- FIX: Add missing custom_id, subtitle, and topic columns to lessons table
-- ============================================================================
-- This migration fixes the issue where lessons can't sync to Supabase
-- because the custom_id column doesn't exist.
--
-- Run this in Supabase SQL Editor:
-- Tools > SQL Editor > New Query > Paste this script > Run
-- ============================================================================

-- Add missing columns if they don't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Create index for custom_id lookups (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_lessons_custom_id ON lessons(custom_id) WHERE custom_id IS NOT NULL;

-- Create index for user_id lookups (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(created_by) WHERE created_by IS NOT NULL;

-- Verify the columns were added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lessons' AND column_name = 'custom_id'
    ) THEN
        RAISE NOTICE 'SUCCESS: custom_id column added to lessons table';
    ELSE
        RAISE EXCEPTION 'FAILED: custom_id column was not added';
    END IF;
END $$;


