# 🔍 Check Vercel Environment Variables

## Het Probleem

Als je "Invalid email or password" krijgt online, betekent dit waarschijnlijk dat:
- Supabase environment variables **niet** zijn ingesteld in Vercel
- De app valt terug op localStorage (werkt niet online omdat dat leeg is)
- Het account bestaat alleen in Supabase, niet in localStorage

## Snelle Check

### Optie 1: Via Vercel Dashboard (Aanbevolen)

1. Ga naar: https://vercel.com/dashboard
2. Klik op je project (waarschijnlijk "Stonewhistle INNATO Explorations")
3. Klik op **"Settings"** tab
4. Klik op **"Environment Variables"** in het linkermenu
5. Check of deze twee variabelen bestaan:
   - `VITE_SUPABASE_URL` 
   - `VITE_SUPABASE_ANON_KEY`

**Als ze ontbreken:**
- Voeg ze toe (zie hieronder)
- **Redeploy** daarna (VERY IMPORTANT!)

### Optie 2: Via Terminal

```bash
cd /Users/hanshoukes/Desktop/innato-flute
vercel env ls
```

Dit toont alle environment variables.

---

## Als ze ontbreken: Voeg ze toe

### Waarden:

**VITE_SUPABASE_URL:**
```
https://gkdzcdzgrlnkufqgfizj.supabase.co
```

**VITE_SUPABASE_ANON_KEY:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA
```

### In Vercel Dashboard:

1. Settings → Environment Variables
2. Klik **"Add New"**
3. Vul in:
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** `https://gkdzcdzgrlnkufqgfizj.supabase.co`
   - **Select ALL:** ✅ Production, ✅ Preview, ✅ Development
4. **Save**
5. Herhaal voor `VITE_SUPABASE_ANON_KEY`

---

## ⚠️ BELANGRIJK: Redeploy!

Na het toevoegen van environment variables:

1. Ga naar **"Deployments"** tab
2. Klik op **⋯** (drie puntjes) naast laatste deployment
3. Klik **"Redeploy"**
4. Bevestig

**OF** push nieuwe code naar GitHub (dit trigger automatisch deployment)

---

## Test Daarna

1. **Hard refresh** je online app (Ctrl+Shift+R / Cmd+Shift+R)
2. **Open console** (F12)
3. Je zou moeten zien:
   - `🔧 Initializing Supabase client:` met `hasUrl: true, hasKey: true`
   - `✅ Creating Supabase client`
4. Probeer in te loggen
5. Je zou moeten zien:
   - `🔐 Login attempt started`
   - `🔍 signIn called...`
   - `✅ Login successful`

Als je nog steeds errors ziet, deel de console logs!








