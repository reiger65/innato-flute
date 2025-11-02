-- ============================================================================
-- SAFE CHECK: View Current Policies First (Non-destructive)
-- ============================================================================
-- Run this first to see what policies exist before changing them
-- ============================================================================

-- Check current compositions policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'compositions';

-- Check current progressions policies  
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'progressions';

-- Check current public items count
SELECT 
    'compositions' as table_name,
    COUNT(*) as public_count
FROM compositions 
WHERE is_public = TRUE
UNION ALL
SELECT 
    'progressions' as table_name,
    COUNT(*) as public_count
FROM progressions 
WHERE is_public = TRUE;

