# 🚀 Supabase Environment Variables toevoegen aan Vercel

## Stap-voor-stap handleiding

### STAP 1: Open je Vercel project
1. Ga naar: https://vercel.com/dashboard
2. Klik op je project (waarschijnlijk "innato-flute" of "Stonewhistle INNATO Explorations")

### STAP 2: Ga naar Environment Variables
1. Klik bovenaan op het tabblad **"Settings"**
2. In het linkermenu, klik op **"Environment Variables"**

### STAP 3: Voeg de eerste variable toe
1. Klik op **"Add New"** knop
2. **Key**: `VITE_SUPABASE_URL`
3. **Value**: `https://gkdzcdzgrlnkufqgfizj.supabase.co`
4. **Selecteer ALLE drie**: ✅ Production, ✅ Preview, ✅ Development
5. Klik op **"Save"**

### STAP 4: Voeg de tweede variable toe
1. Klik weer op **"Add New"**
2. **Key**: `VITE_SUPABASE_ANON_KEY`
3. **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA`
4. **Selecteer ALLE drie**: ✅ Production, ✅ Preview, ✅ Development
5. Klik op **"Save"**

### STAP 5: Redeploy je app
1. Ga naar het tabblad **"Deployments"** (bovenaan)
2. Klik op de drie puntjes (⋯) naast je laatste deployment
3. Klik op **"Redeploy"**
4. Bevestig door nogmaals op **"Redeploy"** te klikken

### ✅ Klaar!
Je app gebruikt nu Supabase online! 🎉

