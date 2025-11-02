-- ============================================================================
-- Fix RLS Policies to Allow ALL Users (Authenticated + Anonymous) to Read Public Items
-- ============================================================================
-- 
-- This ensures that public compositions and progressions can be read by:
-- - Anonymous users (not logged in)
-- - Authenticated users (regardless of which user)
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql
-- ============================================================================

-- ============================================================================
-- COMPOSITIONS - Fix Public Read Policy
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;

-- Create policy that works for both anonymous AND authenticated users
CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (
        is_public = TRUE
    );

-- ============================================================================
-- PROGRESSIONS - Fix Public Read Policy  
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions;

-- Create policy that works for both anonymous AND authenticated users
CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (
        is_public = TRUE
    );

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================

-- Check compositions policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'compositions' 
AND policyname LIKE '%public%';

-- Check progressions policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'progressions' 
AND policyname LIKE '%public%';

-- ============================================================================
-- TEST QUERIES (should return public items regardless of auth state)
-- ============================================================================

-- Test compositions (should return all public compositions)
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at
FROM compositions 
WHERE is_public = TRUE
ORDER BY created_at DESC
LIMIT 10;

-- Test progressions (should return all public progressions)
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at
FROM progressions 
WHERE is_public = TRUE
ORDER BY created_at DESC
LIMIT 10;

