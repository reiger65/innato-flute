#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Eenvoudige Supabase setup voor Vercel"
echo ""

# Check login - als niet ingelogd, vraag om in te loggen
if ! vercel whoami &>/dev/null; then
    echo "⚠️  Je moet eerst inloggen bij Vercel."
    echo ""
    echo "   Dit script opent je browser."
    echo "   Klik op 'Continue with GitHub' en autoriseer."
    echo ""
    read -p "Druk op Enter om te beginnen met login..."
    vercel login
    echo ""
    echo "✅ Login voltooid! Even wachten..."
    sleep 2
fi

echo "✅ Je bent ingelogd bij Vercel"
echo ""

# Add environment variables
echo "📝 Environment variables toevoegen..."
echo ""

echo "→ VITE_SUPABASE_URL (production, preview, development)..."
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL production --yes
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL preview --yes
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL development --yes

echo ""
echo "→ VITE_SUPABASE_ANON_KEY (production, preview, development)..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY production --yes
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY preview --yes
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY development --yes

echo ""
echo "✅ Environment variables toegevoegd!"
echo ""
echo "🔄 Redeployen naar productie..."
vercel --prod --yes

echo ""
echo "🎉 KLAAR! Je app gebruikt nu Supabase online!"
echo "   Je data synchroniseert nu tussen alle devices!"





