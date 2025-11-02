-- ============================================================================
-- ✅ CORRECTE QUERY - Kopieer ALLES hieronder en plak in SQL Editor
-- ============================================================================
-- BELANGRIJK: Gebruik raw_user_meta_data, NIET user_metadata!

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
  email_confirmed_at
FROM auth.users
WHERE email = 'info@stonewhistle.com';


