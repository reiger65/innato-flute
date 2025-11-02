# 🔑 Admin Wachtwoord Resetten

## Optie 1: Via Supabase Dashboard (Aanbevolen)

1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users
2. Klik op het account: `info@stonewhistle.com`
3. Klik op **"Reset password"** of **"Send password reset email"**
4. Check je email voor de reset link
5. Reset het wachtwoord naar: `InnatoAdmin2024!`

## Optie 2: Wachtwoord Direct Aanpassen (via SQL - **Alleen voor Development**)

⚠️ **Let op:** Dit werkt alleen als je service_role key hebt.

Run dit SQL script in Supabase SQL Editor:

```sql
-- Reset password voor info@stonewhistle.com
-- Let op: Dit genereert een nieuw encrypted password
-- Gebruik liever de "Reset password" functie in het dashboard

-- Dit kan alleen via de Supabase Management API of Dashboard
-- SQL direct password reset is niet veilig en wordt niet ondersteund
```

**Aanbeveling:** Gebruik Optie 1 (Dashboard) voor wachtwoord reset.

## Optie 3: Nieuwe Wachtwoord Instellen (Via Dashboard)

1. Ga naar: Users → `info@stonewhistle.com`
2. Klik **"Edit user"** of **"..."** menu
3. Kies **"Reset password"**
4. Vul nieuw wachtwoord in: `InnatoAdmin2024!`
5. Save

## Test Daarna

1. Ga naar je online app
2. Log in met:
   - Email: `info@stonewhistle.com`
   - Password: `InnatoAdmin2024!`
3. Als het nog steeds niet werkt, check:
   - Browser console voor errors (F12)
   - Of email bevestigd is (zie `fix-admin-account.sql`)

