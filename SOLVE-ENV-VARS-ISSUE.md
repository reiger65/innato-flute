# 🔧 Environment Variables Oplossen - Stap voor Stap

## Het Probleem
Je hebt ze al 2x toegevoegd, maar ze werken nog steeds niet.

## Waarschijnlijke Oorzaken

### 1. ❌ Ze Zijn Op Team Level, Niet Project Level

**Symptoom:** Je ziet "Search for a Project to link to..." in de screenshot

**Fix:**
1. In de screenshot, bij elke env var:
   - Check of "innato-flute" project staat bij "Linked to Projects"
   - Als NIET → Klik op de env var → Link to Projects → Selecteer "innato-flute"
2. OF gebruik Project Settings:
   - Ga naar Project → Settings → Environment Variables (NIET Team Settings!)
   - Voeg ze daar toe

### 2. ⚠️ Geen Redeploy Na Toevoegen

**Symptoom:** Env vars staan er, maar app toont nog steeds "MISSING"

**Fix:**
1. Ga naar **Deployments** tab
2. Klik **⋯** → **Redeploy**
3. Wacht 1-2 minuten
4. Hard refresh pagina

### 3. 🔄 Verkeerde Environment

**Symptoom:** Env vars zijn alleen voor Development, niet Production

**Fix:**
- Bij elke env var: Check dat "Production" is aangezet ✅

---

## ✅ BESTE OPLOSSING: Via Dashboard (Project Level)

**Stap 1:** Open Project Settings
- Ga naar: https://vercel.com/dashboard
- Klik op **innato-flute** (het project, niet team)
- Klik **Settings** → **Environment Variables**

**Stap 2:** Check
- Zijn `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` hier zichtbaar?
- Als NEE → Voeg ze hier toe (project-level, niet team-level!)

**Stap 3:** Verwijder & Voeg Opnieuw Toe
- Verwijder beide env vars
- Voeg ze opnieuw toe:
  - Key: `VITE_SUPABASE_URL`
  - Value: `https://gkdzcdzgrlnkufqgfizj.supabase.co`
  - Environments: ✅ Production, ✅ Preview, ✅ Development
  - Save
- Herhaal voor `VITE_SUPABASE_ANON_KEY`

**Stap 4:** Redeploy
- Deployments → ⋯ → Redeploy

---

## ✅ ALTERNATIEF: Via CLI (Als Dashboard Niet Werkt)

```bash
cd /Users/hanshoukes/Desktop/innato-flute

# Login eerst
vercel login

# Run script
./fix-env-vars-via-cli.sh
```

---

## 🧪 Test

Na redeploy:
1. Hard refresh (Ctrl+Shift+R)
2. Check console: `import.meta.env.VITE_SUPABASE_URL`
3. Moet tonen: `"https://gkdzcdzgrlnkufqgfizj.supabase.co"`
4. Als `undefined` → Nog steeds niet goed → Check build logs

---

## 📋 Deel Wat Je Ziet

Beschrijf:
1. **Waar** je de screenshot hebt genomen (Team Settings? Project Settings?)
2. **Wat** je ziet bij "Linked to Projects" (staat "innato-flute" erbij?)
3. **Welke environments** zijn aangezet (Production, Preview, Development?)

Dan kan ik precies zeggen wat er mis is!

