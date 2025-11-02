/**
 * Reset Admin Password via Supabase Admin API
 * Run: node reset-admin-password.mjs
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3NTI1MywiZXhwIjoyMDc3NjUxMjUzfQ.4GwYg8QJ0BQAPwp1_CYNkeFBAEENAUI-yNhI881gHQ'
const newPassword = 'InnatoAdmin2024!'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetPassword() {
  console.log('🔑 Resetting password for info@stonewhistle.com...')
  
  try {
    // Find user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      return
    }
    
    const user = users.users.find(u => u.email === 'info@stonewhistle.com')
    
    if (!user) {
      console.error('❌ User not found: info@stonewhistle.com')
      return
    }
    
    console.log('✅ User found:', user.id)
    
    // Reset password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: newPassword
      }
    )
    
    if (error) {
      console.error('❌ Error resetting password:', error)
      return
    }
    
    console.log('✅ Password reset successful!')
    console.log('   Email:', data.user.email)
    console.log('   New password:', newPassword)
    console.log('')
    console.log('🎯 Nu kun je inloggen met:')
    console.log('   Email: info@stonewhistle.com')
    console.log('   Password: InnatoAdmin2024!')
    
  } catch (error) {
    console.error('❌ Exception:', error)
  }
}

resetPassword()
