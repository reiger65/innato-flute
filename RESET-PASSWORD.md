# 🔑 Reset Wachtwoord voor Admin Account

## Het Probleem
Supabase werkt, maar het wachtwoord klopt niet. We moeten het wachtwoord resetten.

---

## ✅ Optie 1: Via Supabase Dashboard (Eenvoudig)

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users**
2. Zoek: `info@stonewhistle.com`
3. Klik op het account
4. Klik **"Reset Password"** knop
5. Check je email (`info@stonewhistle.com`) voor reset link
6. Klik op de link in email
7. Stel nieuw wachtwoord in: `InnatoAdmin2024!`

**Probleem:** Je moet toegang hebben tot de email inbox van `info@stonewhistle.com`

---

## ✅ Optie 2: Via SQL (Direct - Geen Email Nodig)

**Run dit in Supabase SQL Editor:**

```sql
-- Reset password directly (geen email nodig)
-- Dit zet het wachtwoord direct naar: InnatoAdmin2024!
-- Je kunt direct inloggen zonder email reset

UPDATE auth.users
SET 
  encrypted_password = crypt('InnatoAdmin2024!', gen_salt('bf'))
WHERE email = 'info@stonewhistle.com';

-- Verify
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'info@stonewhistle.com';
```

**WAARSCHUWING:** Dit werkt alleen als de `crypt` functie beschikbaar is. Als dit niet werkt, gebruik Optie 3.

---

## ✅ Optie 3: Via Admin API (Meest Betrouwbaar)

Ik maak een script dat het wachtwoord direct reset via Supabase Admin API.

---

## 🎯 Aanbeveling

**Gebruik Optie 1** als je toegang hebt tot de email inbox.

**Gebruik Optie 3** als je geen email toegang hebt (ik maak het script).

---

**Welke optie wil je proberen?** Of maak ik het Admin API script voor je?

