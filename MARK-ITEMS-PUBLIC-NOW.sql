-- ============================================================================
-- FIX: Mark Private Items as Public
-- ============================================================================
-- This will mark all existing private compositions and progressions as public
-- so they show up in the Community
-- ============================================================================

-- Mark compositions as public
UPDATE compositions 
SET is_public = TRUE
WHERE is_public = FALSE;

-- Mark progressions as public  
UPDATE progressions 
SET is_public = TRUE
WHERE is_public = FALSE;

-- Verify the fix
SELECT 
    'compositions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count
FROM compositions
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) FILTER (WHERE is_public = TRUE) as public_count,
    COUNT(*) FILTER (WHERE is_public = FALSE) as private_count
FROM progressions;




