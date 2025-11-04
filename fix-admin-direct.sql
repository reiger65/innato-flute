-- Direct fix: Bevestig email en set admin role voor info@stonewhistle.com
-- Voer uit in: Supabase Dashboard → SQL Editor

-- Bevestig email en set admin metadata
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'username', 'admin',
      'role', 'admin'
    ),
  updated_at = NOW()
WHERE email = 'info@stonewhistle.com';

-- Verify
SELECT 
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'username' as username
FROM auth.users 
WHERE email = 'info@stonewhistle.com';





