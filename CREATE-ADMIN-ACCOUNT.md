# 🔐 Admin Account Aanmaken

## Stap-voor-Stap: Admin Account in Supabase

### Methode 1: Via Supabase Dashboard (Aanbevolen)

1. **Ga naar Users pagina:**
   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users

2. **Klik op "Add user" → "Create new user"**

3. **Vul in:**
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`
   - **Auto Confirm User**: ✅ **AANZETTEN** (belangrijk!)
   - **Send invite email**: ❌ UIT

4. **Klik "Create User"**

5. **Admin Role Toevoegen:**
   - Klik op het zojuist aangemaakte account
   - Ga naar tabblad **"Metadata"** of **"User Metadata"**
   - Voeg toe in "Raw User Meta Data":
     ```json
     {
       "username": "admin",
       "role": "admin"
     }
     ```
   - OF klik op "Add metadata" en voeg toe:
     - Key: `role`, Value: `admin`
     - Key: `username`, Value: `admin`

6. **Save**

7. **Test:**
   - Log in in de app met `info@stonewhistle.com` / `InnatoAdmin2024!`
   - Je zou admin functies moeten zien (Manage Lessons, etc.)

---

### Methode 2: Via SQL (Direct)

1. **Ga naar SQL Editor:**
   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new

2. **Voer dit SQL script uit:**

```sql
-- Maak admin user aan (gebruikt Supabase Auth functie)
-- Let op: Dit werkt alleen met service_role key
-- Gebruik liever de Dashboard UI hierboven

-- OF: Als account al bestaat, update metadata:
UPDATE auth.users 
SET 
  raw_user_meta_data = jsonb_build_object(
    'username', 'admin',
    'role', 'admin'
  ),
  email_confirmed_at = NOW()
WHERE email = 'info@stonewhistle.com';
```

---

### Methode 3: Via App Sign Up + Metadata Update

1. Maak account aan via app (Sign Up tab)
2. Ga naar Supabase Dashboard → Users
3. Zoek `info@stonewhistle.com`
4. Klik erop → Metadata tab
5. Voeg toe: `role: "admin"`
6. Bevestig email: `email_confirmed_at` zetten naar NOW()

---

## Na Aanmaken: Check Admin Status

De app checkt admin status op basis van:
- ✅ Email: `info@stonewhistle.com` (staat al in admin lijst)
- ✅ Username: `admin` 
- ✅ Role: `admin` (in metadata)

**Als account bestaat maar geen admin functies zichtbaar:**
1. Check of je ingelogd bent
2. Refresh de pagina
3. Check browser console voor errors




