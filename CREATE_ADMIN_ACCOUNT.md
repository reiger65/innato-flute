# Admin Account Setup

## Stap 1: Account Aanmaken
1. Open de app in je browser
2. Klik op de login button (rechtsboven)
3. Ga naar "Sign Up" tab
4. Vul in:
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`
   - **Username**: (optioneel, bijvoorbeeld "admin")
5. Klik op "Sign Up"

## Stap 2: Inloggen
1. Na account aanmaken, je bent automatisch ingelogd
2. Of log uit en log weer in met:
   - **Email**: `info@stonewhistle.com`
   - **Password**: `InnatoAdmin2024!`

## Troubleshooting

### "Invalid email or password" error
- **Oorzaak 1**: Account bestaat nog niet → Gebruik eerst "Sign Up"
- **Oorzaak 2**: Verkeerd wachtwoord → Controleer dat je `InnatoAdmin2024!` gebruikt (hoofdletter I, hoofdletter A, cijfers, uitroepteken)
- **Oorzaak 3**: Email typfout → Controleer `info@stonewhistle.com` (geen hoofdletters)

### Admin rechten niet zichtbaar
- Zorg dat je ingelogd bent
- Refresh de pagina
- Check of de email exact overeenkomt: `info@stonewhistle.com`

## Direct Account Maken (Browser Console)
Als je snel een account wilt maken zonder UI:

```javascript
// Open browser console (F12) en voer uit:
localStorage.setItem('innato-user', JSON.stringify([{
  id: 'user-' + Date.now(),
  email: 'info@stonewhistle.com',
  username: 'admin',
  role: 'admin',
  createdAt: Date.now()
}]));

// Daarna log in via de UI
```


