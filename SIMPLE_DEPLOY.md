# 🚀 Simpele Deployment

## Eén Commando om Online te Zetten

```bash
npm run deploy
```

Of:

```bash
./deploy.sh
```

**Dat is alles!** ✨

---

## 📋 Eerste Keer Setup (5 minuten)

### 1. GitHub Repository Koppelen

```bash
cd /Users/hanshoukes/Desktop/innato-flute

# Initialiseer Git (als nog niet gedaan)
git init

# Voeg GitHub repository toe
git remote add origin https://github.com/jouw-username/innato-flute.git

# Eerste push
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2. Vercel Setup (optioneel, maar aanbevolen)

**Via Vercel Dashboard:**
1. Ga naar https://vercel.com
2. Login met GitHub
3. **New Project** → Import `innato-flute` repository
4. Klik **Deploy**

Vercel linkt automatisch aan GitHub!

**Of via CLI:**
```bash
npm i -g vercel
vercel login
vercel
```

---

## 🔄 Dagelijkse Workflow

### Code Aanpassen → Online:

1. **Code aanpassen in Cursor**

2. **Run één commando:**
   ```bash
   npm run deploy
   ```

3. **Script doet automatisch:**
   - ✅ Build de app
   - ✅ Commit changes (als je wilt)
   - ✅ Push naar GitHub
   - ✅ Deploy naar Vercel (als CLI geïnstalleerd)

4. **Klaar!** 🎉

---

## 📝 Wat gebeurt er precies?

Het `deploy.sh` script:

1. **Check Git status**
   - Zijn er uncommitted changes? → Vraagt of je wilt committen

2. **Build**
   - Runt `npm run build`
   - Checkt of build succesvol is

3. **Push naar GitHub**
   - Pushed alle changes naar `main` branch

4. **Deploy naar Vercel** (optioneel)
   - Als Vercel CLI geïnstalleerd is
   - Deployed automatisch naar production

---

## ⚙️ Opties

### Zonder Vercel CLI:

```bash
npm run deploy
# → Code wordt gepusht naar GitHub
# → Als Vercel gekoppeld is aan GitHub, deployt het automatisch
```

### Met Vercel CLI:

```bash
npm i -g vercel
vercel login

npm run deploy
# → Build + Push + Deploy alles in één!
```

---

## 🎯 Voorbeelden

### Feature Toevoegen:

```bash
# 1. Code aanpassen in Cursor
# 2. Deploy:
npm run deploy

# Script vraagt: "Commit message?"
# Type: "Add new feature"
# → Klaar!
```

### Bug Fix:

```bash
# 1. Fix maken
# 2. Deploy:
npm run deploy
```

### Styling Aanpassen:

```bash
# 1. CSS aanpassen
# 2. Deploy:
npm run deploy
```

---

## 🚨 Troubleshooting

### "Git niet geïnitialiseerd"
→ Run: `git init` en koppel GitHub repository

### "Build failed"
→ Check errors in terminal
→ Fix code issues
→ Probeer opnieuw

### "Push failed"
→ Check GitHub credentials
→ Check of remote correct is: `git remote -v`

### "Vercel not found"
→ Niet erg! Code staat op GitHub
→ Vercel deployt automatisch als gekoppeld aan GitHub
→ Of installeer Vercel CLI

---

## 💡 Tips

1. **Commit messages zijn handig:**
   - Script vraagt om commit message
   - Of skip met 'n' en commit handmatig later

2. **GitHub is genoeg:**
   - Als Vercel gekoppeld is aan GitHub, deployt het automatisch
   - Vercel CLI is optioneel

3. **Test eerst lokaal:**
   ```bash
   npm run dev
   # Test je changes
   npm run deploy
   ```

---

## ✅ Checklist

- [ ] Git geïnitialiseerd
- [ ] GitHub repository gekoppeld
- [ ] Eerste commit gepusht
- [ ] Vercel account (optioneel)
- [ ] Test: `npm run deploy` werkt

---

## 🎉 Klaar!

**Vanaf nu:** `npm run deploy` = Online! 🚀





