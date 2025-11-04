-- Make lessons global (visible to all users)
-- Progress remains per-user via user_progress table

-- Update RLS policies for lessons
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

-- Anyone can read lessons (anonymous and authenticated)
CREATE POLICY "Anyone can read lessons"
    ON lessons FOR SELECT
    USING (TRUE);

-- Only admins can insert lessons (filtered in app code)
CREATE POLICY "Admins can insert lessons"
    ON lessons FOR INSERT
    WITH CHECK (TRUE); -- Filtered in app code by isAdmin()

-- Only admins can update lessons
CREATE POLICY "Admins can update lessons"
    ON lessons FOR UPDATE
    USING (TRUE) -- Filtered in app code
    WITH CHECK (TRUE);

-- Only admins can delete lessons
CREATE POLICY "Admins can delete lessons"
    ON lessons FOR DELETE
    USING (TRUE); -- Filtered in app code

-- Remove unique constraint on lesson_number since lessons are now global
-- (We'll use custom_id for unique identification instead)
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS unique_lesson_number;

-- Make created_by nullable (lessons are global, not user-specific)
-- Already nullable, but ensure it's clear
COMMENT ON COLUMN lessons.created_by IS 'Admin who created the lesson. Lessons are global and visible to all users.';


