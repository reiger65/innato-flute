# 🔑 Reset Wachtwoord - Eenvoudige Methode

## Het Probleem
Het wachtwoord klopt niet. We moeten het resetten.

---

## ✅ Methode: Via Supabase Dashboard

### STAP 1: Open Authentication
1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users**
2. Zoek: `info@stonewhistle.com`
3. Klik op het account

### STAP 2: Reset Password
1. Scroll naar beneden in de user details
2. Klik **"Send Password Reset Email"** of **"Reset Password"**
3. Check je email inbox voor `info@stonewhistle.com`
4. Klik op de reset link in de email
5. Stel nieuw wachtwoord in: `InnatoAdmin2024!`

---

## ✅ ALTERNATIEF: Nieuw Account Aanmaken

Als je geen toegang hebt tot de email inbox:

### Via Supabase Dashboard:
1. Ga naar: **Authentication** → **Users**
2. Klik **"Add User"** of **"Invite User"**
3. Email: `info@stonewhistle.com`
4. Password: `InnatoAdmin2024!`
5. Auto Confirm: ✅ **Aan**
6. User Metadata: `{"role": "admin"}`
7. Create

**LET OP:** Als het account al bestaat, moet je het eerst verwijderen.

---

## ✅ ALTERNATIEF 2: Via App Sign Up

Als het account verwijderd is:

1. Ga naar: **https://innato-flute.vercel.app**
2. Klik **Login**
3. Klik **Sign Up** tab
4. Email: `info@stonewhistle.com`
5. Password: `InnatoAdmin2024!`
6. Sign Up
7. Dan run de fix query om admin role te zetten:
   ```sql
   UPDATE auth.users
   SET 
     raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
   WHERE email = 'info@stonewhistle.com';
   ```

---

## 🎯 Aanbeveling

**Probeer eerst:** Reset Password via Dashboard (STAP 2)

**Als dat niet werkt:** Maak een nieuw account via Sign Up, dan run de admin fix query.

**Wat werkt voor jou?** Laat het weten! 🎯





