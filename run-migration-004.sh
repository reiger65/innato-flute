#!/bin/bash

# Execute Migration 004: Add custom_id, subtitle, and topic columns to lessons table
# Uses Supabase Management API via curl

SUPABASE_URL="https://gkdzcdzgrlnkufqgfizj.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA3NTI1MywiZXhwIjoyMDc3NjUxMjUzfQ.4GwYg8QJ0BQAPwp1_CY8NkeFBAEENAUI-yNhI881gHQ"

echo "🚀 Starting migration 004: Add custom_id, subtitle, and topic columns"
echo "Project: $SUPABASE_URL"
echo ""

# Read SQL file
SQL_FILE="migrations/004_FIX_MISSING_CUSTOM_ID.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "✅ SQL file loaded: $SQL_FILE"
echo ""

# Supabase doesn't expose raw SQL execution via REST API
# We need to use the Management API or SQL Editor
# Since direct API execution isn't available, we'll use the Supabase Dashboard

echo "📤 Opening Supabase SQL Editor..."
echo ""

# Construct SQL Editor URL
SQL_EDITOR_URL="https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new"

# Read SQL content
SQL_CONTENT=$(cat "$SQL_FILE")

# URL encode the SQL (basic encoding)
ENCODED_SQL=$(echo "$SQL_CONTENT" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || echo "$SQL_CONTENT")

echo "💡 Please execute this SQL manually:"
echo ""
echo "1. Open: $SQL_EDITOR_URL"
echo ""
echo "2. Copy and paste the SQL below:"
echo ""
echo "────────────────────────────────────────────────────────────────────────────────"
cat "$SQL_FILE"
echo ""
echo "────────────────────────────────────────────────────────────────────────────────"
echo ""
echo "3. Click 'Run' button"
echo ""

# Try to open browser
if command -v open >/dev/null 2>&1; then
  open "$SQL_EDITOR_URL"
  echo "✅ Opened SQL Editor in browser"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$SQL_EDITOR_URL"
  echo "✅ Opened SQL Editor in browser"
else
  echo "⚠️  Could not open browser automatically"
  echo "   Please visit: $SQL_EDITOR_URL"
fi

echo ""
echo "📋 SQL to execute:"
echo ""
cat "$SQL_FILE"
echo ""

