#!/bin/bash

# INNATO Flute - Simple Deployment Script
# Voer dit uit om de app online te zetten: ./deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🚀 INNATO Flute - Deploy naar Online"
echo "=========================================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Git niet geïnitialiseerd${NC}"
    echo ""
    echo "Run eerst:"
    echo "  ${BLUE}git init${NC}"
    echo "  ${BLUE}git remote add origin https://github.com/jouw-username/innato-flute.git${NC}"
    exit 1
fi

# Check if we're on main/master branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    echo -e "${YELLOW}⚠️  Je bent op branch: ${current_branch}${NC}"
    read -p "Deployen naar deze branch? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Geannuleerd."
        exit 0
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  Je hebt uncommitted changes${NC}"
    echo ""
    git status --short
    echo ""
    read -p "Wil je deze eerst committen? (y/n): " commit_changes
    
    if [ "$commit_changes" = "y" ]; then
        read -p "Commit message: " commit_msg
        if [ -z "$commit_msg" ]; then
            commit_msg="Update: $(date +'%Y-%m-%d %H:%M')"
        fi
        git add .
        git commit -m "$commit_msg"
        echo -e "${GREEN}✅ Changes gecommit${NC}"
    else
        echo "Deploy zonder commit..."
    fi
fi

# Build
echo ""
echo -e "${BLUE}📦 Building...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build succesvol${NC}"

# Push to GitHub
echo ""
echo -e "${BLUE}📤 Pushing naar GitHub...${NC}"
git push origin "$current_branch"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Push failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code gepusht naar GitHub${NC}"

# Check if Vercel CLI is available
if command -v vercel &> /dev/null; then
    echo ""
    echo -e "${BLUE}🚀 Deployen naar Vercel...${NC}"
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment voltooid!${NC}"
    else
        echo -e "${YELLOW}⚠️  Vercel deployment gefaald, maar code staat op GitHub${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}ℹ️  Vercel CLI niet geïnstalleerd${NC}"
    echo ""
    echo "Code staat nu op GitHub."
    echo "Als je Vercel gebruikt met GitHub integration, wordt het automatisch gedeployed."
    echo ""
    echo "Of installeer Vercel CLI:"
    echo "  ${BLUE}npm i -g vercel${NC}"
    echo "  ${BLUE}vercel login${NC}"
    echo "  ${BLUE}vercel --prod${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Klaar!${NC}"
echo "=========================================="
echo ""
echo "Je wijzigingen zijn nu online!"




