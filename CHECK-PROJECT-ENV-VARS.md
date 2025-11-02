# ✅ Check Project Environment Variables

## Je bent op de juiste plek: Project Settings → Environment Variables

### Check deze punten:

1. **Zijn ze zichtbaar in de lijst?**
   - Zie je `VITE_SUPABASE_URL`?
   - Zie je `VITE_SUPABASE_ANON_KEY`?

2. **Welke environments zijn aangezet?**
   Bij elke env var moet je zien:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
   
   **Als alleen Development is aangezet → dat is het probleem!**

3. **Als ze er WEL zijn maar niet werken:**
   - Klik op elke env var (of de drie puntjes ⋯)
   - Check of "Production" is aangezet
   - Zo niet → Edit → Zet Production aan → Save

4. **Als ze er NIET zijn:**
   - Voeg ze toe (zie hieronder)
   - **Redeploy daarna!**

---

## Toevoegen (Als ze ontbreken):

**Variabele 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://gkdzcdzgrlnkufqgfizj.supabase.co`
- Environments: ✅ Production, ✅ Preview, ✅ Development
- Save

**Variabele 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
- Environments: ✅ Production, ✅ Preview, ✅ Development
- Save

---

## ⚠️ BELANGRIJK: Redeploy!

NA het toevoegen/updaten:
1. Ga naar **Deployments** tab (bovenaan)
2. Klik **⋯** → **Redeploy**
3. Wacht 1-2 minuten

**WAAROM?** Vite bouwt env vars IN tijdens build. Zonder redeploy werkt het niet!

