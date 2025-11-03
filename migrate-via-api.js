/**
 * Migrate database via Supabase Management API
 * Requires service_role key
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment')
  console.log('')
  console.log('To get your service_role key:')
  console.log('1. Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/settings/api')
  console.log('2. Copy the "service_role" key (NOT the anon key!)')
  console.log('3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  console.log('4. Run this script again: node migrate-via-api.js')
  console.log('')
  console.log('⚠️  NEVER commit the service_role key to git!')
  process.exit(1)
}

// Read SQL
const sqlFile = join(__dirname, 'migrations', '001_initial_schema.sql')
const sql = readFileSync(sqlFile, 'utf-8')

console.log('🚀 Executing database migration via API...')
console.log('')

// Execute via Supabase Management API
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ sql })
})

if (response.ok) {
  const result = await response.json()
  console.log('✅ Migration successful!')
  console.log('Result:', result)
} else {
  const error = await response.text()
  console.error('❌ Migration failed:', error)
  console.log('')
  console.log('💡 Fallback: Execute manually in Supabase Dashboard')
  console.log('   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
}




