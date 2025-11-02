# 🔄 Workflow: Aanpassingen in Cursor → Online

## 📝 Simpele Workflow (3 stappen)

### Stap 1: Pas Code Aan in Cursor
- Open bestanden in Cursor
- Maak je aanpassingen
- Sla op (Cmd+S / Ctrl+S)

### Stap 2: Test Lokaal (Optioneel maar Aanbevolen)
Open terminal in Cursor:
```bash
npm run dev
```
→ Opent op http://localhost:5173
→ Test je veranderingen
→ Stop met Ctrl+C

### Stap 3: Deploy naar Online
In dezelfde terminal:
```bash
npm run deploy
```

**Dat is alles!** 🎉

---

## 📋 Wat doet `npm run deploy`?

Het script vraagt je:

1. **"Uncommitted changes found. Commit? (y/n):"**
   - Type `y` → Vraagt om commit message
   - Type je message (bijv. "Fix button styling")
   - Of type `n` → Slaat commit over (je kunt later zelf committen)

2. **Build**
   - Bouwt automatisch de app
   - Checkt op errors

3. **Push naar GitHub**
   - Pusht automatisch naar `main` branch
   - Vercel pikt dit automatisch op

4. **Deploy**
   - Vercel deployt automatisch binnen 1-2 minuten

---

## 💻 Terminal in Cursor Openen

### Optie 1: Integrated Terminal
- **Mac:** `` Ctrl + ` `` (backtick, links van de 1)
- **Windows/Linux:** `` Ctrl + ` ``
- Of: **View → Terminal**

### Optie 2: Command Palette
- **Mac:** `Cmd + Shift + P`
- **Windows/Linux:** `Ctrl + Shift + P`
- Type: "Terminal: Create New Terminal"

---

## 🎯 Voorbeeld Workflow

### Scenario: Button Kleur Aanpassen

1. **Open bestand:**
   ```
   src/styles/components.css
   ```

2. **Pas aan:**
   ```css
   .btn {
     background: blue; /* was red */
   }
   ```

3. **Sla op:** `Cmd+S`

4. **Test lokaal (optioneel):**
   ```bash
   npm run dev
   ```
   → Check in browser of het goed is

5. **Deploy:**
   ```bash
   npm run deploy
   ```
   → Vraagt: "Commit? (y/n)" → Type `y`
   → Vraagt: "Commit message?" → Type "Change button color to blue"
   → Klaar! 🚀

6. **Wacht 1-2 minuten**
   → Check je Vercel dashboard
   → Je verandering is online!

---

## ⚡ Snelle Deploy (Zonder Testen)

Als je zeker bent dat het werkt:

```bash
npm run deploy
```

→ Vraagt om commit → Type `y` + message
→ Automatisch gebouwd en gedeployed!

---

## 🔍 Na Deploy

### Check Status:
1. **Vercel Dashboard:** https://vercel.com/dashboard
   - Klik op je project
   - Zie "Deployments" tab
   - Laatste deployment toont status

2. **GitHub:**
   - https://github.com/reiger65/innato-flute
   - Zie je laatste commit
   - Vercel linkt automatisch

### Test Online:
- Ga naar je Vercel URL (bijv. `https://innato-flute.vercel.app`)
- Refresh de pagina (Cmd+R / Ctrl+R)
- Check of je verandering zichtbaar is

---

## 🛠️ Alternatieve Commands

### Alleen Builden (Zonder Deploy):
```bash
npm run build
```
→ Bouwt app, maar deployt niet

### Alleen Pushen (Zonder Deploy):
```bash
git add .
git commit -m "Your message"
git push
```
→ Vercel deployt automatisch na push

### Handmatige Vercel Deploy:
```bash
vercel --prod
```
→ Direct deployen (als Vercel CLI geïnstalleerd is)

---

## ✅ Checklist per Aanpassing

- [ ] Code aangepast in Cursor
- [ ] Opgeslagen (Cmd+S / Ctrl+S)
- [ ] Getest lokaal? (`npm run dev`)
- [ ] Gedeployed (`npm run deploy`)
- [ ] Gecheckt online (Vercel URL)

---

## 🎯 Tips

1. **Commit messages zijn handig:**
   - Beschrijf wat je deed: "Fix bug in composer"
   - Helpt later om terug te vinden wat je deed

2. **Test eerst lokaal:**
   - `npm run dev` = snel testen
   - Voorkomt broken deploys

3. **Kleine aanpassingen?**
   - Gewoon `npm run deploy` → werkt altijd!

4. **Grote aanpassingen?**
   - Test eerst lokaal
   - Deploy dan met `npm run deploy`

---

## 🚨 Troubleshooting

### "Build failed"
→ Check terminal voor errors
→ Fix de error
→ Probeer opnieuw: `npm run deploy`

### "Push failed"
→ Check of je internet hebt
→ Check GitHub credentials
→ Probeer opnieuw

### "Deploy werkt niet"
→ Vercel deployt automatisch na GitHub push
→ Check Vercel dashboard → Deployments
→ Als deployment faalt, zie je errors daar

---

## 🎊 Klaar!

**Vanaf nu:**
1. Pas aan in Cursor
2. `npm run deploy`
3. Klaar! 🚀

**Zo simpel is het!** ✨

