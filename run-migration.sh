#!/bin/bash

# Supabase Migration Runner
# Opens the SQL file and guides you through manual execution

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "🚀 Supabase Database Migration"
echo "=========================================="
echo ""

SQL_FILE="migrations/001_initial_schema.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL file not found: $SQL_FILE"
    exit 1
fi

echo "✅ SQL file found: $SQL_FILE"
echo ""

# Open SQL Editor in browser
echo "🌐 Opening Supabase SQL Editor..."
open "https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new" 2>/dev/null || echo "Open manually: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new"

echo ""
echo "📋 Instructions:"
echo "-----------------"
echo ""
echo "1. ${BLUE}SQL Editor is now open${NC}"
echo ""
echo "2. ${GREEN}Open the SQL file:${NC}"
echo "   ${YELLOW}$SQL_FILE${NC}"
echo ""
echo "3. ${GREEN}Select ALL content${NC} (Cmd+A)"
echo ""
echo "4. ${GREEN}Copy${NC} (Cmd+C)"
echo ""
echo "5. ${GREEN}Paste${NC} into SQL Editor (Cmd+V)"
echo ""
echo "6. ${GREEN}Click "Run"${NC} (or Ctrl+Enter / Cmd+Enter)"
echo ""
echo "7. ⏳ Wait 5-10 seconds"
echo ""
echo "8. ✅ Should see: 'Success. No rows returned'"
echo ""
echo ""

# Try to open SQL file in default editor
echo "📂 Opening SQL file..."
open "$SQL_FILE" 2>/dev/null || code "$SQL_FILE" 2>/dev/null || echo "Open manually: $SQL_FILE"

echo ""
read -p "Press Enter when migration is complete..."

echo ""
echo "✅ Migration complete!"
echo ""
echo "Next: Test the app with 'npm run dev'"





