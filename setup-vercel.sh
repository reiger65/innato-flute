#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Supabase environment variables toevoegen aan Vercel..."
echo ""

# Check login
if ! vercel whoami &>/dev/null; then
    echo "📱 Je moet eerst inloggen bij Vercel (eenmalig)..."
    echo "   Dit opent je browser voor login."
    echo ""
    vercel login
    echo ""
fi

echo "✅ Ingelogd bij Vercel"
echo ""

# Add environment variables
echo "📝 Environment variables toevoegen..."

echo "   → VITE_SUPABASE_URL"
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL production
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL preview  
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL development

echo ""
echo "   → VITE_SUPABASE_ANON_KEY"
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY development

echo ""
echo "✅ Klaar! Redeployen..."
vercel --prod

echo ""
echo "🎉 Alles klaar! Je app gebruikt nu Supabase online!"
