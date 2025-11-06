#!/bin/bash

# Cleanup script for old backups and unnecessary files
# Run this after creating a fresh backup

echo "🧹 Starting cleanup..."

# Keep only the most recent backup files
echo "📦 Cleaning old backup files..."
find . -maxdepth 1 -name "backup-*.tar.gz" -type f | sort -r | tail -n +2 | xargs rm -f 2>/dev/null || true
find . -maxdepth 1 -name "innato-backup-*.json" -type f | sort -r | tail -n +2 | xargs rm -f 2>/dev/null || true

# Clean up old backup scripts (keep only backup-all-data.js)
echo "📝 Cleaning old backup scripts..."
rm -f backup-compositions.sh backup-css.sh 2>/dev/null || true

# Clean up temporary sync scripts (keep them for now as they might be useful)
# rm -f force-sync-lessons.js sync-from-localhost.js sync-missing-lessons.js 2>/dev/null || true

# Clean up old HTML test/recovery files
echo "🧪 Cleaning old test/recovery HTML files..."
rm -f check-lessons-data.html check-storage.html deep-recovery.html delete-all.html recover-compositions.html test-community.html test-env-vars.html test-supabase.html create-admin-account.html 2>/dev/null || true

# Clean up old SQL files (keep migrations, remove temporary ones)
echo "🗄️ Cleaning old SQL files..."
rm -f check-admin-correct.sql check-admin-simple.sql fix-admin-account-now.sql fix-admin-account.sql fix-admin-direct.sql create-admin-direct.sql set-admin-role.sql fix-rls-for-safari.sql fix-triggers-only.sql CORRECT-QUERY-TO-COPY.sql CHECK-DATABASE-CONTENTS.sql 2>/dev/null || true

# Clean up old admin/vercel setup scripts (keep only essential ones)
echo "⚙️ Cleaning old setup scripts..."
rm -f run-fix-admin.js run-fix-admin-simple.mjs reset-admin-password.mjs create-admin-script.js verify-migration.js migrate-database.js migrate-via-api.js execute-migration.mjs 2>/dev/null || true
rm -f setup-github-auto.sh setup-github.sh setup-supabase.sh setup-vercel-simple.sh add-env-vars.sh add-vercel-env.sh fix-env-vars-via-cli.sh update-supabase.sh 2>/dev/null || true
rm -f fix-rls-simple.sh open-supabase-all.sh open-supabase-check.sh open-supabase-admin-check.sh run-migration.sh backup-compositions.sh backup-css.sh 2>/dev/null || true

# Clean up old documentation files (keep only essential ones)
echo "📚 Cleaning old documentation files..."
# Keep: README.md, ARCHITECTURE.md, and essential setup guides
# Remove: Old fix guides, debug guides, temporary docs
rm -f ADMIN_PASSWORD.md ADMIN-LOGIN-FIX.md ALTERNATIVE-FIX.md APP_REVIEW_REPORT.md AUTO_MIGRATE.md AUTOMATIC_DEPLOYMENT.md BACKUP-ANALYSIS.md BROWSER_RECOVERY_INSTRUCTIONS.md CHECK_MIGRATION.md CHECK-ADMIN-ACCOUNT.md CHECK-PROJECT-ENV-VARS.md CHECK-DATABASE-CONTENTS.sql COMMUNITY_STATUS.md COMPLETE_SUPABASE_SETUP.md CONSOLE-INSTRUCTIES.txt CREATE_ADMIN_ACCOUNT.md CREATE-ADMIN-ACCOUNT.md DEBUG-LOGIN.md DEBUG-NO-CONSOLE-LOGS.md DEBUG-PRODUCTION.md DEPLOYMENT_PLAN.md DEPLOYMENT_SETUP.md DEPLOYMENT_STATUS.md DEVELOPMENT_WORKFLOW.md DIRECT-PASSWORD-SET.md DOE-DIT.sh FIND-VERCEL-PROJECT.md FIRST_TIME_SETUP.md FIX-404-ERROR.md FIX-ADMIN-CORRECT.md FIX-ADMIN-LOGIN.md FIX-CONSOLE-FILTERS.md FIX-ENV-FINAL.md FIX-ENV-VARS-NOT-WORKING.md FIX-LOCALHOST.md FIX-PASSWORD-RESET-LINK.md FIX-REDIRECT-PROBLEM.md GET_SERVICE_KEY.md HOW-DEPLOYMENT-WORKS.md HOW-IT-WORKS.md HOW-TO-USE-CONSOLE.md IMPORTANT-FIX.md IMPROVEMENTS_STATUS.md MIGRATE_DATABASE_NOW.md NEXT-STEPS-AFTER-CHECK.md PHASE_0_1_2_SUMMARY.md QUICK_START_SUPABASE.md QUICK_UPDATE_GUIDE.md QUICK-FIX-ADMIN.md README_SETUP.md RESET-ADMIN-PASSWORD.md RESET-PASSWORD-SIMPLE.md RESET-PASSWORD.md SIMPLE_DEPLOY.md SOLVE-ENV-VARS-ISSUE.md SUPABASE_COMPLETE.md SUPABASE_MIGRATIONS.md SUPABASE_NEXT_STEPS.md SUPABASE_READY_SUMMARY.md SUPABASE_SETUP.md SUPABASE_STATUS.md TEAM-VS-PROJECT-ENV-VARS.md TEMP-FIX-APPLIED.md TEST-ADMIN-FUNCTIONS.md TEST-LOGIN-NOW.md USE-CORRECT-URL.md VERCEL_SETUP_GUIDE.md VERCEL-ENV-INSTRUCTIES.md VERCEL-ENV-QUICK-FIX.md VERCEL-SETUP-VOLTOOID.md VERIFY-ADMIN-ROLE.md VERIFY-ENV-STEPS.txt WAITING_FOR_KEY.md WORKFLOW_CURSOR.md 2>/dev/null || true

# Clean up backups directory (keep structure but remove old files)
if [ -d "backups" ]; then
    echo "📁 Cleaning backups directory..."
    find backups -type f -name "*.tar.gz" -mtime +30 -delete 2>/dev/null || true
fi

echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "   - Old backup files removed"
echo "   - Temporary test files removed"
echo "   - Old SQL files removed"
echo "   - Old setup scripts removed"
echo "   - Old documentation files removed"
echo ""
echo "💡 Kept essential files:"
echo "   - backup-all-data.js (backup script)"
echo "   - README.md"
echo "   - ARCHITECTURE.md"
echo "   - migrations/ directory"
echo "   - vercel.json"
echo "   - package.json and essential config files"




