-- ============================================================================
-- Migration: Allow reading compositions referenced by lessons
-- ============================================================================
-- 
-- This migration adds an RLS policy to allow anyone to read compositions
-- that are referenced by public lessons. This enables logged-out users
-- to view lesson compositions.
--
-- IMPORTANT: Run this in Supabase SQL Editor:
-- 1. Go to Supabase Dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste this entire file
-- 5. Click "Run" (or press Cmd/Ctrl + Enter)
--
-- ============================================================================

-- Add policy to allow reading compositions referenced by lessons
DROP POLICY IF EXISTS "Anyone can read compositions referenced by lessons" ON compositions;

CREATE POLICY "Anyone can read compositions referenced by lessons"
    ON compositions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lessons 
            WHERE lessons.composition_id = compositions.id
        )
    );

-- ============================================================================
-- DONE!
-- ============================================================================
-- 
-- After running this migration, logged-out users will be able to view
-- compositions that are assigned to lessons.
--
-- ============================================================================
