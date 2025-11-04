-- ============================================================================
-- FIX ADMIN ACCOUNT - Run dit als de check query ❌ toont
-- ============================================================================

-- 1. Check eerst de status
SELECT 
  id,
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED' 
    ELSE '❌ NOT CONFIRMED' 
  END as email_status,
  CASE 
    WHEN user_metadata->>'role' = 'admin' THEN '✅ ADMIN' 
    ELSE '❌ NOT ADMIN' 
  END as role_status,
  user_metadata
FROM auth.users
WHERE email = 'info@stonewhistle.com';

-- 2. Als bovenstaande ❌ toont, run dit om te fixen:
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  user_metadata = COALESCE(user_metadata, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'username', COALESCE(user_metadata->>'username', 'admin')
  )
WHERE email = 'info@stonewhistle.com'
RETURNING 
  id, 
  email, 
  email_confirmed_at, 
  user_metadata;

-- 3. Check opnieuw (moet nu ✅ tonen)
SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED' 
    ELSE '❌ NOT CONFIRMED' 
  END as email_status,
  CASE 
    WHEN user_metadata->>'role' = 'admin' THEN '✅ ADMIN' 
    ELSE '❌ NOT ADMIN' 
  END as role_status
FROM auth.users
WHERE email = 'info@stonewhistle.com';





