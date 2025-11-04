# 🔐 Admin Login Fix

## Het Probleem
Je app gebruikt nu Supabase voor authenticatie, maar het admin account bestaat nog niet in Supabase.

## Oplossing 1: Via de App (Aanbevolen)
1. Open je app (lokaal of online)
2. Klik op de login button (rechtsboven)
3. Ga naar **"Sign Up"** tab
4. Vul in:
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`
   - **Username**: `admin` (optioneel)
5. Klik op **"Create Account"**
6. Na aanmaken, log uit en log weer in met dezelfde gegevens

## Oplossing 2: Via HTML Helper
Er is een HTML bestand aangemaakt: `create-admin-account.html`
- Open dit bestand in je browser
- Klik op "Maak Admin Account Aan"
- Probeer daarna in te loggen in de app

## Oplossing 3: Direct in Supabase Dashboard
1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users
2. Klik op **"Add User"** → **"Create new user"**
3. Vul in:
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`
   - **Auto Confirm User**: ✅ (aanzetten)
4. Klik op **"Create User"**
5. Ga naar **"Metadata"** tab
6. Voeg toe: `role: "admin"`

## Na Account Aanmaken
Log in met:
- **Email**: `info@stonewhistle.com`
- **Password**: `InnatoAdmin2024!`

Je zou nu admin functies moeten zien (zoals "Manage Lessons" button).





