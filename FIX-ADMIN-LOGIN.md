# 🔐 Admin Login Fix - Stap voor Stap

## Probleem
Supabase vereist standaard **email confirmation** voor nieuwe accounts. Je kunt pas inloggen na email bevestiging.

## Oplossing 1: Email Confirmation Uitschakelen (Snelste)

1. **Ga naar Supabase Dashboard:**
   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/providers

2. **Scroll naar beneden naar "Email Auth"**
3. **Zet uit:** ✅ "Enable email confirmations"
4. **Klik "Save"**

5. **Maak nu account aan via de app:**
   - Open je app (lokaal of online)
   - Login button → **Sign Up** tab
   - Email: `info@stonewhistle.com`
   - Password: `InnatoAdmin2024!`
   - Klik "Create Account"
   - Je bent direct ingelogd! ✅

---

## Oplossing 2: Account Direct Aanmaken in Dashboard

1. **Ga naar:**
   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users

2. **Klik "Add user" → "Create new user"**

3. **Vul in:**
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`
   - **Auto Confirm User**: ✅ **AANZETTEN** (belangrijk!)
   - **Send invite email**: ❌ UIT

4. **Klik "Create User"**

5. **Nu kun je inloggen in de app:**
   - Email: `info@stonewhistle.com`
   - Password: `InnatoAdmin2024!`

---

## Oplossing 3: Via Browser Console (Geavanceerd)

Als je al een account hebt aangemaakt maar niet bevestigd:

1. Open Supabase Dashboard → SQL Editor
2. Voer uit:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'info@stonewhistle.com';
```

---

## Testen

Na account aanmaken:
1. Log in met `info@stonewhistle.com` / `InnatoAdmin2024!`
2. Je zou moeten zien:
   - "Manage Lessons" button (in Lessons sectie)
   - "Add to Lessons" button (in Composer)
   - Admin functies actief

---

**Ik raad Oplossing 2 aan** - direct via Dashboard met "Auto Confirm" aan. Dan werkt het meteen!





