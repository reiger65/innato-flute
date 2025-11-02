# 🚀 Complete Supabase Setup - Stap voor Stap

## ⚡ Snel (5 minuten)

### Stap 1: Supabase Project Aanmaken (2 min)

1. **Ga naar:** https://supabase.com/dashboard
2. **Klik:** "New Project"
3. **Vul in:**
   - Organization: Kies of maak nieuw
   - Name: `innato-flute` of `stonewhistle-innato`
   - Database Password: **Genereer sterk wachtwoord** (sla op!)
   - Region: **Europe (West)** ← Belangrijk voor GDPR
   - Plan: **Free tier** (gratis)
4. **Klik:** "Create new project"
5. **Wacht:** 2-3 minuten tot project klaar is

---

### Stap 2: Credentials Kopiëren (30 sec)

1. In Supabase dashboard → **Settings** (⚙️ icoon linksonder)
2. **API** sectie
3. **Kopieer:**
   - **Project URL** (bijv. `https://abcdefgh.supabase.co`)
   - **anon public** key (lang token, begint met `eyJ...`)

---

### Stap 3: Environment Variables Instellen (1 min)

**Lokaal (.env.local):**

Maak bestand `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**OF gebruik het script:**
```bash
./setup-supabase.sh
```
→ Plak URL en key wanneer gevraagd

**Online (Vercel):**

1. Ga naar: **Vercel Dashboard** → Je project
2. **Settings** → **Environment Variables**
3. **Voeg toe:**
   - `VITE_SUPABASE_URL` = (je URL)
   - `VITE_SUPABASE_ANON_KEY` = (je key)
4. **Klik:** "Save"
5. **Redeploy:** Push nieuwe code (of klik "Redeploy")

---

### Stap 4: Database Schema Migreren (1 min)

1. In Supabase dashboard → **SQL Editor** (links in menu)
2. **Klik:** "New Query"
3. **Open bestand:** `migrations/001_initial_schema.sql`
4. **Selecteer ALLES** (Cmd+A)
5. **Kopieer** (Cmd+C)
6. **Plak** in SQL Editor (Cmd+V)
7. **Klik:** "Run" (of Ctrl+Enter / Cmd+Enter)
8. ✅ **Verwacht:** "Success. No rows returned"

**Klaar!** Database is nu klaar.

---

### Stap 5: Testen (30 sec)

```bash
npm run dev
```

**Check:**
- Open browser console (F12)
- **Geen warning** = Supabase werkt! ✅
- **"Supabase not configured"** = Check `.env.local`

**Test:**
- Login/Signup
- Maak een composition en sla op
- Check Supabase dashboard → Table Editor → `compositions` → Je data staat er!

---

## ✅ Wat is Nu Actief?

### Met Supabase:
- ✅ **Compositions** → Supabase database
- ✅ **Progressions** → Supabase database  
- ✅ **Lessons** → Supabase database (later)
- ✅ **Auth** → Supabase auth
- ✅ **Community** → Supabase database
- ✅ **Favorites** → Supabase database

### Automatische Fallback:
- Als Supabase niet werkt → localStorage
- Als niet ingelogd → localStorage
- Offline mode → localStorage

**Alles werkt altijd!** 🎉

---

## 🔍 Verificatie

### Check Supabase Dashboard:
1. **Table Editor** → Zie je tabellen: `compositions`, `progressions`, etc.
2. **Authentication** → Zie je users
3. **SQL Editor** → Query werkt

### Check App:
1. Browser console → Geen errors
2. Maak composition → Sla op → Check Supabase → Data staat er!
3. Login → Check Supabase → User staat er!

---

## 🚨 Troubleshooting

### "Supabase not configured"
→ Check `.env.local` bestaat
→ Check variabelen correct gespeld
→ Restart dev server: `npm run dev`

### SQL Errors bij migratie
→ Check of je **hele** schema hebt gekopieerd
→ Check of project volledig opgestart is (wacht 2-3 min)
→ Check errors in SQL Editor voor details

### App werkt niet
→ App werkt ook zonder Supabase (localStorage)
→ Check browser console voor specifieke errors
→ Check Supabase dashboard → Logs

### Data verschijnt niet in Supabase
→ Check of je ingelogd bent in de app
→ Check `user_id` in database rows (moet je user ID zijn)
→ Check RLS policies (moet correct zijn)

---

## 📝 Belangrijk

✅ **Backup:** localStorage data blijft behouden
✅ **Offline:** App werkt altijd (met of zonder Supabase)
✅ **Veiligheid:** RLS policies beschermen je data
✅ **Free tier:** Genoeg voor start (500MB database)

---

## 🎯 Volgende Stappen

Na setup:
1. Test de app → Alles werkt?
2. Check Supabase dashboard → Data komt binnen?
3. Deploy naar Vercel → Environment variables ingesteld?

**Klaar!** 🚀

