/**
 * Simple script to fix admin account via Supabase Admin API
 * Usage: SUPABASE_SERVICE_ROLE_KEY="your-key" node run-fix-admin-simple.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2]

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required!')
  console.log('')
  console.log('📋 Gebruik:')
  console.log('   SUPABASE_SERVICE_ROLE_KEY="your-key" node run-fix-admin-simple.mjs')
  console.log('')
  console.log('   OF: node run-fix-admin-simple.mjs "your-key"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAdminAccount() {
  try {
    console.log('🔍 Looking for user: info@stonewhistle.com...')
    
    // List all users to find our admin
    const { data, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`)
    }
    
    const user = data.users.find(u => u.email === 'info@stonewhistle.com')
    
    if (!user) {
      console.error('❌ User info@stonewhistle.com not found!')
      console.log('')
      console.log('💡 Maak het account eerst aan via Supabase Dashboard')
      process.exit(1)
    }
    
    console.log(`✅ User found: ${user.id}`)
    console.log('   Current status:')
    console.log(`   - Email confirmed: ${user.email_confirmed_at ? '✅' : '❌'}`)
    console.log(`   - Metadata:`, user.user_metadata || 'none')
    console.log('')
    console.log('🔧 Updating user...')
    
    // Update user: confirm email and set admin role
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          username: 'admin',
          role: 'admin'
        },
        email_confirm: true
      }
    )
    
    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }
    
    console.log('✅ Success! Admin account updated:')
    console.log(`   - Email: ${updatedUser.user.email}`)
    console.log(`   - Email confirmed: ✅`)
    console.log(`   - Username: ${updatedUser.user.user_metadata?.username || 'admin'}`)
    console.log(`   - Role: ${updatedUser.user.user_metadata?.role || 'admin'}`)
    console.log('')
    console.log('🧪 Test nu online login:')
    console.log('   Email: info@stonewhistle.com')
    console.log('   Password: InnatoAdmin2024!')
    console.log('')
    console.log('⚠️  Verwijder de service_role key uit je terminal history!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('')
    console.log('💡 Alternatief: Voer het SQL script handmatig uit:')
    console.log('   1. Ga naar: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
    console.log('   2. Kopieer fix-admin-direct.sql')
    console.log('   3. Plak en klik "Run"')
    process.exit(1)
  }
}

fixAdminAccount()




