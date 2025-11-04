# Supabase Setup Instructies

## Stap 1: Supabase Project Aanmaken

1. Ga naar https://supabase.com
2. Maak een account aan (of log in)
3. Klik op "New Project"
4. Vul in:
   - **Organization:** Kies of maak een nieuwe organization
   - **Name:** `innato-flute` of `stonewhistle-innato`
   - **Database Password:** Genereer een sterk wachtwoord (sla dit op!)
   - **Region:** Kies **Europe (West)** voor GDPR compliance
   - **Pricing Plan:** Free tier is voldoende voor start

5. Klik op "Create new project"
6. Wacht tot het project is aangemaakt (2-3 minuten)

## Stap 2: Supabase Credentials Ophalen

1. In je Supabase project dashboard, ga naar **Settings** (tandwiel icoon)
2. Ga naar **API** sectie
3. Kopieer:
   - **Project URL** (bijv. `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (de `anon` key, niet de `service_role` key!)

4. Maak `.env.local` bestand aan in de project root:
   ```bash
   cp .env.example .env.local
   ```

5. Plak de credentials in `.env.local`:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Stap 3: Database Schema Maken

Zie `SUPABASE_SCHEMA.sql` voor de complete database schema.
Voer dit SQL script uit in de Supabase SQL Editor.

### Database Tabellen:

1. **compositions** - Opgeslagen compositions
2. **progressions** - Opgeslagen progressions
3. **lessons** - Lesson definities
4. **user_progress** - Lesson completion tracking
5. **favorites** - Favoriete chords
6. **shared_items** - Gedeelde items in community
7. **shared_item_favorites** - Favorieten voor gedeelde items

## Stap 4: Row Level Security (RLS) Policies

De RLS policies staan ook in `SUPABASE_SCHEMA.sql`. Deze zorgen ervoor dat:
- Users alleen hun eigen data kunnen lezen/schrijven
- Public/shared items leesbaar zijn voor iedereen
- Admins toegang hebben tot alle data
- Community features veilig werken

## Stap 5: Testen

1. Installeer Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Test de verbinding:
   ```bash
   npm run dev
   ```

3. Controleer de browser console voor errors

## Veiligheid

⚠️ **BELANGRIJK:**
- De `anon` key is veilig om in de frontend te gebruiken (heeft alleen toegang via RLS)
- De `service_role` key **NOOIT** in de frontend plaatsen!
- `.env.local` staat in `.gitignore` en wordt niet gecommit





