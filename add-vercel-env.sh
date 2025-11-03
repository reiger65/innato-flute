#!/bin/bash

# Script om Supabase environment variables toe te voegen aan Vercel
# Gebruik: ./add-vercel-env.sh

echo "🚀 Adding Supabase environment variables to Vercel..."
echo ""

cd "$(dirname "$0")"

# Check of gebruiker ingelogd is
if ! vercel whoami &>/dev/null; then
    echo "⚠️  Je bent niet ingelogd bij Vercel."
    echo "    Voer eerst uit: vercel login"
    exit 1
fi

echo "✅ Vercel login gevonden"
echo ""

# Environment variables toevoegen voor production, preview en development
echo "📝 Adding VITE_SUPABASE_URL..."
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL production
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL preview
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL development

echo ""
echo "📝 Adding VITE_SUPABASE_ANON_KEY..."
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY development

echo ""
echo "✅ Environment variables toegevoegd!"
echo ""
echo "🔄 Nu moet je Vercel project redeployen:"
echo "   1. Ga naar: https://vercel.com/dashboard"
echo "   2. Klik op je project"
echo "   3. Klik op 'Redeploy'"
echo ""
echo "   OF voer uit: vercel --prod"
echo ""




