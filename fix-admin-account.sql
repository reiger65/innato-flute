-- Fix admin account: info@stonewhistle.com
-- Voer uit in: Supabase Dashboard → SQL Editor

-- 1. Check huidige status
SELECT 
  id,
  email,
  email_confirmed_at,
  encrypted_password IS NOT NULL as has_password,
  raw_user_meta_data,
  created_at
FROM auth.users 
WHERE email = 'info@stonewhistle.com';

-- 2. Bevestig email en update metadata voor admin
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'username', 'admin',
      'role', 'admin'
    ),
  updated_at = NOW()
WHERE email = 'info@stonewhistle.com';

-- 3. Verify update
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data,
  created_at
FROM auth.users 
WHERE email = 'info@stonewhistle.com';

