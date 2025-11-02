#!/bin/bash
# Quick fix for RLS policies
# This script will open Supabase SQL Editor with the fix ready to paste

echo "================================================================================"
echo "RLS Policy Fix - Quick Guide"
echo "================================================================================"
echo ""
echo "This will fix the issue where iPhone and desktop see different items."
echo ""
echo "SQL CODE TO COPY:"
echo "================================================================================"
echo ""
cat << 'SQL'
-- Fix RLS Policies to Allow ALL Users to Read Public Items

DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;
CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (is_public = TRUE);

DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions;
CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (is_public = TRUE);
SQL
echo ""
echo "================================================================================"
echo ""
echo "Steps:"
echo "1. Open: https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new"
echo "2. Copy the SQL code above"
echo "3. Paste it into the SQL Editor"
echo "4. Click 'Run'"
echo "5. Refresh your app on both iPhone and desktop"
echo ""
echo "================================================================================"
