-- ============================================================================
-- Fix RLS Policies for Safari/iPhone Anonymous Access
-- ============================================================================
-- 
-- This script ensures public compositions can be read by anonymous users
-- (which Safari sometimes treats differently than Chrome)
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, verify the current policy exists
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
WHERE tablename = 'compositions' 
AND policyname LIKE '%public%';

-- Drop and recreate the "Anyone can read public compositions" policy
-- This ensures it works for anonymous users (NULL auth.uid())
DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;

-- Create a more explicit policy that definitely works for anonymous users
CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (
        is_public = TRUE
        OR 
        auth.uid() = user_id  -- Also allow users to read their own compositions
    );

-- Verify it was created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'compositions' 
AND policyname = 'Anyone can read public compositions';

-- Test query (should return public compositions even without auth)
-- This simulates what Safari does as an anonymous user
SELECT 
    id,
    name,
    is_public,
    created_at
FROM compositions 
WHERE is_public = TRUE
LIMIT 5;




