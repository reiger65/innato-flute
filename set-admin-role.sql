-- ============================================================================
-- SET ADMIN ROLE - Run dit na Sign Up
-- ============================================================================

-- Bevestig email en zet admin role voor nieuwe account
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'username', COALESCE(raw_user_meta_data->>'username', 'admin')
  )
WHERE email = 'info@stonewhistle.com'
RETURNING 
  email, 
  email_confirmed_at, 
  raw_user_meta_data;

-- Verify
SELECT 
  email,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN '✅ CONFIRMED' 
    ELSE '❌ NOT CONFIRMED' 
  END as email_status,
  CASE 
    WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ ADMIN' 
    ELSE '❌ NOT ADMIN' 
  END as role_status
FROM auth.users
WHERE email = 'info@stonewhistle.com';
