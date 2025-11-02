# 🔄 Hoe Werkt Deployment?

## ✅ AUTOMATISCH: Code → Online

**Wat gebeurt er wanneer ik code push:**

```
Ik pas code aan
    ↓
git commit + git push
    ↓
GitHub ontvangt push
    ↓
Vercel detecteert push (automatisch!)
    ↓
Vercel start nieuwe deployment (automatisch!)
    ↓
2-3 minuten later → Code is online ✅
```

**Je hoeft NIETS te doen!** Het gaat automatisch.

---

## ❌ HANDMATIG: Environment Variables

**Wat ik NIET kan doen:**
- ❌ Environment variables toevoegen via code
- ❌ `.env` bestanden pushen (staan in `.gitignore`)
- ❌ Secrets committen naar GitHub

**Waarom?**
- Environment variables zijn **geheimen** (API keys, passwords)
- Ze worden **NOOIT** in code opgeslagen
- Alleen in Vercel dashboard (veilige omgeving)

---

## 📊 Overzicht

| Type | Automatisch? | Wie doet het? |
|------|-------------|---------------|
| **Code wijzigingen** | ✅ Ja | AI (push naar GitHub) |
| **Deployment start** | ✅ Ja | Vercel (na elke push) |
| **Environment Variables** | ❌ Nee | Jij (in Vercel dashboard) |
| **Redeploy na env vars** | ❌ Nee | Jij (knop in dashboard) |

---

## 🎯 Voor Nu

### ✅ Wat ik kan doen:
1. Code aanpassen
2. Committen en pushen
3. Vercel deployt automatisch

### ❌ Wat jij moet doen:
1. Environment variables toevoegen in Vercel
2. Redeploy doen (na env vars toevoegen)

---

## 💡 Waarom Environment Variables Handmatig?

**Security:**
- API keys, secrets, passwords → gevoelige data
- Nooit in code repository (GitHub)
- Alleen in Vercel (veilige omgeving)

**Praktisch:**
- Lokale dev: `.env.local` (niet in Git)
- Production: Vercel dashboard (niet in Git)
- Andere omgevingen: eigen values

---

## 📝 Conclusie

**Code** = Automatisch (ik push, Vercel deployt)  
**Environment Variables** = Handmatig (jij in dashboard)

Dat is waarom environment variables handmatig moeten - dat kan niet via code! 🔐

---

## 🚀 Vanaf Nu

**Elke code wijziging:**
- Ik push → Automatisch online ✅

**Environment variables:**
- Jij toevoegen → Jij redeployen ❌ (maar één keer nodig)

Na één keer setup → Alles gaat automatisch! 🎉


