-- Quick check: Is admin account correctly configured?
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new

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
  user_metadata,
  created_at
FROM auth.users
WHERE email = 'info@stonewhistle.com';

-- If email_confirmed_at is NULL or role is not 'admin', run the fix below:

-- FIX: Confirm email and set admin role
/*
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  user_metadata = jsonb_build_object(
    'role', 'admin',
    'username', COALESCE(user_metadata->>'username', 'admin')
  ) || COALESCE(user_metadata, '{}'::jsonb)
WHERE email = 'info@stonewhistle.com'
RETURNING id, email, email_confirmed_at, user_metadata;
*/




