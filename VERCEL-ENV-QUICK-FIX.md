# 🚨 Quick Fix: Vercel Environment Variables

## Het Probleem
Als nieuwe gebruikers ook niet kunnen inloggen, betekent dit dat Supabase **niet is geconfigureerd** in Vercel. De app gebruikt localStorage, wat niet werkt online.

## ✅ Oplossing (2 minuten)

### Stap 1: Open Vercel Environment Variables
1. Ga naar: https://vercel.com/dashboard
2. Klik op je project: **innato-flute** of **Stonewhistle INNATO Explorations**
3. **Settings** → **Environment Variables**

### Stap 2: Check wat er is
Kijk of deze twee variabelen bestaan:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Stap 3A: Als ze NIET bestaan - Voeg toe:

**Variabele 1:**
- Klik **"Add New"**
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://gkdzcdzgrlnkufqgfizj.supabase.co`
- Selecteer: ✅ Production, ✅ Preview, ✅ Development
- **Save**

**Variabele 2:**
- Klik **"Add New"**
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
- Selecteer: ✅ Production, ✅ Preview, ✅ Development
- **Save**

### Stap 3B: Als ze WEL bestaan - Verwijder en voeg opnieuw toe:

1. **Verwijder** beide variabelen
2. Voeg ze opnieuw toe (zie Stap 3A)
3. Dit forceert Vercel om ze opnieuw in te lezen

### Stap 4: Redeploy (VERY IMPORTANT!)

**Optie A: Via Dashboard**
1. Ga naar **"Deployments"** tab
2. Klik op **⋯** (drie puntjes) naast laatste deployment
3. Klik **"Redeploy"**
4. Bevestig

**Optie B: Via Git Push**
```bash
cd /Users/hanshoukes/Desktop/innato-flute
git commit --allow-empty -m "Trigger redeploy"
git push
```

### Stap 5: Test

1. **Wacht 1-2 minuten** tot deployment klaar is
2. **Hard refresh** je app (Ctrl+Shift+R / Cmd+Shift+R)
3. **Open console** (F12)
4. Je zou moeten zien:
   ```
   🚀 App mounting - Environment check:
      VITE_SUPABASE_URL: https://gkdzcdzgrlnkufqgfizj.supabase.co
      VITE_SUPABASE_ANON_KEY: ✅ SET
   ```
5. Probeer in te loggen
6. Check console voor:
   - `🔐🔐🔐 LOGIN ATTEMPT STARTED 🔐🔐🔐`
   - `✅ Creating Supabase client`
   - `✅✅✅ LOGIN SUCCESSFUL ✅✅✅`

## ❌ Als het nog steeds niet werkt:

Check in browser console:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
```

- Als beide `undefined` zijn → env vars zijn niet ingebouwd → redeploy opnieuw
- Als ze wel zijn → deel de console logs met mij





