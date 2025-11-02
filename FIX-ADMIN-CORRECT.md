# ✅ CORRECTE Admin Check Query

## Het Probleem
Supabase gebruikt `raw_user_meta_data`, niet `user_metadata`!

---

## ✅ CORRECTE Check Query

**Run dit in Supabase SQL Editor:**

```sql
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
```

**Kijk naar het resultaat!**

---

## ✅ CORRECTE Fix Query (als ❌ toont)

```sql
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
```

---

## 📝 Belangrijk

In Supabase:
- ✅ Gebruik: `raw_user_meta_data`
- ❌ NIET: `user_metadata`

Run de check query en deel het resultaat! 🎯
