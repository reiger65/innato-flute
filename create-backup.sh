#!/bin/bash

# Complete Backup Script for INNATO Flute
# Creates a comprehensive backup of the entire project

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
BACKUP_NAME="innato-flute-complete-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "=========================================="
echo "📦 INNATO Flute - Complete Backup"
echo "=========================================="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create temporary backup directory
mkdir -p "${BACKUP_PATH}"

echo -e "${BLUE}📁 Backing up source code...${NC}"

# Backup source code (excluding node_modules, dist, .git)
tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='backups' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    -czf "${BACKUP_PATH}/source-code.tar.gz" \
    -C .. \
    $(basename "$(pwd)")

echo -e "${GREEN}✅ Source code backed up${NC}"

# Backup important files
echo -e "${BLUE}📄 Backing up important files...${NC}"

# Backup package files
cp package.json "${BACKUP_PATH}/"
cp package-lock.json "${BACKUP_PATH}/" 2>/dev/null || true

# Backup configuration files
cp vite.config.ts "${BACKUP_PATH}/" 2>/dev/null || true
cp tsconfig.json "${BACKUP_PATH}/" 2>/dev/null || true
cp tsconfig.app.json "${BACKUP_PATH}/" 2>/dev/null || true
cp tsconfig.node.json "${BACKUP_PATH}/" 2>/dev/null || true
cp vercel.json "${BACKUP_PATH}/" 2>/dev/null || true
cp eslint.config.js "${BACKUP_PATH}/" 2>/dev/null || true

# Backup migrations
if [ -d "migrations" ]; then
    cp -r migrations "${BACKUP_PATH}/"
    echo -e "${GREEN}✅ Migrations backed up${NC}"
fi

# Backup documentation
echo -e "${BLUE}📚 Backing up documentation...${NC}"
cp README.md "${BACKUP_PATH}/" 2>/dev/null || true
cp ARCHITECTURE.md "${BACKUP_PATH}/" 2>/dev/null || true
cp BACKUP-INSTRUCTIONS.md "${BACKUP_PATH}/" 2>/dev/null || true
cp LOGIN-STRATEGY-RECOMMENDATION.md "${BACKUP_PATH}/" 2>/dev/null || true

# Backup scripts
echo -e "${BLUE}🔧 Backing up scripts...${NC}"
cp deploy.sh "${BACKUP_PATH}/" 2>/dev/null || true
cp backup-all-data.js "${BACKUP_PATH}/" 2>/dev/null || true
cp cleanup-backups.sh "${BACKUP_PATH}/" 2>/dev/null || true

# Create git info file
echo -e "${BLUE}📝 Creating git info...${NC}"
{
    echo "Git Repository Info"
    echo "==================="
    echo ""
    echo "Current Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "Latest Commit: $(git log -1 --pretty=format:'%h - %s (%an, %ar)' 2>/dev/null || echo 'N/A')"
    echo ""
    echo "Git Status:"
    git status --short 2>/dev/null || echo "N/A"
} > "${BACKUP_PATH}/git-info.txt"

# Create backup manifest
echo -e "${BLUE}📋 Creating backup manifest...${NC}"
{
    echo "INNATO Flute Complete Backup"
    echo "============================="
    echo ""
    echo "Timestamp: $(date)"
    echo "Backup Name: ${BACKUP_NAME}"
    echo ""
    echo "Contents:"
    echo "- Source code (tar.gz)"
    echo "- Configuration files"
    echo "- Migrations"
    echo "- Documentation"
    echo "- Scripts"
    echo "- Git info"
    echo ""
    echo "File sizes:"
    du -sh "${BACKUP_PATH}"/* 2>/dev/null | while read size file; do
        echo "  ${size} $(basename "$file")"
    done
} > "${BACKUP_PATH}/MANIFEST.txt"

# Create final archive
echo -e "${BLUE}📦 Creating final archive...${NC}"
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
cd ..

# Remove temporary directory
rm -rf "${BACKUP_PATH}"

# Calculate backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Backup Complete!${NC}"
echo "=========================================="
echo ""
echo "Backup Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Backup Size: ${BACKUP_SIZE}"
echo ""
echo "To restore:"
echo "  tar -xzf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

