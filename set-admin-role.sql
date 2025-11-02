-- Script om admin role toe te voegen aan info@stonewhistle.com
-- Voer uit in: Supabase Dashboard → SQL Editor

-- Check of user bestaat
SELECT id, email, email_confirmed_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'info@stonewhistle.com';

-- Update admin metadata (als account al bestaat)
UPDATE auth.users 
SET 
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object(
    'username', 'admin',
    'role', 'admin'
  ),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'info@stonewhistle.com';

-- Verify update
SELECT id, email, email_confirmed_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'info@stonewhistle.com';

