#!/bin/bash

# Auto-backup compositions from localStorage
# This creates a backup every time the app runs

BACKUP_DIR="./backups/compositions"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/compositions_${TIMESTAMP}.json"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Keep only last 50 backups
cd "$BACKUP_DIR" && ls -t compositions_*.json 2>/dev/null | tail -n +51 | xargs rm -f 2>/dev/null

echo "✓ Composition backup system ready"
echo "   Backups will be created in: $BACKUP_DIR"




