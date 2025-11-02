#!/bin/bash

# INNATO Flute - Supabase Update Helper
# Helpt met het uitvoeren van database updates/migrations

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "INNATO Flute - Supabase Update Helper"
echo "=========================================="
echo ""

# Check if migrations directory exists
if [ ! -d "migrations" ]; then
    echo -e "${RED}❌ migrations/ directory bestaat niet${NC}"
    exit 1
fi

# List available migrations
echo "Beschikbare migraties:"
echo "----------------------"
ls -1 migrations/*.sql 2>/dev/null | while read file; do
    echo -e "${BLUE}  $(basename "$file")${NC}"
done
echo ""

# Ask which migration to run
read -p "Welke migratie wil je uitvoeren? (nummer of 'all' voor alle): " migration_choice

if [ "$migration_choice" = "all" ]; then
    echo ""
    echo "⚠️  Je gaat ALLE migraties uitvoeren. Zorg dat je een backup hebt gemaakt!"
    read -p "Doorgaan? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Geannuleerd."
        exit 0
    fi
    
    # Execute all migrations in order
    for file in migrations/*.sql; do
        if [ -f "$file" ] && [[ ! "$file" =~ rollback ]]; then
            echo ""
            echo -e "${BLUE}Uitvoeren: $(basename "$file")${NC}"
            echo "----------------------------------------"
            echo ""
            echo "1. Open Supabase SQL Editor"
            echo "2. Open bestand: ${GREEN}$file${NC}"
            echo "3. Kopieer alle inhoud"
            echo "4. Plak in SQL Editor"
            echo "5. Klik Run"
            echo ""
            read -p "Druk Enter wanneer klaar..."
        fi
    done
else
    # Find specific migration
    migration_file=$(find migrations -name "*${migration_choice}*" -type f | head -1)
    
    if [ -z "$migration_file" ]; then
        echo -e "${RED}❌ Migratie niet gevonden${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}Migratie gevonden: $(basename "$migration_file")${NC}"
    echo ""
    echo "⚠️  Zorg dat je een backup hebt gemaakt!"
    echo ""
    echo "1. Open Supabase SQL Editor"
    echo "2. Open bestand: ${GREEN}$migration_file${NC}"
    echo "3. Kopieer alle inhoud"
    echo "4. Plak in SQL Editor"
    echo "5. Klik Run"
    echo ""
    read -p "Druk Enter wanneer klaar..."
fi

echo ""
echo -e "${GREEN}✅ Update voltooid!${NC}"
echo ""
echo "Test de app om te verifiëren dat alles werkt:"
echo "  ${BLUE}npm run dev${NC}"


