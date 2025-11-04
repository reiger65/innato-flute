# Simple Step-by-Step Guide: Run Migration 004

## Step 1: Open Supabase SQL Editor
Click this link (or copy-paste into your browser):
https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new

## Step 2: Copy this SQL (everything below the line)

───────────────────────────────────────────────────────────────────────────────

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS topic TEXT,
ADD COLUMN IF NOT EXISTS custom_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lessons_custom_id ON lessons(custom_id) WHERE custom_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(created_by) WHERE created_by IS NOT NULL;

───────────────────────────────────────────────────────────────────────────────

## Step 3: In Supabase SQL Editor
1. Paste the SQL above into the editor
2. Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
3. Wait for "Success" message

## Step 4: Done!
Refresh your app - the errors should be gone!

