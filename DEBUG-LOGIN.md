# 🔍 Login Debugging

## Waarom lokaal wel werkt, maar online niet:

### Lokaal (localhost):
- ✅ Gebruikt **localStorage** voor authenticatie
- ✅ Je account staat in browser localStorage
- ✅ Geen Supabase nodig

### Online (Vercel):
- ❌ Gebruikt **Supabase** voor authenticatie
- ❌ Account moet bestaan in Supabase database
- ❌ Email moet bevestigd zijn (`email_confirmed_at`)

## Oplossing:

### Stap 1: Email Confirmation Uitschakelen (Aanbevolen voor Development)

1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/providers
2. Scroll naar **"Email"** provider
3. Zet **"Confirm email"** UIT (of check de checkbox)
4. **Save**

### Stap 2: Account Direct Bevestigen (Via SQL)

Run dit SQL in Supabase SQL Editor:

```sql
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('username', 'admin', 'role', 'admin'),
  updated_at = NOW()
WHERE email = 'info@stonewhistle.com';
```

### Stap 3: Testen

1. **Hard refresh** je online app (Ctrl+Shift+R of Cmd+Shift+R)
2. Open browser console (F12)
3. Probeer in te loggen
4. Check console voor logs:
   - `🔐 Login attempt started`
   - `🔍 signIn called...`
   - `✅ Login successful` of error

### Stap 4: Wachtwoord Resetten (Als nodig)

Als je niet zeker bent van het wachtwoord:

1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users
2. Klik op `info@stonewhistle.com`
3. Klik **"Reset password"**
4. Stel in op: `InnatoAdmin2024!`

## Debug Info:

Met de nieuwe logging zie je in de console:
- Of Supabase is geconfigureerd
- Of de signIn functie wordt aangeroepen
- Exact welke error optreedt
- Of het account bestaat en bevestigd is
