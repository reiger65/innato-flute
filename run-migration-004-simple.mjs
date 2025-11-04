/**
 * Execute Migration 004 via Supabase REST API
 * Uses fetch to execute SQL via Supabase's Management API
 */

const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3NTI1MywiZXhwIjoyMDc3NjUxMjUzfQ.4GwYg8QJ0BQAPwp1_CY8NkeFBAEENAUI-yNhI881gHQ'

// SQL from migration file
const sql = `
-- Add missing columns if they don't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Create index for custom_id lookups (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_lessons_custom_id ON lessons(custom_id) WHERE custom_id IS NOT NULL;

-- Create index for user_id lookups (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(created_by) WHERE created_by IS NOT NULL;
`

console.log('🚀 Executing migration 004 via Supabase REST API...')
console.log('')

// Try executing via Supabase REST API endpoint
// Note: Supabase doesn't expose raw SQL execution via standard REST API
// We'll try using the Management API endpoint

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
  },
  body: JSON.stringify({ sql: sql })
})

if (response.ok) {
  const result = await response.json()
  console.log('✅ Migration executed successfully!')
  console.log('Result:', result)
} else {
  const errorText = await response.text()
  console.log('❌ Direct API execution not available')
  console.log('Error:', errorText)
  console.log('')
  console.log('💡 Since Supabase doesn\'t expose raw SQL execution via REST API,')
  console.log('   please execute this SQL manually in the Supabase Dashboard:')
  console.log('')
  console.log('1. Open: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
  console.log('2. Copy and paste the SQL below:')
  console.log('')
  console.log('─'.repeat(80))
  console.log(sql)
  console.log('─'.repeat(80))
  console.log('')
  console.log('3. Click "Run" button')
  console.log('')
  
  // Try to open browser
  try {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    await execAsync(`open "https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new"`)
    console.log('✅ Opened SQL Editor in browser')
  } catch (error) {
    console.log('⚠️  Could not open browser automatically')
  }
  
  process.exit(1)
}


