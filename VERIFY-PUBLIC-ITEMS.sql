-- ============================================================================
-- VERIFY: Check if Items are Now Public
-- ============================================================================
-- Run this to verify the UPDATE worked
-- ============================================================================

-- Check compositions status
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at
FROM compositions 
ORDER BY created_at DESC;

-- Check progressions status
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at
FROM progressions 
ORDER BY created_at DESC;

-- Summary count
SELECT 
    'compositions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count,
    COUNT(*) as total
FROM compositions
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count,
    COUNT(*) as total
FROM progressions;




