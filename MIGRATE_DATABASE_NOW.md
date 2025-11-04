# 🚀 Database Schema Migreren - NU!

## ✅ Environment Variables: Klaar!
- `.env.local` is aangemaakt met je Supabase credentials

---

## 📋 Stap: Database Schema Uitvoeren (2 min)

### Stap 1: Open SQL Editor
1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new
2. Of: Dashboard → **SQL Editor** (links) → **New Query**

### Stap 2: Kopieer Schema
1. Open bestand: `migrations/001_initial_schema.sql`
2. **Selecteer ALLES** (Cmd+A)
3. **Kopieer** (Cmd+C)

### Stap 3: Plak en Run
1. **Plak** in SQL Editor (Cmd+V)
2. **Klik "Run"** (of Ctrl+Enter / Cmd+Enter)
3. ⏳ Wacht 5-10 seconden
4. ✅ **Verwacht:** "Success. No rows returned" (of soortgelijk succesbericht)

### Stap 4: Verifieer
1. In Supabase Dashboard → **Table Editor**
2. Je zou moeten zien:
   - ✅ `compositions`
   - ✅ `progressions`
   - ✅ `lessons`
   - ✅ `user_progress`
   - ✅ `favorites`
   - ✅ `shared_items`
   - ✅ `shared_item_favorites`

---

## ✅ Na Migratie:

### Test Lokaal:
```bash
npm run dev
```

**Check browser console:**
- ✅ **Geen "Supabase not configured" warning** = Werkt!
- ✅ **Geen errors** = Alles OK!

### Test Database:
1. Maak een composition in de app
2. Sla op
3. Check Supabase Dashboard → Table Editor → `compositions`
4. Je data zou daar moeten staan!

---

## 🎯 Volgende: Vercel Environment Variables

Zodra database werkt lokaal:
1. Ga naar: **Vercel Dashboard** → Je project
2. **Settings** → **Environment Variables**
3. **Voeg toe:**
   - `VITE_SUPABASE_URL` = `https://gkdzcdzgrlnkufqgfizj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
4. **Save** → **Redeploy**

---

## 🚨 Troubleshooting

### SQL Errors?
- Check of je **hele** schema hebt gekopieerd
- Check of project volledig is opgestart (kan 2-3 min duren)
- Check errors in SQL Editor voor details

### App werkt niet?
- Check `.env.local` bestaat
- Check variabelen correct gespeld
- Restart dev server: `npm run dev`

---

**Laat weten wanneer schema is gemigreerd, dan testen we alles!** 🎉





