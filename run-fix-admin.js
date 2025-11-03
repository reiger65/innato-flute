/**
 * Script to fix admin account: confirm email and set admin role
 * Uses Supabase service_role key for direct database access
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Get credentials from environment or .env.local
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found!')
  console.log('')
  console.log('📋 Gebruik een van deze opties:')
  console.log('')
  console.log('Optie 1: Environment variable')
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="je-service-role-key"')
  console.log('  node run-fix-admin.js')
  console.log('')
  console.log('Optie 2: Direct in command')
  console.log('  SUPABASE_SERVICE_ROLE_KEY="je-key" node run-fix-admin.js')
  console.log('')
  console.log('Optie 3: In .env.local (tijdelijk)')
  console.log('  SUPABASE_SERVICE_ROLE_KEY=je-key')
  console.log('')
  console.log('⚠️  Let op: Service role key is zeer gevoelig! Verwijder na gebruik.')
  process.exit(1)
}

// Create Supabase client with service_role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Read SQL file
const sqlFile = path.join(process.cwd(), 'fix-admin-direct.sql')
const sql = fs.readFileSync(sqlFile, 'utf8')

console.log('🔧 Running fix-admin-direct.sql...')
console.log('📧 Target: info@stonewhistle.com')
console.log('')

// Execute SQL via Supabase REST API (rpc call)
// Note: Direct SQL execution requires using the REST API with service_role
async function executeSQL() {
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 0)
    
    console.log(`📝 Executing ${statements.length} SQL statement(s)...`)
    
    // For each statement, execute via Supabase
    // Note: Supabase JS client doesn't support raw SQL directly
    // We need to use the REST API or execute via RPC
    // However, for DML like UPDATE, we can use the REST API
    
    // Actually, the best way is to use the Supabase Management API
    // But for simplicity, let's just construct the UPDATE manually
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: sql 
    }).catch(async () => {
      // If RPC doesn't exist, try direct REST API call
      // We'll do the UPDATE manually using Supabase client methods
      
      // Get the user first
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        throw new Error(`Cannot list users: ${listError.message}`)
      }
      
      const user = users.users.find(u => u.email === 'info@stonewhistle.com')
      
      if (!user) {
        throw new Error('User info@stonewhistle.com not found')
      }
      
      // Update user metadata and confirm email
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            username: 'admin',
            role: 'admin'
          },
          email_confirm: true // This should confirm the email
        }
      )
      
      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`)
      }
      
      return { data: updateData, error: null }
    })
    
    if (error) {
      throw error
    }
    
    console.log('✅ Success! Admin account updated:')
    console.log('   - Email confirmed: ✅')
    console.log('   - Admin role set: ✅')
    console.log('   - Username set: admin')
    console.log('')
    console.log('🧪 Test nu online login:')
    console.log('   Email: info@stonewhistle.com')
    console.log('   Password: InnatoAdmin2024!')
    
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

executeSQL()




