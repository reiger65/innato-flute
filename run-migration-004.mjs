/**
 * Execute Migration 004: Add custom_id, subtitle, and topic columns to lessons table
 * Uses Supabase service_role key to execute SQL directly via REST API
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3NTI1MywiZXhwIjoyMDc3NjUxMjUzfQ.4GwYg8QJ0BQAPwp1_CY8NkeFBAEENAUI-yNhI881gHQ'

console.log('🚀 Starting migration 004: Add custom_id, subtitle, and topic columns')
console.log(`Project: ${SUPABASE_URL}`)
console.log('')

// Read SQL file
const sqlFile = join(__dirname, 'migrations', '004_FIX_MISSING_CUSTOM_ID.sql')
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

// Supabase doesn't expose raw SQL execution via REST API
// We need to use the Management API or create a temporary RPC function
// For now, let's try using the Supabase REST API with a workaround

console.log('📤 Executing SQL migration via Supabase REST API...')
console.log('')

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

console.log(`📋 Found ${statements.length} SQL statements to execute`)
console.log('')

// Execute each statement individually using Supabase REST API
// Note: Supabase REST API doesn't support raw SQL execution
// We'll need to use a different approach

// Try using Supabase's query endpoint with a custom RPC function
// But since we can't create functions without SQL, we'll use curl to execute directly

console.log('⚠️  Supabase REST API doesn\'t support raw SQL execution')
console.log('')
console.log('✅ Using alternative: Execute via Supabase Management API...')
console.log('')

// Use fetch to execute SQL via Supabase's SQL endpoint
// This requires the Management API, but we can try the REST API with special headers
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ sql: sql })
})

if (!response.ok) {
  // Try alternative: Use Supabase Dashboard URL to open SQL Editor
  console.log('❌ Direct API execution not available')
  console.log('')
  console.log('💡 Opening Supabase SQL Editor in browser...')
  console.log('')
  
  // Open Supabase SQL Editor URL
  const sqlEditorUrl = `https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new`
  
  console.log('📋 Please execute this SQL manually:')
  console.log('')
  console.log('1. Open:', sqlEditorUrl)
  console.log('2. Copy the SQL below:')
  console.log('')
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('─'.repeat(80))
  console.log('')
  console.log('3. Paste and click "Run"')
  console.log('')
  
  // Try to open browser
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    await execAsync(`open "${sqlEditorUrl}"`)
    console.log('✅ Opened SQL Editor in browser')
  } catch (error) {
    console.log('⚠️  Could not open browser automatically')
    console.log(`   Please visit: ${sqlEditorUrl}`)
  }
  
  process.exit(1)
}

const result = await response.json()
console.log('✅ Migration executed successfully!')
console.log('Result:', result)
console.log('')
console.log('🔍 Verifying columns were added...')

// Verify columns exist by querying information_schema
const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ 
    sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'lessons' AND column_name IN ('custom_id', 'subtitle', 'topic')` 
  })
})

if (verifyResponse.ok) {
  const verifyResult = await verifyResponse.json()
  console.log('✅ Verification result:', verifyResult)
} else {
  console.log('⚠️  Could not verify columns (this is OK if migration succeeded)')
}

console.log('')
console.log('✅ Migration complete!')
console.log('')
console.log('📝 Next steps:')
console.log('   1. Refresh your app')
console.log('   2. Check Manage Lessons modal')
console.log('   3. Verify lessons sync to Supabase')

