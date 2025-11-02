# Admin Password Configuration

## Default Admin Password
**Password:** `InnatoAdmin2024!`

**⚠️ IMPORTANT:** Change this password in production!

## How to Change Admin Password

1. Generate a new hash by running this in the browser console:
```javascript
async function hashPassword(password) {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
const newHash = await hashPassword('YourNewSecurePassword123!')
console.log('New hash:', newHash)
```

2. Replace `ADMIN_PASSWORD_HASH` in `src/lib/localAuth.ts` with the new hash

3. For production, move password hash to secure database/config

## Admin Users
Admin access is granted to:
- Email: `admin@innato.com`
- Email: `hanshoukes@gmail.com`
- Email: `info@stonewhistle.com`
- Username: `admin`
- Username: `hanshoukes`
- Users with `role: 'admin'`

## Security Notes
- Currently uses SHA-256 (not salted) - suitable for local storage development
- For production: Use bcrypt/argon2 with salt
- Store password hash in secure database
- Never commit actual passwords to version control
- Use environment variables for sensitive configuration

