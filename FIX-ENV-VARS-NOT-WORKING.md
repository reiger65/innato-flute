# 🔧 Environment Variables Toegevoegd Maar Werken Niet - Fix

## Het Probleem
Je hebt de env vars al toegevoegd, maar ze worden nog steeds niet gelezen:
```
VITE_SUPABASE_URL: ❌ MISSING
VITE_SUPABASE_ANON_KEY: ❌ MISSING
```

## Mogelijke Oorzaken

### 1. ❌ NIET GEKOPPELD AAN PROJECT (Meest Waarschijnlijk!)

In de screenshot zie ik: "Search for a Project to link to..."

**Dit betekent:** De env vars zijn toegevoegd op TEAM niveau, maar NIET gekoppeld aan je project!

**Fix:**
1. In het veld "Search for a Project to link to..."
2. Type: **innato-flute** of **Stonewhistle INNATO Explorations**
3. Selecteer het project
4. **Save**

OF voeg ze toe op PROJECT niveau:
1. Ga naar: Project Settings → Environment Variables (NIET Team Settings)
2. Voeg ze daar toe

---

### 2. ⚠️ GEEN REDEPLOY NA TOEVOEGEN

Vite bouwt env vars IN tijdens build. Als je ze toevoegt NA de build, werken ze niet!

**Fix:**
1. Ga naar **Deployments** tab
2. Klik **⋯** → **Redeploy**
3. Wacht tot deployment klaar is
4. Hard refresh pagina

---

### 3. 🔄 VERKEERDE ENVIRONMENT

Check of ze voor **Production** zijn ingesteld:
- In de lijst, check of ze "Production, Preview, and Development" tonen
- Als alleen "Development" → werkt niet in production

---

### 4. 💾 CACHE ISSUE

Soms cacht Vercel de oude build.

**Fix:**
1. Verwijder BEIDE env vars
2. Wacht 30 seconden
3. Voeg ze opnieuw toe
4. **Redeploy**

---

## ✅ VOORKEUR OPLOSSING: Project-Level Env Vars

Team-level env vars kunnen problemen geven. Gebruik project-level:

1. Ga naar: **Project Settings** → **Environment Variables**
   (NIET Team Settings!)

2. Check of `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` hier staan

3. Als ze hier NIET staan:
   - Voeg ze hier toe (project-level)
   - Select ALL: Production, Preview, Development
   - Save

4. **Redeploy**

---

## 🧪 Test

Na redeploy:
1. Hard refresh (Ctrl+Shift+R)
2. Check console voor:
   ```
   ✅ Supabase environment variables found
   ✅ Creating Supabase client
   ```

Als je nog steeds "MISSING" ziet:
- Check of ze op PROJECT niveau zijn (niet Team)
- Check of er is geredeployed
- Check build logs in Vercel voor errors

