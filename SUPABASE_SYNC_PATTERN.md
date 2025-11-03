# Supabase Sync Pattern

This document describes the pattern used for syncing data between localStorage and Supabase across all services in the application.

## Overview

All data services should follow a unified pattern:
1. **Primary storage**: Supabase (when user is logged in and Supabase is configured)
2. **Fallback storage**: localStorage (for offline use and when not logged in)
3. **Auto-sync**: Local data syncs to Supabase on first load per session
4. **Bidirectional**: Changes sync to both Supabase and localStorage

## Pattern Implementation

### 1. Service Structure

Each service should have:
- `syncLocal[Entity]ToSupabase()`: One-time sync function that migrates localStorage → Supabase
- `load[Entity]()`: Loads from Supabase if available, falls back to localStorage
- `save[Entity]()`: Saves to both Supabase and localStorage
- `update[Entity]()`: Updates both Supabase and localStorage
- `delete[Entity]()`: Deletes from both Supabase and localStorage

### 2. Implementation Example

See `src/lib/lessonsService.ts` for a complete example. Key patterns:

```typescript
// Check if Supabase is configured
if (isSupabaseConfigured()) {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return localFallback()
    
    const user = getCurrentUser()
    if (!user) return localFallback() // Not logged in
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return localFallback()
    
    // Perform Supabase operation
    // ...
    
    // Also save to localStorage as backup
    localSave(data)
    return
  } catch (error) {
    console.error('[service] Error with Supabase, falling back:', error)
    return localFallback()
  }
}

// Fallback to localStorage
return localFallback()
```

### 3. Sync Strategy

**One-time sync per session:**
- Use `sessionStorage` to track if sync has occurred
- Sync key format: `[entity]-sync-${userId}`
- Only sync once per session to avoid duplicates

**Field Mapping:**
- Map between Supabase schema and local data format
- Handle null/undefined values gracefully
- Preserve all custom fields (like `custom_id` for lessons)

### 4. Services Already Implemented

✅ **Compositions** (`src/lib/compositionService.ts`)
- Syncs: name, chords, tempo, time_signature
- Uses: `compositions` table

✅ **Progressions** (`src/lib/progressionService.ts`)
- Syncs: name, chord_ids
- Uses: `progressions` table

✅ **Lessons** (`src/lib/lessonsService.ts`)
- Syncs: title, subtitle, topic, description, category, compositionId
- Uses: `lessons` table
- Includes custom_id mapping for sequential IDs

### 5. Future Services

When creating new services:

1. **Create Supabase table** (in `migrations/`)
   - Include `user_id` or `created_by` field
   - Add indexes for performance
   - Set up RLS policies

2. **Create service file** (`src/lib/[entity]Service.ts`)
   - Follow the pattern from `lessonsService.ts`
   - Implement sync, load, save, update, delete functions
   - Always fallback to localStorage

3. **Test locally** with:
   - Logged in user (Supabase sync)
   - Logged out user (localStorage only)
   - Offline mode (localStorage fallback)

4. **Update this document** with the new service

## Migration Steps

When migrating an existing service to Supabase:

1. Create migration SQL file (`migrations/XXX_[description].sql`)
2. Add fields to Supabase table if needed
3. Update service to follow sync pattern
4. Test with existing localStorage data
5. Deploy migration to Supabase (run SQL in Supabase dashboard)
6. Deploy code changes

## Best Practices

- **Always save to localStorage** as backup, even when Supabase succeeds
- **Handle errors gracefully** - never break the app if Supabase fails
- **Log sync operations** for debugging (use `console.log` with `[service]` prefix)
- **Use transactions** when possible for multi-step operations
- **Filter by user_id** to ensure data isolation
- **Preserve custom IDs** when mapping between formats (e.g., `lesson-1` → `custom_id`)

## Troubleshooting

**Data not syncing:**
- Check browser console for errors
- Verify Supabase credentials are set
- Verify user is logged in
- Check RLS policies allow access
- Verify table schema matches code expectations

**Duplicates appearing:**
- Check sync logic isn't running multiple times
- Verify `sessionStorage` sync key is working
- Check for race conditions in concurrent saves

**Missing fields:**
- Verify migration SQL was run in Supabase
- Check field mapping in service code
- Verify null/undefined handling

