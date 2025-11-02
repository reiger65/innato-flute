#!/bin/bash

echo "🔧 Fixing Vercel environment variables via CLI..."
echo ""

# Check if logged in
if ! vercel whoami &>/dev/null; then
    echo "📱 Je moet eerst inloggen..."
    vercel login
    echo ""
fi

echo "✅ Ingelogd bij Vercel"
echo ""

# Remove existing (if any) - this will fail if they don't exist, that's ok
echo "🗑️  Verwijderen bestaande env vars (als ze bestaan)..."
vercel env rm VITE_SUPABASE_URL production --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_URL preview --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_URL development --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_ANON_KEY production --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_ANON_KEY preview --yes 2>/dev/null || true
vercel env rm VITE_SUPABASE_ANON_KEY development --yes 2>/dev/null || true

echo ""
echo "➕ Toevoegen nieuwe env vars..."

# Add URL for all environments
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL production
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL preview
echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL development

# Add KEY for all environments
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY production
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY preview
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY development

echo ""
echo "✅ Environment variables toegevoegd!"
echo ""
echo "🔍 Verificatie..."
vercel env ls

echo ""
echo "🚀 Nu redeployen..."
echo "   Ga naar: Deployments → ⋯ → Redeploy"
echo ""
echo "OF run dit commando:"
echo "   vercel --prod"
