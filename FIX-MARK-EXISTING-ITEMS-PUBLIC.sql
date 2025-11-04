-- ============================================================================
-- CHECK AND FIX: See what's in database and mark items as public
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Check what exists
SELECT 
    'compositions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count,
    COUNT(*) as total_count
FROM compositions
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count,
    COUNT(*) as total_count
FROM progressions;

-- Step 2: If you want to mark ALL existing items as public, uncomment below:
-- UPDATE compositions SET is_public = TRUE WHERE is_public = FALSE;
-- UPDATE progressions SET is_public = TRUE WHERE is_public = FALSE;

-- Step 3: Verify
SELECT 
    'compositions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count
FROM compositions
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count
FROM progressions;




