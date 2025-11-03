-- ============================================================================
-- DEBUG: Check ALL Items in Supabase
-- ============================================================================
-- This will show us what's actually in the database
-- ============================================================================

-- Show ALL compositions (public and private)
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at,
    updated_at
FROM compositions 
ORDER BY created_at DESC;

-- Show ALL progressions (public and private)
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at,
    updated_at
FROM progressions 
ORDER BY created_at DESC;

-- Count by public status
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

-- Test query that matches what the app does
SELECT 
    id,
    name,
    is_public,
    user_id
FROM compositions 
WHERE is_public = TRUE
ORDER BY created_at DESC;

SELECT 
    id,
    name,
    is_public,
    user_id
FROM progressions 
WHERE is_public = TRUE
ORDER BY created_at DESC;



