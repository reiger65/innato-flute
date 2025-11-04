# 🚀 Quick Start: Supabase Setup in 5 Minuten

## Stap 1: Supabase Account en Project (2 min)

1. Ga naar **https://supabase.com**
2. Klik **"Start your project"** of **"Sign in"**
3. Maak account aan (of log in met GitHub)
4. Klik **"New Project"**
5. Vul in:
   - **Name:** `innato-flute`
   - **Database Password:** Genereer een sterk wachtwoord (sla op!)
   - **Region:** **Europe (West)** ← Belangrijk voor GDPR
   - **Pricing Plan:** Free (gratis tier)
6. Klik **"Create new project"**
7. ⏳ Wacht 2-3 minuten tot het project klaar is

---

## Stap 2: Credentials Kopiëren (1 min)

1. In je Supabase dashboard, klik op het **⚙️ tandwiel icoon** (linksonder)
2. Klik op **"API"** in het menu
3. Je ziet twee belangrijke waarden:
   - **Project URL** (bijv. `https://abcdefgh.supabase.co`)
   - **anon public** key (lang token, begint met `eyJ...`)
4. **Kopieer beide** naar je klembord

---

## Stap 3: Automatisch Setup (30 sec)

Run dit commando in de terminal:

```bash
cd /Users/hanshoukes/Desktop/innato-flute
./setup-supabase.sh
```

Het script vraagt je om:
- Je Supabase URL (plak vanuit klembord)
- Je Supabase anon key (plak vanuit klembord)

Dit maakt automatisch `.env.local` aan met je credentials.

**OF handmatig:**

Maak bestand `.env.local` aan in de project root:
```env
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Stap 4: Database Schema Uitvoeren (1 min)

1. In Supabase dashboard, klik **"SQL Editor"** (links in menu)
2. Klik **"New Query"**
3. Open het bestand: `SUPABASE_SCHEMA.sql` (in project root)
4. **Selecteer ALLES** (Cmd+A) en **kopieer** (Cmd+C)
5. **Plak** in de SQL Editor (Cmd+V)
6. Klik **"Run"** (of druk Ctrl+Enter / Cmd+Enter)
7. ✅ Je zou moeten zien: **"Success. No rows returned"**

**Klaar!** Database is nu klaar.

---

## Stap 5: Testen (30 sec)

```bash
npm run dev
```

Open de app en test:
- Login/Signup
- Een composition maken en opslaan
- Community features

---

## ❓ Problemen?

### "Supabase not configured" in console?
→ Check of `.env.local` bestaat en correct is

### SQL Editor geeft errors?
→ Check of je het hele `SUPABASE_SCHEMA.sql` bestand hebt gekopieerd
→ Check of je project volledig is opgestart (kan 2-3 min duren)

### App werkt niet?
→ De app werkt ook zonder Supabase (localStorage mode)
→ Supabase is optioneel voor online features

---

## 📝 Belangrijk

- **Geen Supabase?** Geen probleem! De app werkt gewoon met localStorage
- **Offline mode:** Volledig functioneel, alleen geen community features
- **Online mode:** Met Supabase krijg je community features en data sync

---

## 🎯 Wat werkt nu?

✅ **Zonder Supabase:**
- Alle composer features
- Lessons (lokaal)
- Progressions (lokaal)
- Compositions (lokaal)

✅ **Met Supabase:**
- Alles hierboven PLUS:
- Community sharing
- Data sync tussen devices
- Cloud backups

---

## 📞 Hulp nodig?

Als je vastloopt bij een specifieke stap, laat het weten en ik help je verder!





