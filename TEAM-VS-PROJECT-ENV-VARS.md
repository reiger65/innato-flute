# ⚠️ Team vs Project Environment Variables

## Het Probleem

Je hebt de env vars toegevoegd, maar ze werken niet. Dit komt waarschijnlijk omdat:
- Ze zijn toegevoegd op **Team level** (met "Search for a Project to link to...")
- Maar ze zijn **NIET gekoppeld** aan je specifieke project

## Oplossing: Gebruik Project-Level Env Vars

### Optie 1: Via Dashboard (Aanbevolen)

**Belangrijk:** Ga naar **Project Settings**, NIET Team Settings!

1. Ga naar: https://vercel.com/dashboard
2. Klik op je **project** (innato-flute)
3. Klik **Settings** (van het PROJECT, niet van het team!)
4. Klik **Environment Variables**
5. Check: Staat er een lijst met env vars? (zou moeten)
6. Zie je `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` hier?
   - **Ja** → Check of "Production" is aangezet → Redeploy
   - **Nee** → Voeg ze hier toe (project-level!)

### Optie 2: Via CLI (Sneller & Betrouwbaarder)

Ik heb een script gemaakt: `fix-env-vars-via-cli.sh`

Run dit:
```bash
cd /Users/hanshoukes/Desktop/innato-flute
./fix-env-vars-via-cli.sh
```

Dit zal:
- Bestaande env vars verwijderen
- Nieuwe toevoegen voor alle environments
- Direct aan het project koppelen (geen team-level issues)

**Daarna:** Redeploy via dashboard OF run `vercel --prod`

---

## Verschil Team vs Project

**Team Level:**
- Zichtbaar in Team Settings → Environment Variables
- Moet handmatig gekoppeld worden aan projecten
- Kan problemen geven

**Project Level:**
- Zichtbaar in Project Settings → Environment Variables
- Automatisch gekoppeld aan dat project
- Werkt altijd

**Gebruik altijd Project Level voor dit soort configuratie!**

---

## Check Of Het Werkt

Na redeploy, in browser console:
```javascript
import.meta.env.VITE_SUPABASE_URL
```

- Als `undefined` → Nog steeds niet goed
- Als `"https://gkdzcdzgrlnkufqgfizj.supabase.co"` → Werkt! ✅

