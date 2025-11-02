# Quick Fix: Run RLS Policy Fix

## Option 1: Copy-Paste SQL (Easiest)

1. Open this link in your browser:
   ```
   https://supabase.com/dashboard/project/gkdzcdzgrlnkufqgfizj/sql/new
   ```

2. Copy this SQL code:

```sql
-- Fix RLS Policies to Allow ALL Users to Read Public Items

-- COMPOSITIONS - Fix Public Read Policy
DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;

CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (
        is_public = TRUE
    );

-- PROGRESSIONS - Fix Public Read Policy  
DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions;

CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (
        is_public = TRUE
    );
```

3. Paste it into the SQL Editor and click "Run"

## Option 2: Use Supabase CLI (if installed)

```bash
supabase db execute --file FIX-RLS-PUBLIC-ITEMS.sql
```

## What This Does

- Removes the old RLS policies that might filter by user
- Creates new policies that allow ANYONE (authenticated or anonymous) to read ALL public items
- This fixes the issue where iPhone only sees iPhone items and desktop only sees desktop items

## After Running

- Refresh your app on both iPhone and desktop
- Both should now see ALL public items from all users

