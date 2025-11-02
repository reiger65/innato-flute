# ⚡ Quick Fix Admin Account

## Als de Check Query Dit Toont:

### ❌ NOT CONFIRMED of ❌ NOT ADMIN

**Run deze fix (kopieer en plak in SQL Editor):**

```sql
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  user_metadata = COALESCE(user_metadata, '{}'::jsonb) || jsonb_build_object(
    'role', 'admin',
    'username', COALESCE(user_metadata->>'username', 'admin')
  )
WHERE email = 'info@stonewhistle.com'
RETURNING 
  id, 
  email, 
  email_confirmed_at, 
  user_metadata;
```

**Na het runnen:**
- Je zou moeten zien: `email_confirmed_at` heeft nu een datum
- Je zou moeten zien: `user_metadata` bevat nu `{"role": "admin"}`

**Test daarna:**
- Ga naar de app: https://innato-flute.vercel.app
- Probeer in te loggen met:
  - Email: `info@stonewhistle.com`
  - Password: `InnatoAdmin2024!`

---

## Als de Check Query Dit Toont:

### ✅ CONFIRMED en ✅ ADMIN

**Dan klopt alles!** Het probleem is niet het account, maar iets anders:
- Environment variables (maar we hebben hardcoded fix)
- Wachtwoord is verkeerd
- App gebruikt verkeerde Supabase project

**Test login met:**
- Email: `info@stonewhistle.com`
- Password: `InnatoAdmin2024!`

**Als het nog steeds niet werkt:**
- Reset wachtwoord via Supabase Dashboard → Authentication → Users → Reset Password

---

**Deel het resultaat van de check query, dan help ik verder!** 🎯
