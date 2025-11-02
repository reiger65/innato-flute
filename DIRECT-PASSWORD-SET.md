# 🔑 Direct Wachtwoord Instellen (Zonder Email Redirect)

## Het Probleem
Email redirect werkt niet, blijft naar localhost:3000 gaan.

---

## ✅ Oplossing: Nieuw Account via Sign Up

**We maken een nieuw account in de app, dan zetten we admin role via SQL.**

### STAP 1: Verwijder Oud Account (Als Nodig)

Als het oude account problemen geeft:

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users**
2. Zoek: `info@stonewhistle.com`
3. Klik **⋯** (drie puntjes) → **Delete User**
4. Bevestig verwijdering

### STAP 2: Maak Nieuw Account in App

1. Ga naar: **https://innato-flute.vercel.app**
2. Klik **Login** knop
3. Klik **Sign Up** tab
4. Vul in:
   - **Email:** `info@stonewhistle.com`
   - **Password:** `InnatoAdmin2024!`
   - **Username:** (optioneel) `admin`
5. Klik **Sign Up**

### STAP 3: Bevestig Email (Als Nodig)

Als Supabase email confirmation vraagt:
- Check email inbox voor `info@stonewhistle.com`
- Klik confirmatie link
- OF: Bevestig direct via SQL (zie STAP 4)

### STAP 4: Zet Admin Role via SQL

Run dit in Supabase SQL Editor:

```sql
-- Bevestig email en zet admin role
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

### STAP 5: Test Login

1. Ga naar app: **https://innato-flute.vercel.app**
2. Log in met:
   - Email: `info@stonewhistle.com`
   - Password: `InnatoAdmin2024!`

**Het zou nu moeten werken!** ✅

---

## ✅ Alternatief: Gebruik Andere Email

Als `info@stonewhistle.com` teveel problemen geeft:

1. Maak account met andere email (bijv. `admin@stonewhistle.com`)
2. Zet admin role via SQL
3. Log in met nieuwe email

**Dan werkt het gegarandeerd!** 🎯


