# 🔧 FINALE FIX: Environment Variables

## Het Probleem
De logs tonen duidelijk: `VITE_SUPABASE_URL: ❌ MISSING` en `VITE_SUPABASE_ANON_KEY: ❌ MISSING`

Dit betekent dat de environment variables **NIET** beschikbaar zijn tijdens de build/deployment.

---

## ✅ DIRECTE OPLOSSING (Volg Exact)

### STAP 1: Ga naar Vercel Environment Variables

1. Open: https://vercel.com/dashboard
2. Klik op je project: **innato-flute**
3. Klik **Settings** (linker menu)
4. Klik **Environment Variables** (onder Settings)

### STAP 2: Check of ze er zijn

Zie je deze 2 variables?

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Als NEE → Voeg ze toe (zie STAP 3)**  
**Als JA → Check de waarden (zie STAP 4)**

### STAP 3: Voeg ze toe (als ze er niet zijn)

1. Klik **"Add New"** knop
2. **Variable 1:**
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://gkdzcdzgrlnkufqgfizj.supabase.co`
   - **Environments:** ✅ Production ✅ Preview ✅ Development (vink ALLE DRIE aan!)
   - Klik **Save**
3. **Variable 2:**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
   - **Environments:** ✅ Production ✅ Preview ✅ Development (vink ALLE DRIE aan!)
   - Klik **Save**

### STAP 4: Check de waarden (als ze er al zijn)

Voor beide variables:
1. Klik op de variable om te openen
2. Check:
   - ✅ **Name** is EXACT: `VITE_SUPABASE_URL` (geen spatie, hoofdletters)
   - ✅ **Value** is correct:
     - `VITE_SUPABASE_URL` = `https://gkdzcdzgrlnkufqgfizj.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
   - ✅ **Environments** heeft ALLE DRIE aangevinkt: Production, Preview, Development
3. Als iets fout is → **Update** en **Save**

### STAP 5: FORCE NIEUWE DEPLOYMENT

**BELANGRIJK:** Na het toevoegen/updaten van environment variables moet je een **nieuwe deployment maken**.

1. Ga naar **Deployments** tab (linker menu)
2. Klik op de **laatste deployment** (meest recent)
3. Klik **⋯** (drie puntjes rechtsboven)
4. Klik **Redeploy**
5. **BELANGRIJK:** Zet **"Use existing Build Cache"** UIT (unchecked)
6. Klik **Redeploy**
7. Wacht 2-3 minuten

### STAP 6: Test

Na de nieuwe deployment:

1. Open: https://innato-flute.vercel.app
2. Hard refresh: `Ctrl+Shift+R` (Windows) of `Cmd+Shift+R` (Mac)
3. Open console (`F12`)
4. Check logs:
   - ✅ Moet tonen: `✅ Supabase environment variables found`
   - ✅ Moet tonen: `✅ Creating Supabase client`
   - ❌ NIET meer: `❌ MISSING`

5. Test login:
   - Email: `info@stonewhistle.com`
   - Password: `InnatoAdmin2024!`
   - Moet werken!

---

## ❌ Als het nog steeds niet werkt

1. **Check of je de juiste URL gebruikt:**
   - ✅ `https://innato-flute.vercel.app`
   - ❌ NIET: preview URLs met lange hashes

2. **Check Vercel Build Logs:**
   - Ga naar **Deployments** → Laatste deployment → **Build Logs**
   - Zoek naar `VITE_SUPABASE_URL` in de logs
   - Zie je de waarde? → Dan is het build probleem
   - Zie je `undefined`? → Environment variables zijn niet beschikbaar tijdens build

3. **Check of variables voor JUISTE PROJECT zijn:**
   - Vercel kan variables hebben op Team level vs Project level
   - Zorg dat ze op **Project level** staan (niet alleen Team level)

---

## Samenvatting

✅ Environment variables toevoegen/updaten in Vercel  
✅ **ALLE DRIE environments aanvinken** (Production, Preview, Development)  
✅ **FORCE nieuwe deployment** (zonder build cache)  
✅ Test met de juiste URL

Dat is alles! Geen verdere rondjes meer nodig. 🎯

