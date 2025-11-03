#!/bin/bash

# INNATO Flute - GitHub Setup (Automatic)
# Gebruik: ./setup-github-auto.sh <repository-url>
# Bijvoorbeeld: ./setup-github-auto.sh https://github.com/hanshoukes/innato-flute.git

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

REPO_URL="$1"

echo "=========================================="
echo "🔗 GitHub Repository Setup (Automatic)"
echo "=========================================="
echo ""

# Check if URL is provided
if [ -z "$REPO_URL" ]; then
    echo -e "${RED}❌ Geen repository URL opgegeven!${NC}"
    echo ""
    echo "Gebruik:"
    echo "  ./setup-github-auto.sh https://github.com/jouw-username/innato-flute.git"
    echo ""
    echo "Of maak eerst een repository aan:"
    echo "  1. Ga naar: ${BLUE}https://github.com/new${NC}"
    echo "  2. Name: ${GREEN}innato-flute${NC}"
    echo "  3. Kies ${GREEN}Private${NC}"
    echo "  4. Klik ${GREEN}'Create repository'${NC}"
    echo "  5. Kopieer de URL en run dit script opnieuw"
    echo ""
    exit 1
fi

# Validate URL format
if [[ ! "$REPO_URL" =~ ^https://github.com/ ]] && [[ ! "$REPO_URL" =~ ^git@github.com: ]]; then
    echo -e "${RED}❌ Ongeldige GitHub URL format${NC}"
    echo "Verwacht: https://github.com/username/repo.git of git@github.com:username/repo.git"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${BLUE}Initialiseren Git...${NC}"
    git init
fi

# Check if remote already exists
if git remote get-url origin 2>/dev/null > /dev/null; then
    current_remote=$(git remote get-url origin)
    if [ "$current_remote" = "$REPO_URL" ]; then
        echo -e "${GREEN}✅ Remote bestaat al: $REPO_URL${NC}"
    else
        echo -e "${YELLOW}⚠️  Remote bestaat al met andere URL${NC}"
        echo "Huidig: ${BLUE}$current_remote${NC}"
        echo "Nieuw:  ${BLUE}$REPO_URL${NC}"
        git remote set-url origin "$REPO_URL"
        echo -e "${GREEN}✅ Remote bijgewerkt${NC}"
    fi
else
    echo -e "${BLUE}Remote toevoegen...${NC}"
    git remote add origin "$REPO_URL"
    echo -e "${GREEN}✅ Remote toegevoegd: $REPO_URL${NC}"
fi

echo ""
echo -e "${BLUE}Bestanden toevoegen...${NC}"
git add .

echo ""
echo -e "${BLUE}Commit maken...${NC}"
git commit -m "Initial commit - INNATO Flute App" || echo "Geen nieuwe wijzigingen om te committen"

echo ""
echo -e "${BLUE}Branch instellen...${NC}"
git branch -M main 2>/dev/null || true

echo ""
echo -e "${BLUE}Pushing naar GitHub...${NC}"
echo "Als je gevraagd wordt om credentials:"
echo "  - Gebruik je GitHub username"
echo "  - Gebruik een Personal Access Token (niet je wachtwoord)"
echo "  - Maak token aan op: ${BLUE}https://github.com/settings/tokens${NC}"
echo ""

if git push -u origin main 2>&1 | tee /tmp/git-push-output.log; then
    echo ""
    echo -e "${GREEN}✅ Succesvol gepusht naar GitHub!${NC}"
    echo ""
    echo "Je code staat nu op: ${BLUE}$REPO_URL${NC}"
    echo ""
    echo "Volgende stap: Vercel setup"
    echo "Zie: ${BLUE}FIRST_TIME_SETUP.md${NC} of ${BLUE}SIMPLE_DEPLOY.md${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Push gefaald - mogelijk authenticatie probleem${NC}"
    echo ""
    echo "Oplossingen:"
    echo "1. Maak een Personal Access Token: ${BLUE}https://github.com/settings/tokens${NC}"
    echo "   - Kies 'repo' scope"
    echo "   - Kopieer de token"
    echo ""
    echo "2. Gebruik de token als wachtwoord bij:"
    echo "   ${BLUE}git push -u origin main${NC}"
    echo ""
    echo "Of probeer opnieuw met:"
    echo "   ${BLUE}git push -u origin main${NC}"
fi

echo ""
echo "=========================================="




