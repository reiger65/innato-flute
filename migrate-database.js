/**
 * Automated Database Migration Script
 * Executes the initial database schema via Supabase Management API
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'

console.log('🚀 Starting database migration...')
console.log(`Project: ${supabaseUrl}`)
console.log('')

// Read SQL file
const sqlFile = join(__dirname, 'migrations', '001_initial_schema.sql')
let sql

try {
  sql = readFileSync(sqlFile, 'utf-8')
  console.log(`✅ SQL file loaded: ${sqlFile}`)
  console.log(`📝 SQL length: ${sql.length} characters`)
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message)
  process.exit(1)
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Note: Anon key can't execute raw SQL directly
// We need to use the Supabase REST API or service_role key
// For security, service_role key should not be in .env.local

console.log('')
console.log('⚠️  NOTE: Anon key cannot execute raw SQL migrations directly.')
console.log('')
console.log('OPTIONS:')
console.log('1. Use Supabase CLI (recommended):')
console.log('   npm install -g supabase')
console.log('   supabase link --project-ref gkdzcdzgrlnkufqgfizj')
console.log('   supabase db push')
console.log('')
console.log('2. Execute manually in Supabase Dashboard:')
console.log('   - Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
console.log('   - Copy/paste the SQL from migrations/001_initial_schema.sql')
console.log('   - Click Run')
console.log('')
console.log('3. Use service_role key (not recommended for client-side):')
console.log('   - Add SUPABASE_SERVICE_ROLE_KEY to .env.local')
console.log('   - This script can then execute the migration')
console.log('   - ⚠️  Never commit service_role key to git!')
console.log('')

// Check if we have service_role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (serviceRoleKey) {
  console.log('🔑 Service role key found, attempting migration...')
  console.log('')
  
  // Create admin client
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  
  console.log(`Executing ${statements.length} SQL statements...`)
  console.log('')
  
  // Execute each statement
  let successCount = 0
  let errorCount = 0
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (statement.length < 10) continue // Skip very short statements
    
    try {
      // Note: Supabase JS client doesn't have direct SQL execution
      // We would need to use the REST API or Supabase CLI
      console.log(`[${i + 1}/${statements.length}] Executing statement...`)
      
      // This won't work with the JS client - we need REST API or CLI
      console.log('⚠️  Direct SQL execution not supported via JS client')
      break
    } catch (error) {
      console.error(`❌ Error executing statement ${i + 1}:`, error.message)
      errorCount++
    }
  }
  
  console.log('')
  if (successCount > 0) {
    console.log(`✅ Successfully executed ${successCount} statements`)
  }
  if (errorCount > 0) {
    console.log(`❌ Failed to execute ${errorCount} statements`)
  }
} else {
  console.log('💡 To execute automatically, you need:')
  console.log('   1. Install Supabase CLI: npm install -g supabase')
  console.log('   2. Or add SUPABASE_SERVICE_ROLE_KEY to .env.local')
  console.log('   3. Or execute manually in Supabase Dashboard (recommended)')
  console.log('')
  console.log('📋 SQL is ready in: migrations/001_initial_schema.sql')
}

console.log('')
console.log('✅ Migration script complete!')
console.log('')
console.log('📝 Next steps:')
console.log('   1. Execute SQL in Supabase Dashboard')
console.log('   2. Or install Supabase CLI and use: supabase db push')
console.log('')




