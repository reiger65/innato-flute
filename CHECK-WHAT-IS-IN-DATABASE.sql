-- Check what's actually in Supabase
-- Run this in Supabase SQL Editor

-- Check compositions
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at,
    updated_at
FROM compositions
ORDER BY created_at DESC
LIMIT 10;

-- Check progressions
SELECT 
    id,
    name,
    is_public,
    user_id,
    created_at,
    updated_at
FROM progressions
ORDER BY created_at DESC
LIMIT 10;

-- Count public vs private
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



