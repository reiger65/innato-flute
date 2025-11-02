# 🔍 Hoe Browser Console Gebruiken

## Stap 1: Open Browser Console

### Op Windows/Linux:
- **Chrome/Edge:** Druk op `F12` OF `Ctrl + Shift + J`
- **Firefox:** Druk op `F12` OF `Ctrl + Shift + K`

### Op Mac:
- **Chrome/Edge:** Druk op `Cmd + Option + J`
- **Firefox:** Druk op `Cmd + Option + K`
- **Safari:** Eerst Developer menu activeren:
  1. Preferences → Advanced → ✅ "Show Develop menu"
  2. Dan: `Cmd + Option + C`

---

## Stap 2: Console Tab Openen

Na het openen zie je een panel onderaan of rechts in je browser:
1. Als je meerdere tabs ziet (Elements, Console, Network, etc.)
2. **Klik op de tab "Console"** (meestal de tweede tab)

---

## Stap 3: Code Invoeren

1. Je ziet een regel onderaan met een `>` symbool
2. **Klik in die regel** (het input veld)
3. **Type of plak** deze code:
   ```javascript
   console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
   ```
4. **Druk op Enter**

---

## Stap 4: Resultaat Zien

Je ziet nu regels zoals:
```
URL: https://gkdzcdzgrlnkufqgfizj.supabase.co
KEY: SET
```

OF:

```
URL: undefined
KEY: MISSING
```

---

## Wat Je Ook Ziet Automatisch

Bij het laden van de pagina zou je al deze logs moeten zien:
- `🚀 App mounting - Environment check:`
- `VITE_SUPABASE_URL: ...`
- `VITE_SUPABASE_ANON_KEY: ...`

Als je deze NIET ziet:
1. Check of console filters actief zijn
2. Rechtsboven in console, zorg dat alle log types aan staan:
   - ✅ Errors
   - ✅ Warnings  
   - ✅ Info
   - ✅ Verbose
3. Check of "Preserve log" is aangezet (bijreload behoudt logs)

---

## Screenshot Locaties

**Chrome:**
- Console tab is meestal tweede van links
- Input veld onderaan met `>` symbool

**Firefox:**
- Console tab is meestal eerste
- Input veld onderaan met `>` symbool

**Safari:**
- Develop menu → Show JavaScript Console
- Input veld onderaan

---

## Problemen?

**Ik zie helemaal geen console:**
- Druk opnieuw op `F12` (Windows) of `Cmd+Option+J` (Mac)
- Probeer een andere browser (Chrome werkt altijd)

**Ik zie logs maar geen input veld:**
- Scroll naar beneden in de console
- Klik op de console zelf (niet op andere tabs)
- De input veld is onderaan, mogelijk verborgen

**Ik kan niet typen:**
- Klik eerst op het console venster
- Klik dan in het input veld onderaan


