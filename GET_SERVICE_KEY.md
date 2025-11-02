# 🔑 Service Role Key Nodig voor Automatische Migratie

## Waarom?

Om de migratie volledig automatisch uit te voeren, heb ik de **service_role key** nodig.

## ⚠️ Belangrijk:

- **Service role key** is Krachtig (kan alles in database)
- **Anon key** is Veilig (alleen via app, met RLS)
- **Service role key** moet NIET in git of client-side code!

## 🔑 Hoe te krijgen:

1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/settings/api
2. Scroll naar **"Project API keys"**
3. Kopieer de **"service_role"** key (niet de anon key!)
4. Voeg toe aan `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=je_service_role_key_hier
   ```
5. Run: `node migrate-via-api.js`

## 🎯 Of: Handmatig (2 minuten, Geen Key Nodig)

Het SQL bestand is al geopend. Je hoeft alleen:
1. Copy SQL (Cmd+A, Cmd+C)
2. Paste in SQL Editor (Cmd+V)  
3. Click "Run"

**Dat is alles!** ✅

---

**Wat wil je?**
- A) Service role key geven → Volledig automatisch
- B) Handmatig doen → Veilig, 2 minuten

