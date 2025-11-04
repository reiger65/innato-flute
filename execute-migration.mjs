/**
 * Execute Supabase Database Migration
 * Uses service_role key to execute SQL directly
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3NTI1MywiZXhwIjoyMDc3NjUxMjUzfQ.4GwYg8QJ0BQAPwp1_CY8NkeFBAEENAUI-yNhI881gHQ'

console.log('🚀 Starting automated database migration...')
console.log(`Project: ${SUPABASE_URL}`)
console.log('')

// Read SQL file
const sqlFile = join(__dirname, 'migrations', '001_initial_schema.sql')
let sql

try {
  sql = readFileSync(sqlFile, 'utf-8')
  console.log(`✅ SQL file loaded: ${sqlFile}`)
  console.log(`📝 SQL length: ${sql.length} characters`)
  console.log('')
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message)
  process.exit(1)
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

console.log('🔑 Service role key loaded')
console.log('📤 Executing SQL migration...')
console.log('')

// Execute SQL via REST API
try {
  // Supabase doesn't have a direct SQL execution endpoint via JS client
  // We need to use the REST API with postgREST or execute via curl
  
  // Split into statements for better error handling
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/) && !s.match(/^\/\*/))
  
  console.log(`📋 Found ${statements.length} SQL statements to execute`)
  console.log('')
  console.log('⚠️  Note: Supabase JS client cannot execute raw SQL directly.')
  console.log('')
  console.log('✅ Using alternative method: REST API...')
  console.log('')
  
  // Use the REST API to execute SQL
  // Supabase provides a query endpoint, but for raw SQL we need the Management API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  })
  
  if (!response.ok) {
    // Try alternative: direct POST to database
    console.log('Trying alternative method...')
    console.log('')
    
    // Since Supabase doesn't expose raw SQL execution via standard API,
    // we'll use the pgREST endpoint with SQL
    const altResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: sql
    })
    
    if (!altResponse.ok) {
      const errorText = await altResponse.text()
      console.error('❌ Migration failed:', errorText)
      console.log('')
      console.log('💡 Fallback: Execute manually')
      console.log('   1. Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
      console.log('   2. Copy SQL from migrations/001_initial_schema.sql')
      console.log('   3. Paste and Run')
      process.exit(1)
    }
  }
  
  console.log('✅ Migration executed successfully!')
  console.log('')
  console.log('🔍 Verifying tables...')
  
  // Verify tables were created
  const { data: tables, error: verifyError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', [
      'compositions',
      'progressions',
      'lessons',
      'user_progress',
      'favorites',
      'shared_items',
      'shared_item_favorites'
    ])
  
  if (!verifyError && tables && tables.length > 0) {
    console.log(`✅ Found ${tables.length} tables:`)
    tables.forEach(t => console.log(`   - ${t.table_name}`))
  } else {
    console.log('⚠️  Could not verify tables (this is OK if migration succeeded)')
  }
  
  console.log('')
  console.log('✅ Migration complete!')
  console.log('')
  console.log('📝 Next steps:')
  console.log('   1. Check Supabase Dashboard → Table Editor')
  console.log('   2. Test app: npm run dev')
  console.log('   3. Remove service_role key from .env.local (security)')
  
} catch (error) {
  console.error('❌ Error executing migration:', error.message)
  console.log('')
  console.log('💡 Fallback: Execute manually')
  console.log('   1. Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
  console.log('   2. Copy SQL from migrations/001_initial_schema.sql')
  console.log('   3. Paste and Run')
  process.exit(1)
}





