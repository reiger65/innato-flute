-- Add subtitle and topic fields to lessons table
-- Also add a custom_id field to store the sequential ID like "lesson-1", "lesson-2"

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Create index for custom_id lookups
CREATE INDEX IF NOT EXISTS idx_lessons_custom_id ON lessons(custom_id) WHERE custom_id IS NOT NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(created_by) WHERE created_by IS NOT NULL;


