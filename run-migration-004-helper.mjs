#!/usr/bin/env node

/**
 * Migration 004 Helper
 * Displays the SQL migration clearly for easy copy-paste into Supabase SQL Editor
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SQL_FILE = join(__dirname, 'migrations', '004_FIX_MISSING_CUSTOM_ID.sql')
const SQL_EDITOR_URL = 'https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new'

console.log('')
console.log('╔══════════════════════════════════════════════════════════════════════════════╗')
console.log('║                     MIGRATION 004: Add custom_id Columns                      ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════╝')
console.log('')
console.log('📋 Steps to execute:')
console.log('')
console.log('   1. Open Supabase SQL Editor:')
console.log(`      ${SQL_EDITOR_URL}`)
console.log('')
console.log('   2. Copy the SQL below (between the lines)')
console.log('')
console.log('   3. Paste into SQL Editor and click "Run"')
console.log('')
console.log('───────────────────────────────────────────────────────────────────────────────')
console.log('')
console.log(readFileSync(SQL_FILE, 'utf-8'))
console.log('')
console.log('───────────────────────────────────────────────────────────────────────────────')
console.log('')
console.log('✅ After execution, refresh your app and check the Manage Lessons modal')
console.log('')

