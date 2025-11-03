#!/bin/bash
# Backup script for CSS files before making changes
# Usage: ./backup-css.sh

BACKUP_DIR="backups/css"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

# Backup components.css
if [ -f "src/styles/components.css" ]; then
    cp "src/styles/components.css" "$BACKUP_DIR/components_${TIMESTAMP}.css"
    echo "✓ Backed up components.css to $BACKUP_DIR/components_${TIMESTAMP}.css"
fi

# Keep only last 10 backups
cd "$BACKUP_DIR"
ls -t components_*.css 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
cd - > /dev/null

echo "Backup complete. Latest backup: components_${TIMESTAMP}.css"




