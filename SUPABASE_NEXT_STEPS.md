# 🚀 Supabase Setup - Volgende Stappen

## ✅ Project Aangemaakt:
- **Organization:** Stonewhistle
- **Project Name:** Stonewhistle INNATO Explorations
- **Database Password:** Johannes@@==2025

---

## Stap 1: Credentials Ophalen (2 min)

1. In je Supabase dashboard:
   - Klik op **Settings** (⚙️ icoon linksonder)
   - Klik op **API** in het menu

2. **Kopieer deze twee waarden:**
   - **Project URL** (bijv. `https://abcdefgh.supabase.co`)
   - **anon public** key (lang token, begint met `eyJ...`)

3. **Plak ze hieronder in het formulier** of maak handmatig `.env.local` aan

---

## Stap 2: Environment Variables Instellen

### Option A: Automatisch (Aanbevolen)

Run dit commando en volg de instructies:
```bash
./setup-supabase.sh
```

### Option B: Handmatig

Maak bestand `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Stap 3: Database Schema Migreren (1 min)

1. In Supabase dashboard → **SQL Editor** (links in menu)
2. Klik **"New Query"**
3. Open bestand: `migrations/001_initial_schema.sql`
4. **Selecteer ALLES** (Cmd+A)
5. **Kopieer** (Cmd+C)
6. **Plak** in SQL Editor (Cmd+V)
7. **Klik "Run"** (of Ctrl+Enter / Cmd+Enter)
8. ✅ **Verwacht:** "Success. No rows returned"

---

## Stap 4: Testen

```bash
npm run dev
```

**Check browser console:**
- ✅ **Geen warning** = Supabase werkt!
- ⚠️ **"Supabase not configured"** = Check `.env.local`

---

## Stap 5: Vercel Environment Variables

1. Ga naar: **Vercel Dashboard** → Je project
2. **Settings** → **Environment Variables**
3. **Voeg toe:**
   - `VITE_SUPABASE_URL` = (je Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` = (je Supabase anon key)
4. **Klik "Save"**
5. **Redeploy:** Push nieuwe code of klik "Redeploy"

---

## ✅ Klaar!

Na deze stappen:
- ✅ App gebruikt Supabase voor data
- ✅ Data synct tussen devices
- ✅ Community features werken online
- ✅ localStorage blijft als fallback

---

## 🔍 Verificatie

### Check Supabase Dashboard:
1. **Table Editor** → Zie je tabellen: `compositions`, `progressions`, etc.
2. **Authentication** → Zie je users (na login)
3. **SQL Editor** → Query werkt

### Check App:
1. Browser console → Geen errors
2. Maak composition → Sla op → Check Supabase → Data staat er!

---

**Geef me de Supabase URL en anon key, dan maak ik `.env.local` voor je!**

