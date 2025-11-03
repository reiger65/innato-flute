/**
 * Script om admin account direct in Supabase aan te maken
 * Voer dit uit in de browser console van je Supabase dashboard
 * OF gebruik dit in Node.js met Supabase admin client
 */

// Method 1: Via Supabase Dashboard (browser console)
// Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users
// Open browser console (F12)
// Plak dit script:

async function createAdminUser() {
    const email = 'info@stonewhistle.com'
    const password = 'InnatoAdmin2024!'
    
    // Dit werkt alleen als je ingelogd bent in Supabase dashboard
    // Je moet dit handmatig doen via de UI of via een server-side script
    console.log('Gebruik de Supabase Dashboard UI om het account aan te maken:')
    console.log('1. Ga naar: Authentication → Users')
    console.log('2. Klik "Add user" → "Create new user"')
    console.log('3. Email:', email)
    console.log('4. Password:', password)
    console.log('5. Zet "Auto Confirm User" AAN')
    console.log('6. Klik "Create User"')
}

createAdminUser()




