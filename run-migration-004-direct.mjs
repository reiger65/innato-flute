/**
 * Execute Migration 004: Add custom_id, subtitle, and topic columns to lessons table
 * Connects directly to PostgreSQL database using pg library
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'

const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase database connection details
// Use connection pooler (port 6543) instead of direct connection (port 5432)
// Connection string format: postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true
const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const DB_PASSWORD = 'Johannes@@==2025' // From SUPABASE_NEXT_STEPS.md
const DB_HOST = 'gkdzcdzgrlnkufqgfizj.supabase.co'
const DB_USER = 'postgres'
const DB_NAME = 'postgres'
const DB_PORT = 6543 // Use pooler port

// Construct connection string with pooler
const connectionString = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?pgbouncer=true`

console.log('🚀 Starting migration 004: Add custom_id, subtitle, and topic columns')
console.log(`Project: ${SUPABASE_URL}`)
console.log(`Database: ${DB_HOST}`)
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

// Create PostgreSQL client
const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL
  }
})

console.log('🔌 Connecting to database...')

try {
  await client.connect()
  console.log('✅ Connected to database')
  console.log('')
  console.log('📤 Executing SQL migration...')
  console.log('')
  
  // Execute SQL
  const result = await client.query(sql)
  
  console.log('✅ Migration executed successfully!')
  console.log('')
  console.log('Result:', result)
  console.log('')
  
  // Verify columns were added
  console.log('🔍 Verifying columns were added...')
  const verifyResult = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'lessons' 
    AND column_name IN ('custom_id', 'subtitle', 'topic')
  `)
  
  if (verifyResult.rows.length > 0) {
    console.log('✅ Columns found:')
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}`)
    })
  } else {
    console.log('⚠️  Columns not found (may need to refresh)')
  }
  
  console.log('')
  console.log('✅ Migration complete!')
  console.log('')
  console.log('📝 Next steps:')
  console.log('   1. Refresh your app')
  console.log('   2. Check Manage Lessons modal')
  console.log('   3. Verify lessons sync to Supabase')
  
  await client.end()
  
} catch (error) {
  console.error('❌ Error executing migration:', error.message)
  console.error('')
  console.error('Details:', error)
  console.error('')
  console.error('💡 Fallback: Execute manually')
  console.error('   1. Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
  console.error('   2. Copy SQL from migrations/004_FIX_MISSING_CUSTOM_ID.sql')
  console.error('   3. Paste and Run')
  
  await client.end()
  process.exit(1)
}

