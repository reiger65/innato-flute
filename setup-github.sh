#!/bin/bash

# INNATO Flute - GitHub Setup Helper
# Helpt je door het GitHub setup proces

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔗 GitHub Repository Setup"
echo "=========================================="
echo ""

# Check if git is already initialized
if [ ! -d ".git" ]; then
    echo -e "${BLUE}Initialiseren Git...${NC}"
    git init
fi

# Check if remote already exists
if git remote get-url origin 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Git remote 'origin' bestaat al${NC}"
    current_remote=$(git remote get-url origin)
    echo "Huidige remote: ${BLUE}$current_remote${NC}"
    echo ""
    read -p "Wil je deze vervangen? (y/n): " replace
    if [ "$replace" = "y" ]; then
        git remote remove origin
    else
        echo "Gebruik bestaande remote."
        exit 0
    fi
fi

echo ""
echo "Stap 1: GitHub Repository Aanmaken"
echo "-----------------------------------"
echo ""
echo "Als je nog geen repository hebt:"
echo ""
echo "1. Open: ${BLUE}https://github.com/new${NC}"
echo "2. Repository name: ${GREEN}innato-flute${NC}"
echo "3. Kies ${GREEN}Private${NC} (aanbevolen)"
echo "4. ${RED}DON'T${NC} check 'Add a README file'"
echo "5. Klik ${GREEN}'Create repository'${NC}"
echo ""
read -p "Druk Enter wanneer repository is aangemaakt..."

echo ""
echo "Stap 2: Repository URL"
echo "----------------------"
echo ""
echo "Na het aanmaken zie je een pagina met instructies."
echo "Kopieer de URL (bijv. https://github.com/jouw-username/innato-flute.git)"
echo ""
read -p "Plak hier je GitHub repository URL: " repo_url

if [ -z "$repo_url" ]; then
    echo -e "${RED}❌ URL is verplicht!${NC}"
    exit 1
fi

# Validate URL format
if [[ ! "$repo_url" =~ ^https://github.com/ ]] && [[ ! "$repo_url" =~ ^git@github.com: ]]; then
    echo -e "${RED}❌ Ongeldige GitHub URL. Gebruik: https://github.com/username/repo.git${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Git remote toevoegen...${NC}"
git remote add origin "$repo_url"

echo -e "${GREEN}✅ Remote toegevoegd: $repo_url${NC}"

echo ""
echo "Stap 3: Eerste Commit en Push"
echo "-----------------------------"
echo ""

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null || [ ! -f .git/HEAD ]; then
    echo -e "${BLUE}Bestanden toevoegen...${NC}"
    git add .
    
    echo ""
    read -p "Commit message (of Enter voor default): " commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Initial commit - INNATO Flute App"
    fi
    
    git commit -m "$commit_msg"
    echo -e "${GREEN}✅ Gecommit${NC}"
else
    echo -e "${YELLOW}Geen uncommitted changes gevonden${NC}"
fi

echo ""
echo -e "${BLUE}Branch naam instellen...${NC}"
git branch -M main 2>/dev/null || git branch -M master

echo ""
echo -e "${BLUE}Pushing naar GitHub...${NC}"
echo "Je wordt mogelijk gevraagd om GitHub credentials in te voeren."
echo ""

git push -u origin main 2>/dev/null || git push -u origin master

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Succesvol gepusht naar GitHub!${NC}"
    echo ""
    echo "Je code staat nu op GitHub!"
    echo ""
    echo "Volgende stap: Vercel setup (optioneel)"
    echo "Zie: ${BLUE}FIRST_TIME_SETUP.md${NC} of ${BLUE}SIMPLE_DEPLOY.md${NC}"
else
    echo ""
    echo -e "${RED}❌ Push gefaald${NC}"
    echo ""
    echo "Mogelijke oorzaken:"
    echo "- Authenticatie probleem (gebruik GitHub Personal Access Token)"
    echo "- Repository bestaat niet of je hebt geen toegang"
    echo ""
    echo "Probeer handmatig:"
    echo "  ${BLUE}git push -u origin main${NC}"
fi

echo ""
echo "=========================================="




