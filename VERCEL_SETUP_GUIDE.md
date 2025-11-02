# 🚀 Vercel Setup - Stap voor Stap

## Optie 1: Via Dashboard (Aanbevolen - 2 minuten)

### Stap 1: Maak Vercel Account
1. Ga naar: **https://vercel.com/signup**
2. Klik **"Continue with GitHub"**
3. Autoriseer Vercel om toegang te krijgen tot je GitHub account

### Stap 2: Import Project
1. In Vercel dashboard, klik **"Add New..."** of **"Import Project"**
2. Je ziet je repositories → Zoek **"innato-flute"**
3. Klik **"Import"** bij `reiger65/innato-flute`

### Stap 3: Configureer (Auto-detecteerd!)
Vercel detecteert automatisch:
- ✅ Framework: **Vite**
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Node Version: Automatisch

**Je hoeft niets te wijzigen!**

### Stap 4: Environment Variables (Later - voor Supabase)
Als je later Supabase gebruikt:
1. Klik **"Environment Variables"**
2. Voeg toe:
   - `VITE_SUPABASE_URL` = (je Supabase URL)
   - `VITE_SUPABASE_ANON_KEY` = (je Supabase anon key)
3. Deze zijn nu nog niet nodig!

### Stap 5: Deploy!
1. Klik **"Deploy"**
2. ⏳ Wacht 1-2 minuten
3. ✅ Je krijgt een URL zoals: `https://innato-flute.vercel.app`

**Klaar!** 🎉

---

## Optie 2: Via CLI (Geavanceerd)

### Stap 1: Login
```bash
cd /Users/hanshoukes/Desktop/innato-flute
vercel login
```
→ Kies "Continue with GitHub"

### Stap 2: Link Project
```bash
vercel link
```
→ Project naam: `innato-flute` (druk Enter)
→ Directory: `./` (druk Enter)
→ Override settings? `N` (druk Enter)

### Stap 3: Deploy
```bash
npm run deploy
```

---

## ✅ Na Setup: Simpel Deployen

Elke keer dat je updates maakt:

```bash
npm run deploy
```

Dit script doet:
1. Build de app (`npm run build`)
2. Vraagt of je wilt committen
3. Pusht naar GitHub
4. Deployt naar Vercel (automatisch via GitHub integration)

---

## 🌐 Je App URL

Na de eerste deploy krijg je:
- **Production URL:** `https://innato-flute.vercel.app` (of een custom naam)
- **Preview URLs:** Voor elke commit/PR

---

## 🔄 Automatische Deploys

Zodra Vercel gekoppeld is aan GitHub:
- **Elke push naar `main`** → Automatische production deploy
- **Pull Requests** → Automatische preview deploy

---

## 📝 Troubleshooting

### "Project not found"
→ Zorg dat je repository `reiger65/innato-flute` zichtbaar is voor Vercel
→ Check GitHub repository permissions

### "Build failed"
→ Check `npm run build` werkt lokaal
→ Kijk in Vercel build logs voor errors

### "Environment variables missing"
→ Voeg toe in Vercel Dashboard → Project Settings → Environment Variables

---

## 🎯 Klaar!

Je app is nu online en blijft automatisch up-to-date! 🚀

