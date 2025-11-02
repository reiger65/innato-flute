#!/usr/bin/env node
/**
 * Auto-Fix RLS Policies for Public Items
 * 
 * This script automatically fixes the RLS policies via Supabase Management API
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key node fix-rls-auto.js
 * 
 * Or set in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=your_key
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found!')
  console.log('')
  console.log('To fix RLS policies automatically, you need:')
  console.log('1. Get your service_role key from: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/settings/api')
  console.log('2. Run: SUPABASE_SERVICE_ROLE_KEY=your_key node fix-rls-auto.js')
  console.log('')
  console.log('Alternatively, run the SQL manually:')
  console.log('   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
  console.log('')
  console.log('SQL to copy:')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`
-- Fix RLS Policies to Allow ALL Users to Read Public Items

DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;
CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (is_public = TRUE);

DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions;
CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (is_public = TRUE);
  `)
  console.log('─────────────────────────────────────────────────────────────────')
  process.exit(1)
}

console.log('🔧 Fixing RLS Policies...')
console.log('')

// Create admin client with service_role key
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// SQL statements to execute
const sqlStatements = [
  `DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions`,
  `CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (is_public = TRUE)`,
  `DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions`,
  `CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (is_public = TRUE)`
]

async function executeSQL() {
  try {
    // Supabase JS client doesn't support direct SQL execution
    // We need to use the REST API with Management API
    console.log('⚠️  Supabase JS client cannot execute raw SQL directly.')
    console.log('')
    console.log('✅ Using REST API approach...')
    console.log('')
    
    // Try using the Management API endpoint
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ 
        query: sqlStatements.join(';') 
      })
    })
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`)
    }
    
    console.log('✅ RLS policies updated successfully!')
    console.log('')
    console.log('🔄 Refresh your app on both iPhone and desktop to see all public items.')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('')
    console.log('💡 Fallback: Execute SQL manually in Supabase Dashboard')
    console.log('   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new')
    console.log('')
    console.log('Copy this SQL:')
    console.log('─────────────────────────────────────────────────────────────────')
    console.log(sqlStatements.join(';\n\n') + ';')
    console.log('─────────────────────────────────────────────────────────────────')
    process.exit(1)
  }
}

executeSQL()

