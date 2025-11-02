#!/bin/bash
# 🚀 ALLES AUTOMATISCH - VOER DEZE UIT

cd "$(dirname "$0")"

echo ""
echo "═══════════════════════════════════════"
echo "   SUPABASE SETUP VOOR VERCEL"
echo "═══════════════════════════════════════"
echo ""

# Step 1: Login check
if ! vercel whoami &>/dev/null; then
    echo "📱 STAP 1: Login bij Vercel"
    echo "   → Je browser opent automatisch"
    echo "   → Klik op 'Continue with GitHub'"
    echo "   → Autoriseer de app"
    echo ""
    vercel login
    echo ""
fi

# Step 2: Add env vars
echo "📝 STAP 2: Environment variables toevoegen..."
echo ""

for env in production preview development; do
    echo "   → $env..."
    echo "https://gkdzcdzgrlnkufqgfizj.supabase.co" | vercel env add VITE_SUPABASE_URL $env 2>/dev/null || echo "      (al toegevoegd)"
    echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA" | vercel env add VITE_SUPABASE_ANON_KEY $env 2>/dev/null || echo "      (al toegevoegd)"
done

# Step 3: Deploy
echo ""
echo "🚀 STAP 3: Redeployen..."
vercel --prod --yes

echo ""
echo "═══════════════════════════════════════"
echo "   ✅ KLAAR! App gebruikt Supabase!"
echo "═══════════════════════════════════════"
echo ""

