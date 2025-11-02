# ✅ Login Gelukt! Nu Admin Role Checken

## Je Bent Ingelogd! 🎉

Nu moeten we controleren of je admin rechten hebt.

---

## ✅ Check Admin Role

### STAP 1: Run Deze Query in Supabase SQL Editor

```sql
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
```

**Check het resultaat:**
- Zie je `✅ ADMIN`? → Je hebt admin rechten! 🎉
- Zie je `❌ NOT ADMIN`? → Run de fix query hieronder

---

## ✅ Fix Admin Role (Als Nodig)

Als je `❌ NOT ADMIN` ziet, run dit:

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
  email, 
  email_confirmed_at, 
  raw_user_meta_data;
```

---

## ✅ Test Admin Functies

Na het instellen van admin role:

1. **Hard refresh** de app: `Cmd+Shift+R`
2. Check of je admin functies ziet:
   - **Manage Lessons** knop (in Lessons sectie)
   - **Add to Lessons** knop (in Composer)
3. Probeer een admin functie:
   - Ga naar **Lessons**
   - Klik **Manage Lessons** (als zichtbaar)
   - Je zou de admin modal moeten zien

---

## 🎯 Samenvatting

- ✅ Login werkt
- ⏳ Admin role checken
- ⏳ Admin functies testen

**Run de check query en deel het resultaat!** 🎯

