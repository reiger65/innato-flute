# 🔍 Check Admin Account

## Direct in Supabase Dashboard

### STAP 1: Ga naar Authentication

1. Open: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users**
2. Of via: Dashboard → **Authentication** → **Users**

### STAP 2: Zoek Je Account

1. Zoek naar: `info@stonewhistle.com`
2. Klik op het account

### STAP 3: Check Deze Velden

**Moet zijn:**
- ✅ **Email:** `info@stonewhistle.com`
- ✅ **Email Confirmed:** ✅ **True** (niet False!)
- ✅ **User Metadata:**
  - `role`: `admin`
  - `username`: (optioneel)

**Als Email Confirmed = False:**
→ Dat is het probleem! Email moet bevestigd zijn.

---

## ✅ Snelle Fix via SQL Editor

### STAP 1: Open SQL Editor

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new**

### STAP 2: Run Deze Query

```sql
-- Check admin account status
SELECT 
  id,
  email,
  email_confirmed_at,
  user_metadata,
  created_at
FROM auth.users
WHERE email = 'info@stonewhistle.com';
```

**Wat je moet zien:**
- ✅ `email_confirmed_at` = **niet NULL** (een datum)
- ✅ `user_metadata` = `{"role": "admin"}` of bevat `"role": "admin"`

### STAP 3: Als Het Niet Klopt - Fix

**Als `email_confirmed_at` NULL is:**

```sql
-- Confirm email en set admin role
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  user_metadata = jsonb_build_object(
    'role', 'admin',
    'username', 'admin'
  )
WHERE email = 'info@stonewhistle.com';
```

**Run deze query** en check opnieuw.

---

## 🧪 Test Account Direct

### Via Supabase Dashboard

1. Ga naar: **Authentication** → **Users**
2. Klik op `info@stonewhistle.com`
3. Klik **"Reset Password"** (optioneel, om nieuwe wachtwoord te zetten)
4. Check **"User Metadata"** tab:
   - Moet bevatten: `{"role": "admin"}`

---

## 🔍 Check via App Console

Na het inladen van de app, open console en type:

```javascript
// Check if Supabase can connect
const supabase = window.__SUPABASE_CLIENT__ || null
if (supabase) {
  console.log('Supabase client found')
  // Try to get user
  supabase.auth.getUser().then(({data, error}) => {
    console.log('Current user:', data?.user)
    console.log('Error:', error)
  })
}
```

---

## ✅ Checklist

- [ ] Account bestaat in Supabase Auth
- [ ] Email is `info@stonewhistle.com`
- [ ] Email Confirmed = **True**
- [ ] User Metadata bevat `role: "admin"`
- [ ] Password is bekend: `InnatoAdmin2024!`
- [ ] Account kan inloggen via app

---

## 📝 Als Alles Klopt Maar Login Niet Werkt

Dan is het waarschijnlijk:
1. Environment variables (maar we hebben nu hardcoded fix)
2. Wachtwoord is verkeerd
3. App gebruikt verkeerde Supabase project

**Check wachtwoord:**
- Probeer eerst: `InnatoAdmin2024!`
- Of reset via Supabase Dashboard → Authentication → Users → Reset Password

---

**De makkelijkste check: Supabase Dashboard → Authentication → Users → zoek `info@stonewhistle.com`** 🎯


