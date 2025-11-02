# 🔍 Debug Production Login Issue

## Probleem
- Geen console logs zichtbaar
- "Invalid email or password" error
- Supabase lijkt niet te werken online

## Mogelijke Oorzaken

### 1. Environment Variables Niet Ingebouwd in Build
Vite bouwt environment variables **IN** tijdens build time. Als je ze toevoegt NA de build, werkt het niet!

**Oplossing:**
1. Check of environment variables zijn toegevoegd in Vercel
2. **Redeploy** (dit bouwt opnieuw met de nieuwe env vars)
3. Check build logs of de vars worden gelezen

### 2. Vite Prefix Check
Vite gebruikt alleen env vars die beginnen met `VITE_`. Check dit!

### 3. Build Mode
Production build kan console.logs minifyen/verwijderen. Ik heb nu ALWAYS-ON logging toegevoegd.

## Debug Stappen

### Stap 1: Check Environment Variables in Vercel
1. Ga naar: Settings → Environment Variables
2. Zijn deze aanwezig?
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Zijn ze voor **Production** environment? ✅

### Stap 2: Check Build Logs
In Vercel dashboard:
1. Ga naar laatste deployment
2. Klik op deployment
3. Scroll naar "Build Logs"
4. Check of er errors zijn

### Stap 3: Test in Browser Console
Open je online app en in console, type:
```javascript
// Check env vars
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
```

Als beide `undefined` zijn → env vars niet ingebouwd!

### Stap 4: Force Redeploy
1. Push een kleine change naar GitHub
2. OF: Vercel → Deployments → ⋯ → Redeploy
3. Wacht tot build klaar is
4. **Hard refresh** (Ctrl+Shift+R)

## Wat Ik Heb Toegevoegd

1. ✅ **Always-on logging** - zelfs in production
2. ✅ **Error logging** met `console.error` (kan niet worden weggehaald)
3. ✅ **Environment check logging** bij startup
4. ✅ **Explicit Supabase check** in authService

## Test Nu

Na redeploy, check console voor:
- `🔧 Initializing Supabase client:` (bij page load)
- `🔐🔐🔐 LOGIN ATTEMPT STARTED 🔐🔐🔐` (bij login click)
- `❌❌❌ SUPABASE NOT CONFIGURED ❌❌❌` (als env vars missing)

Als je deze NIET ziet → console is gefiltered of build gebruikt oude code.

