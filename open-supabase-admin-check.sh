#!/bin/bash
echo "🔍 Opening Supabase Admin Check..."
echo ""
echo "1. Authentication Users:"
open "https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users" 2>/dev/null
echo "   ✅ Opened: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/auth/users"
echo ""
echo "2. SQL Editor (to run check query):"
open "https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new" 2>/dev/null
echo "   ✅ Opened: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new"
echo ""
echo "📋 Check in Authentication → Users:"
echo "   - Zoek: info@stonewhistle.com"
echo "   - Email Confirmed: Moet TRUE zijn"
echo "   - User Metadata: Moet role: admin bevatten"
