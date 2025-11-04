# 🔧 Fix Password Reset Link Redirect

## Het Probleem
Supabase reset link gaat naar `localhost:3000` in plaats van je productie URL.

---

## ✅ Oplossing 1: Pas de Link Direct Aan

**De reset link ziet er zo uit:**
```
https://gkdzcdzgrlnkufqgfizj.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3000
```

**Verander `localhost:3000` naar je productie URL:**

Vervang in de URL:
- `redirect_to=http://localhost:3000`
- Met: `redirect_to=https://innato-flute.vercel.app`

**Voorbeeld:**
```
https://gkdzcdzgrlnkufqgfizj.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=https://innato-flute.vercel.app
```

---

## ✅ Oplossing 2: Gebruik Link Zonder Redirect

Je kunt de reset link ook gebruiken ZONDER de redirect parameter:
- Verwijder `&redirect_to=...` van de link
- Of gebruik alleen de token deel en ga direct naar de reset pagina

---

## ✅ Oplossing 3: Configureer Redirect URL in Supabase

**Voor de toekomst (optioneel):**

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/url-configuration**
2. Scroll naar **"Redirect URLs"**
3. Voeg toe: `https://innato-flute.vercel.app`
4. **Save**

Dit zorgt dat alle links naar de juiste URL gaan.

---

## 🎯 Snelle Fix Nu

**Kopieer de reset link uit je email en:**
1. Open de link in browser
2. **Verander `localhost:3000` naar `innato-flute.vercel.app`**
3. Of: Verwijder het `&redirect_to=...` deel
4. Reset je wachtwoord
5. Stel in: `InnatoAdmin2024!`

---

**Pas de link aan en reset het wachtwoord, dan werkt login!** 🎯





