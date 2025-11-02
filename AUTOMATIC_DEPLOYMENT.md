# 🚀 Simpele Deployment met Één Commando

## ✨ Eén Commando om Online te Zetten

```bash
npm run deploy
```

**Dat is alles!** Het script doet automatisch:
1. ✅ Build de app
2. ✅ Commit changes (optioneel)
3. ✅ Push naar GitHub
4. ✅ Deploy naar Vercel (als geconfigureerd)

---

## 📋 Eerste Setup (Één Keer)

### Stap 1: GitHub Repository Koppelen

Je hebt al een GitHub account. Nu moet je:

1. **Maak nieuwe repository:**
   - Ga naar https://github.com/new
   - **Name:** `innato-flute`
   - **Private** (aanbevolen)
   - **DON'T** check "Initialize with README"
   - Klik **"Create repository"**

2. **Koppel lokaal aan GitHub:**
   ```bash
   cd /Users/hanshoukes/Desktop/innato-flute
   
   git init
   git remote add origin https://github.com/jouw-username/innato-flute.git
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main
   ```

### Stap 2: Vercel Setup (Optioneel maar Aanbevolen)

**Optie A: Via Vercel Dashboard (Eenvoudig)**

1. Ga naar **https://vercel.com**
2. Login met **GitHub**
3. Klik **"Add New Project"**
4. **Import Git Repository** → Selecteer `innato-flute`
5. Vercel detecteert automatisch instellingen
6. **Environment Variables** (als je Supabase gebruikt):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Klik **"Deploy"**

**Klaar!** Vercel is nu gekoppeld aan GitHub.

**Optie B: Via Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 🔄 Gebruik: Code → Online

### Elke keer dat je code aanpast:

```bash
npm run deploy
```

**Het script:**
1. Vraagt of je uncommitted changes wilt committen
2. Build de app
3. Pushed naar GitHub
4. Deployed naar Vercel (als geconfigureerd)

**Of handmatig:**

```bash
./deploy.sh
```

---

## 📝 Voorbeeld Workflow

```bash
# 1. Code aanpassen in Cursor
# (bijv. nieuwe button, styling, feature)

# 2. Deploy:
npm run deploy

# Script output:
# "Wil je changes committen? (y/n):" → y
# "Commit message:" → "Add new feature"
# → Building...
# → Pushing...
# → Deploying...
# ✅ Klaar!
```

---

## ⚙️ Configuratie

### Git Remote Checken:

```bash
git remote -v
```

### Git Remote Aanpassen:

```bash
git remote set-url origin https://github.com/jouw-username/innato-flute.git
```

### Vercel Project Info:

Als je Vercel CLI gebruikt:
```bash
vercel ls          # Lijst projecten
vercel inspect     # Project details
```

---

## 🚨 Troubleshooting

### "Git niet geïnitialiseerd"
```bash
git init
git remote add origin https://github.com/jouw-username/innato-flute.git
```

### "Build failed"
- Check terminal voor errors
- Fix TypeScript/linter errors
- Probeer opnieuw

### "Push failed"
- Check GitHub credentials
- Check remote URL: `git remote -v`
- Check of je push rechten hebt

### Vercel Deployment Fails
- Check Vercel dashboard voor logs
- Check environment variables
- Vercel deployt automatisch via GitHub (als gekoppeld)

---

## 💡 Tips

1. **Vercel + GitHub = Automatisch:**
   - Als Vercel gekoppeld is aan GitHub
   - Elke push naar `main` = automatische deployment
   - Je hoeft Vercel CLI niet te gebruiken!

2. **Commit Messages:**
   - Script vraagt om commit message
   - Gebruik beschrijvende messages: "Add feature X", "Fix bug Y"

3. **Test Eerst:**
   ```bash
   npm run dev    # Test lokaal
   npm run deploy # Deploy
   ```

---

## ✅ Checklist

- [ ] GitHub repository aangemaakt
- [ ] Git remote gekoppeld
- [ ] Eerste push succesvol
- [ ] Vercel project aangemaakt (optioneel)
- [ ] `npm run deploy` werkt

---

## 🎉 Klaar!

**Vanaf nu:** `npm run deploy` = Code online! 🚀

Zie `SIMPLE_DEPLOY.md` voor meer details.
