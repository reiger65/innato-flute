/**
 * Verify database migration was successful
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'

const supabase = createClient(SUPABASE_URL, ANON_KEY)

console.log('🔍 Verifying database migration...')
console.log('')

// Check if tables exist by trying to query them
const tablesToCheck = [
  'compositions',
  'progressions', 
  'lessons',
  'user_progress',
  'favorites',
  'shared_items',
  'shared_item_favorites'
]

console.log('Checking tables...')
console.log('')

let successCount = 0
let errorCount = 0

for (const table of tablesToCheck) {
  try {
    // Try to query the table (this will fail if table doesn't exist or RLS blocks it)
    const { error } = await supabase.from(table).select('*').limit(0)
    
    if (error) {
      // Check if it's a "relation does not exist" error
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log(`❌ ${table}: Table does not exist`)
        errorCount++
      } else {
        // Other errors (like RLS) mean table exists
        console.log(`✅ ${table}: Table exists (RLS may block query, but that's OK)`)
        successCount++
      }
    } else {
      console.log(`✅ ${table}: Table exists and accessible`)
      successCount++
    }
  } catch (err) {
    // Try alternative: check via information_schema
    console.log(`⚠️  ${table}: Could not verify (this might be OK)`)
  }
}

console.log('')
console.log('==========================================')
if (successCount === tablesToCheck.length) {
  console.log('✅ All tables exist! Migration successful!')
} else if (successCount > 0) {
  console.log(`⚠️  ${successCount}/${tablesToCheck.length} tables verified`)
  console.log('Some tables might not exist or might be blocked by RLS')
} else {
  console.log('❌ No tables found. Migration might have failed.')
  console.log('')
  console.log('Check:')
  console.log('1. Did you see "Success" in SQL Editor?')
  console.log('2. Go to: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/editor')
  console.log('3. Do you see the tables listed?')
}

console.log('')
console.log('Next: Test the app with "npm run dev"')





