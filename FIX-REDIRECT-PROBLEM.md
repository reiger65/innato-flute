# 🔧 Fix Redirect Probleem

## Het Probleem
Ondanks aanpassing blijft Supabase naar localhost:3000 gaan.

---

## ✅ Oplossing 1: Verwijder redirect_to Parameter

**Verwijder het `redirect_to` deel helemaal:**

**Originele link:**
```
https://gkdzcdzgrlnkufqgfizj.supabase.co/auth/v1/verify?token=ABC123&type=recovery&redirect_to=http://localhost:3000
```

**Gebruik dit (zonder redirect_to):**
```
https://gkdzcdzgrlnkufqgfizj.supabase.co/auth/v1/verify?token=ABC123&type=recovery
```

Supabase zal je dan naar een default pagina sturen waar je het wachtwoord kunt resetten.

---

## ✅ Oplossing 2: Gebruik Direct Reset URL

**Probeer deze URL (vervang TOKEN met het token uit je email):**

```
https://gkdzcdzgrlnkufqgfizj.supabase.co/auth/v1/verify?token=TOKEN&type=recovery
```

En dan handmatig naar je app gaan om in te loggen.

---

## ✅ Oplossing 3: Configureer Redirect URLs in Supabase

**Belangrijk:** We moeten de redirect URLs configureren VOORDAT we de reset link aanvragen.

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/url-configuration**
2. Scroll naar **"Redirect URLs"**
3. Voeg toe:
   - `https://innato-flute.vercel.app`
   - `http://localhost:5173` (voor development)
4. **Save**
5. Vraag een NIEUWE reset link aan (de oude link heeft nog localhost:3000 in de cache)

---

## ✅ Oplossing 4: Reset Via Supabase Dashboard Direct

**Als niets werkt, reset direct via dashboard:**

1. Ga naar: **https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users**
2. Zoek: `info@stonewhistle.com`
3. Klik op het account
4. Scroll naar beneden
5. Zoek **"Reset Password"** of **"Send Password Reset Email"**
6. Vraag een NIEUWE link aan (na het configureren van redirect URLs)
7. OF: Gebruik **"Reset Password"** knop (als die bestaat) om direct te resetten zonder email

---

## 🎯 Aanbeveling

1. **Eerst:** Configureer redirect URLs in Supabase (Oplossing 3)
2. **Dan:** Vraag een NIEUWE reset link aan
3. **Of:** Verwijder `redirect_to` parameter uit huidige link (Oplossing 1)

---

**Welke methode wil je proberen?** Laat het weten! 🎯

