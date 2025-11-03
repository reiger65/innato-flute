# 🔄 Hoe Werkt Deployment?

## Het Proces

### 1. Code Wijzigingen (Automatisch via GitHub)

**Wat ik doe:**
- Ik pas code aan in je lokale project
- Ik commit naar Git: `git commit -m "message"`
- Ik push naar GitHub: `git push origin main`
- ✅ **Vercel detecteert automatisch de push**
- ✅ **Vercel start automatisch een nieuwe deployment**
- ✅ **Je code verschijnt online binnen 2-3 minuten**

**Dit gebeurt automatisch** - je hoeft niets te doen!

### 2. Environment Variables (Handmatig in Vercel)

**Wat ik NIET kan doen:**
- ❌ Environment variables via code pushen
- ❌ `.env` bestanden pushen (die staan in `.gitignore`)
- ❌ Secrets via GitHub committen

**Wat jij MOET doen:**
1. Ga naar **Vercel Dashboard**
2. **Settings** → **Environment Variables**
3. Voeg handmatig toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Vink **alle 3 environments** aan (Production/Preview/Development)
5. Klik **Save**
6. **Redeploy** (zonder cache)

**Waarom?**
- Environment variables zijn **geheimen** (secrets)
- Ze worden **NIET** in code/GitHub opgeslagen
- Ze worden **alleen** in Vercel dashboard opgeslagen
- Vercel injecteert ze tijdens de **build** tijd

---

## 📊 Samenvatting

| Type | Hoe? | Wie? | Automatisch? |
|------|------|------|--------------|
| **Code wijzigingen** | Git push | AI (ik) | ✅ Ja |
| **Environment variables** | Vercel dashboard | Jij | ❌ Nee (handmatig) |
| **Deployment start** | Auto na push | Vercel | ✅ Ja |
| **Redeploy na env vars** | Handmatig knop | Jij | ❌ Nee |

---

## 🎯 Wat Betekent Dit Voor Nu?

### Code Wijzigingen
✅ Als ik code aanpas en push → **Automatisch online binnen 2-3 minuten**

### Environment Variables
❌ Deze moet jij **handmatig** toevoegen in Vercel dashboard
❌ Daarna moet jij **handmatig** een redeploy doen

---

## 💡 Waarom Environment Variables Handmatig?

**Security:**
- Environment variables zijn gevoelige data (API keys, secrets)
- Ze worden **nooit** in code repository opgeslagen
- Ze worden alleen in Vercel (veilige omgeving) opgeslagen
- Elke developer/deployment heeft eigen values

**Praktisch:**
- Lokale development: `.env.local` (niet in Git)
- Production: Vercel dashboard (niet in Git)
- Andere environments: eigen values per omgeving

---

## ✅ Wat Ik Kan Doen

1. ✅ Code aanpassen
2. ✅ Committen en pushen naar GitHub
3. ✅ Vercel deployt automatisch
4. ✅ Scripts maken om te helpen

## ❌ Wat Ik NIET Kan Doen

1. ❌ Environment variables toevoegen in Vercel
2. ❌ Handmatig redeployen in Vercel dashboard
3. ❌ Secrets via code pushen

---

## 🚀 Voor Nu

**Je moet nog steeds:**
1. ✅ Environment variables toevoegen in Vercel dashboard
2. ✅ Redeploy doen (zonder cache)
3. ✅ Testen of het werkt

**Ik kan helpen met:**
- ✅ Scripts maken
- ✅ Instructies geven
- ✅ Code aanpassen en pushen
- ✅ Verificatie scripts maken

---

## 📝 Conclusie

**Code** = Automatisch (ik push, Vercel deployt)  
**Environment Variables** = Handmatig (jij in Vercel dashboard)

Dat is waarom je zelf de environment variables moet toevoegen - dat kan niet via code! 🔐




