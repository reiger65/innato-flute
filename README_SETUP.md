# 🎯 Setup in 2 Minuten

## Wat ik voor je kan doen:

✅ Git is al geïnitialiseerd
✅ Deploy script is klaar
✅ Alles staat klaar

## Wat jij nog moet doen:

### Optie 1: Helper Script (Aanbevolen)

```bash
./setup-github.sh
```

Dit script leidt je door:
1. GitHub repository aanmaken (opent link)
2. Repository URL invullen
3. Automatisch koppelen en pushen

### Optie 2: Handmatig (Sneller als je bekend bent met Git)

**1. Maak GitHub repository:**
- Ga naar: https://github.com/new
- Name: `innato-flute`
- Private ✅
- Klik "Create repository"

**2. Koppel en push:**
```bash
# Vervang 'jouw-username' met je GitHub username
git remote add origin https://github.com/jouw-username/innato-flute.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

## 🚀 Klaar!

Daarna kun je altijd deployen met:
```bash
npm run deploy
```

---

## 📋 Checklist

- [ ] GitHub repository aangemaakt
- [ ] `setup-github.sh` uitgevoerd (of handmatig gekoppeld)
- [ ] Eerste push succesvol
- [ ] Test: `npm run deploy` werkt

Zie `SIMPLE_DEPLOY.md` voor meer info!


