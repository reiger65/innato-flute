-- SQL script om admin account direct aan te maken in Supabase
-- Voer dit uit in: Supabase Dashboard → SQL Editor
-- OF via Supabase CLI

-- Let op: Dit werkt alleen als email confirmation is uitgeschakeld
-- Of gebruik de Auth UI om het account aan te maken

-- Check of user al bestaat
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'info@stonewhistle.com';

-- Als de user bestaat maar niet bevestigd is, bevestig dan:
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW() 
-- WHERE email = 'info@stonewhistle.com';

-- Voor het aanmaken: gebruik de Supabase Dashboard UI
-- Authentication → Users → Add user → Create new user





