# 🎯 Eerste Keer Setup (5 minuten)

## Stap 1: GitHub Repository Aanmaken (2 min)

1. Ga naar **https://github.com** en log in
2. Klik **"New"** of **"New repository"** (groene knop)
3. Vul in:
   - **Repository name:** `innato-flute`
   - **Description:** (optioneel) "INNATO Flute Explorations"
   - **Private** ✅ (aanbevolen)
   - **DON'T** check "Add a README file"
   - **DON'T** check "Add .gitignore"
   - **DON'T** check "Choose a license"
4. Klik **"Create repository"**
5. **Kopieer de URL** die verschijnt (bijv. `https://github.com/jouw-username/innato-flute.git`)

---

## Stap 2: Koppel Lokaal aan GitHub (1 min)

Run deze commando's in de terminal:

```bash
cd /Users/hanshoukes/Desktop/innato-flute

# Git is al geïnitialiseerd, voeg GitHub toe:
git remote add origin https://github.com/jouw-username/innato-flute.git

# Vervang 'jouw-username' met je echte GitHub username!
# En 'innato-flute' met de naam van je repository

# Eerste commit en push:
git add .
git commit -m "Initial commit - INNATO Flute App"
git branch -M main
git push -u origin main
```

---

## Stap 3: Vercel Setup (2 min) - Optioneel maar Aanbevolen

### Via Vercel Dashboard:

1. Ga naar **https://vercel.com**
2. Klik **"Sign Up"** of **"Log in"**
3. Login met **GitHub** (gebruik je GitHub account)
4. Klik **"Add New Project"**
5. Je ziet je repositories → Klik **"Import"** bij `innato-flute`
6. Vercel detecteert automatisch:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
7. **Environment Variables** (als je Supabase later gebruikt):
   - Klik **"Environment Variables"**
   - Voeg toe:
     - `VITE_SUPABASE_URL` = (later, als je Supabase hebt)
     - `VITE_SUPABASE_ANON_KEY` = (later, als je Supabase hebt)
8. Klik **"Deploy"**
9. ⏳ Wacht 1-2 minuten
10. ✅ Je krijgt een URL zoals: `https://innato-flute.vercel.app`

**Klaar!** Vercel is nu gekoppeld aan GitHub.

---

## 🚀 Vanaf Nu: Simpel Deployen

### Elke keer dat je code aanpast:

```bash
npm run deploy
```

**Dat is alles!** Het script doet:
- ✅ Build de app
- ✅ Vraagt of je wilt committen (ja/nee)
- ✅ Pusht naar GitHub
- ✅ Vercel deployt automatisch (als gekoppeld aan GitHub)

---

## ✅ Checklist

- [ ] GitHub repository aangemaakt
- [ ] Git remote gekoppeld (`git remote add origin ...`)
- [ ] Eerste push succesvol (`git push -u origin main`)
- [ ] Vercel account aangemaakt (optioneel)
- [ ] Vercel project geïmporteerd (optioneel)
- [ ] Test: `npm run deploy` werkt

---

## 🎉 Klaar!

**Vanaf nu:** `npm run deploy` = Online! 🚀

Zie `SIMPLE_DEPLOY.md` voor details.


