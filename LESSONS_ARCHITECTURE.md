# Lessons Architecture

## Overview

Lessons are **global** (visible to all users), while **progress** is **user-specific** (requires login).

## Architecture

### Lessons (Global)
- **Who can view**: Everyone (anonymous and authenticated users)
- **Who can manage**: Admins only (create, update, delete)
- **Storage**: Supabase `lessons` table
- **No authentication required** to view lessons

### Progress (User-Specific)
- **Who can view**: Logged-in users (their own progress only)
- **Who can manage**: Logged-in users (their own progress only)
- **Storage**: Supabase `user_progress` table + localStorage fallback
- **Authentication required** to save/view progress

## User Experience

### Without Login
- ✅ Can view all lessons (title, subtitle, topic, description, category)
- ✅ Can practice lessons (play compositions)
- ❌ Cannot save progress
- ❌ Progress is stored locally only (device-specific)

### With Login
- ✅ Can view all lessons (same as above)
- ✅ Can practice lessons
- ✅ Can save progress (synced across devices)
- ✅ Progress persists across sessions and devices

## Implementation

### Loading Lessons
```typescript
// No authentication required
const lessons = await loadLessons() // Loads from Supabase (global)
```

### Loading Progress
```typescript
// Requires authentication (falls back to localStorage if not logged in)
const progress = await loadLessonProgress() // User-specific
```

### Saving Progress
```typescript
// Requires authentication (saves to Supabase + localStorage)
await saveLessonProgress(lessonId, completed) // User-specific
```

## Database Schema

### `lessons` Table
- `id` (UUID): Primary key
- `custom_id` (TEXT): Sequential ID like "lesson-1", "lesson-2"
- `title`, `subtitle`, `topic`, `description`, `category`: Lesson content
- `composition_id`: Reference to composition
- `created_by`: Admin who created the lesson (for tracking)
- **RLS**: Anyone can read, only admins can write

### `user_progress` Table
- `id` (UUID): Primary key
- `user_id` (UUID): User who completed the lesson
- `lesson_id` (UUID): Reference to lesson (UUID, not custom_id)
- `completed_at`: Timestamp
- `progress_data`: JSONB with extra data
- **RLS**: Users can only read/write their own progress

## Migration Path

1. **Run SQL migrations**:
   - `002_add_lesson_fields.sql` - Adds subtitle, topic, custom_id
   - `003_make_lessons_global.sql` - Updates RLS policies

2. **Admin syncs local lessons**:
   - Admin runs `syncLocalLessonsToSupabase()` manually
   - Or uses "Manage Lessons" to create lessons

3. **Users login to track progress**:
   - Progress syncs automatically when logged in
   - Falls back to localStorage when not logged in

## Benefits

1. **Consistent lesson content**: All users see the same lessons
2. **No login required**: Users can try the app without signing up
3. **Progress sync**: Users who login get progress synced across devices
4. **Admin control**: Only admins can modify lesson content
5. **Scalable**: Lessons stored once, progress stored per-user


