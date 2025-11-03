# 🔍 Geen Console Logs Zien - Debug Guide

## Het Probleem
Je ziet geen logs van login activiteiten in de console. Dit kan verschillende oorzaken hebben.

## Oplossing 1: Check Console Filters

**Belangrijk:** Console filters kunnen logs verbergen!

### Chrome/Edge:
1. Rechtsboven in console zie je filter knoppen
2. Zorg dat ALLE aan staan:
   - ✅ Errors (rode cirkel) - **VERY IMPORTANT**
   - ✅ Warnings (gele driehoek)
   - ✅ Info (blauwe i)
   - ✅ Verbose (grijs)
3. Check het dropdown rechtsboven: "Default levels" of "All levels"

### Firefox:
1. Rechtsboven in console
2. Check ALLE filters:
   - ✅ Errors
   - ✅ Warnings
   - ✅ Logs
   - ✅ Info
   - ✅ Debug

## Oplossing 2: Alert Popup (Tijdelijk)

Ik heb een `alert()` toegevoegd die verschijnt wanneer je op login klikt. Dit werkt ALTIJD, zelfs als console filters aan staan.

**Test nu:**
1. Herlaad de pagina (wacht tot nieuwe deployment klaar is - 1-2 minuten)
2. Probeer in te loggen
3. **Je zou een popup moeten zien**: "Login attempt started - check console for details"
4. Als je deze ziet → de functie wordt aangeroepen
5. Als je deze NIET ziet → de functie wordt niet aangeroepen (andere issue)

## Oplossing 3: Check Of Code Is Gedeployed

1. Ga naar Vercel Dashboard → Deployments
2. Check of laatste deployment "Add alert and forced logging..." bevat
3. Is deze "Ready" (groen)?
4. Zo niet, wacht 1-2 minuten

## Oplossing 4: Test Direct in Console

Open console en type DIRECT deze code (niet via copy/paste):

```javascript
import.meta.env.VITE_SUPABASE_URL
```

Druk Enter. Wat zie je?
- `undefined` → Supabase niet geconfigureerd
- `"https://gkdzcdzgrlnkufqgfizj.supabase.co"` → Wel geconfigureerd

## Oplossing 5: Check Network Tab

1. Open Console → **Network** tab
2. Probeer in te loggen
3. Kijk of er requests zijn naar:
   - `supabase.co/auth/v1/token` → Supabase wordt gebruikt
   - Niets → localStorage wordt gebruikt

## Wat Nu?

**Als je de alert popup ziet:**
- ✅ De functie werkt
- Check console voor error details
- Check of Supabase env vars zijn ingesteld

**Als je de alert popup NIET ziet:**
- ❌ De functie wordt niet aangeroepen
- Check of je op de juiste knop klikt
- Check of er JavaScript errors zijn (rood in console)

## Test Checklist

- [ ] Console filters zijn allemaal aan
- [ ] Nieuwe deployment is klaar
- [ ] Pagina is herladen (hard refresh: Ctrl+Shift+R)
- [ ] Alert popup verschijnt bij login klik
- [ ] Network tab toont requests
- [ ] Environment variables zijn getest in console




