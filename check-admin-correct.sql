-- ============================================================================
-- CORRECT: Check Admin Account Status
-- ============================================================================
-- In Supabase gebruikt auth.users raw_user_meta_data, niet user_metadata!

SELECT 
  id,
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED' 
    ELSE '❌ NOT CONFIRMED' 
  END as email_status,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ ADMIN' 
    ELSE '❌ NOT ADMIN' 
  END as role_status,
  raw_user_meta_data,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'info@stonewhistle.com';

-- ============================================================================
-- FIX: Als het ❌ toont, run dit:
-- ============================================================================

UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'username', COALESCE(raw_user_meta_data->>'username', 'admin')
  )
WHERE email = 'info@stonewhistle.com'
RETURNING 
  id, 
  email, 
  email_confirmed_at, 
  raw_user_meta_data;

-- ============================================================================
-- Check opnieuw na fix:
-- ============================================================================

SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED' 
    ELSE '❌ NOT CONFIRMED' 
  END as email_status,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ ADMIN' 
    ELSE '❌ NOT ADMIN' 
  END as role_status,
  raw_user_meta_data
FROM auth.users
WHERE email = 'info@stonewhistle.com';





