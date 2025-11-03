-- ============================================================================
-- FIX: Mark All Shared Items as Public
-- ============================================================================
-- If items exist but aren't marked as public, run this to fix them
-- ============================================================================

-- Mark ALL compositions as public (since they're in the shared community)
UPDATE compositions 
SET is_public = TRUE
WHERE is_public = FALSE;

-- Mark ALL progressions as public (since they're in the shared community)
UPDATE progressions 
SET is_public = TRUE
WHERE is_public = FALSE;

-- Verify the update
SELECT 
    'compositions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count
FROM compositions
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count
FROM progressions;



