# 🚀 Snelle Deployment Setup (5 minuten)

## Stap 1: GitHub Repository (2 min)

1. Ga naar **https://github.com**
2. Klik **"New repository"**
3. **Name:** `innato-flute`
4. **Private** of **Public** (jij kiest)
5. **DON'T** check "Initialize with README"
6. Klik **"Create repository"**
7. Kopieer de repository URL (bijv. `https://github.com/jouw-username/innato-flute.git`)

### Push je code:

```bash
cd /Users/hanshoukes/Desktop/innato-flute

# Als je nog geen git hebt:
git init
git add .
git commit -m "Initial commit"

# Voeg GitHub toe:
git remote add origin https://github.com/jouw-username/innato-flute.git
git branch -M main
git push -u origin main
```

---

## Stap 2: Vercel Project (2 min)

### Via Vercel Dashboard:

1. Ga naar **https://vercel.com**
2. Login met **GitHub** (aanbevolen)
3. Klik **"Add New Project"**
4. **Import Git Repository** → Selecteer `innato-flute`
5. Vercel detecteert automatisch:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Environment Variables** toevoegen:
   - Klik **"Environment Variables"**
   - Voeg toe:
     - `VITE_SUPABASE_URL` = je Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = je Supabase anon key
7. Klik **"Deploy"**
8. ⏳ Wacht 1-2 minuten
9. ✅ **Klaar!** Je krijgt een URL zoals: `https://innato-flute.vercel.app`

---

## Stap 3: Automatische Deployment Activeren (1 min)

Vercel is nu al gekoppeld aan GitHub! Elke keer dat je pusht naar `main`, wordt automatisch gedeployed.

### Test het:

```bash
# Maak kleine wijziging (bijv. tekst in App.tsx)
# Commit en push:
git add .
git commit -m "Test auto-deploy"
git push origin main

# Check Vercel dashboard → Je ziet automatisch nieuwe deployment!
```

---

## 🎯 Vanaf Nu:

### Code Aanpassen → Online:

1. **Code aanpassen in Cursor**
2. **In Source Control:**
   - Stage changes (✓)
   - Commit message
   - Commit
   - Push
3. **Wacht 1-2 minuten**
4. **Online versie is geüpdatet!** ✨

### Of via Terminal:

```bash
git add .
git commit -m "Beschrijving van wijziging"
git push origin main
```

---

## 🔧 Environment Variables

**Belangrijk:** Als je Supabase later toevoegt:

1. Ga naar Vercel → Project → **Settings** → **Environment Variables**
2. Voeg toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Redeploy** (of push een nieuwe commit)

---

## 📊 Monitoring

### Vercel Dashboard:
- **Deployments:** Alle deployments met status
- **Analytics:** Traffic en performance
- **Logs:** Error logs

### GitHub:
- **Commits:** Geschiedenis van alle wijzigingen
- **Actions:** Build status (als je GitHub Actions gebruikt)

---

## 🆘 Problemen?

### Deployment Fails:
- Check Vercel dashboard → **Deployments** → Klik op failed deployment → Check logs
- Check of `npm run build` lokaal werkt
- Check environment variables

### Changes verschijnen niet:
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check of deployment succesvol was
- Check cache settings in Vercel

---

## ✅ Checklist

- [ ] GitHub repository aangemaakt
- [ ] Code naar GitHub gepusht
- [ ] Vercel account aangemaakt
- [ ] Project geïmporteerd
- [ ] Environment variables gezet
- [ ] Eerste deployment succesvol
- [ ] Test: wijziging → push → auto-deploy werkt

---

## 🎉 Klaar!

**Vanaf nu:** Code aanpassen → Push → Automatisch online! 🚀

Zie `AUTOMATIC_DEPLOYMENT.md` voor meer details.




