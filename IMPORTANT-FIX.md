# ⚠️ BELANGRIJK: Gebruik de CORRECTE Query!

## Het Probleem
Je gebruikt nog steeds de oude query met `user_metadata` → Dat bestaat niet!

## ✅ CORRECTE Query (Kopieer ALLES):

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

## 🔑 Belangrijk Verschil:

- ❌ **FOUT:** `user_metadata->>'role'`
- ✅ **CORRECT:** `raw_user_meta_data->>'role'`

**Kopieer de query hierboven en plak in SQL Editor!**

---

## Als Het Nog Steeds Fout Gaat:

1. **Verwijder ALLES** in de SQL Editor
2. **Kopieer ALLES** uit de query hierboven (vanaf `SELECT` tot `;`)
3. **Plak** in SQL Editor
4. **Run** de query

---

**De fout komt omdat je nog de oude query gebruikt. Gebruik de nieuwe met `raw_user_meta_data`!** 🎯




