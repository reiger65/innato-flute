# INNATO App Architecture

## Overview
This document describes the architecture designed for easy migration from localStorage to database-backed storage.

## Authentication Service

### Current Implementation (`localAuth.ts`)
- Simple localStorage-based authentication
- No password hashing (temporary)
- Session management via localStorage

### Service Layer (`authService.ts`)
- Abstraction layer for authentication
- Provides `isAdmin()` function for admin checks
- Can be swapped for Supabase/auth0/etc. without changing consuming code

### Admin Detection
Currently checks:
- Email whitelist: `admin@innato.com`, `hanshoukes@gmail.com`
- Username whitelist: `admin`, `hanshoukes`
- User role: `user.role === 'admin'`

**Future:** Check database `user_roles` table or JWT claims

## Lessons Service

### Current Implementation (`lessonsData.ts`)
- Direct localStorage operations
- Synchronous functions
- No admin checks

### Service Layer (`lessonsService.ts`)
- Async interface (ready for API calls)
- Implements `LessonsService` interface
- Can be swapped for database implementation

### Migration Path
1. Current: `LocalLessonsService` → localStorage
2. Future: `DatabaseLessonsService` → Supabase/API calls
3. Switch implementation: Change `lessonsService` singleton

## Data Flow

### Current (localStorage)
```
Component → lessonsService → lessonsData.ts → localStorage
```

### Future (Database)
```
Component → lessonsService → apiService → Supabase → Database
```

## Security Considerations

### Current (Development)
- ⚠️ Passwords stored in plaintext (localStorage only)
- ✅ Admin checks via email/username whitelist
- ✅ Session expiry validation

### Future (Production)
- ✅ Password hashing (bcrypt/argon2)
- ✅ JWT tokens with expiry
- ✅ Role-based access control (RBAC)
- ✅ Row-level security (RLS) in Supabase
- ✅ API rate limiting
- ✅ Input validation & sanitization
- ✅ CORS policies

## Admin Features

### Protected Operations
All admin operations should:
1. Check `isAdmin(getCurrentUser())` before allowing action
2. Log admin actions (future: audit trail in database)
3. Show error if non-admin tries to access

### Admin Capabilities
- ✅ Add lessons from compositions
- ✅ Edit lesson metadata (title, description, difficulty)
- ✅ Delete lessons
- ✅ Reorder lessons
- ⏳ Manage user roles (future)
- ⏳ View analytics (future)

## File Structure

```
src/lib/
├── authService.ts          # Authentication abstraction
├── localAuth.ts            # localStorage auth (current)
├── lessonsService.ts       # Lessons abstraction
├── lessonsData.ts          # localStorage lessons (current)
├── compositionStorage.ts   # localStorage compositions
├── sharedItemsStorage.ts   # localStorage shared items
└── [future]
    ├── supabaseAuth.ts     # Supabase auth implementation
    ├── supabaseLessons.ts  # Database lessons implementation
    └── apiService.ts       # API client wrapper
```

## Migration Checklist

When moving to database:

- [ ] Replace `localAuth` with `supabaseAuth` in `authService.ts`
- [ ] Replace `LocalLessonsService` with `DatabaseLessonsService`
- [ ] Update admin check to query database roles
- [ ] Add password hashing
- [ ] Implement JWT token management
- [ ] Add Row Level Security (RLS) policies in Supabase
- [ ] Set up API rate limiting
- [ ] Add audit logging for admin actions
- [ ] Migrate existing localStorage data to database
- [ ] Add data backup/export functionality

## Best Practices

1. **Always use service layer** - Don't call `lessonsData.ts` directly
2. **Check admin status** - Use `isAdmin(getCurrentUser())` before admin operations
3. **Async by default** - All service methods are async (even if sync now)
4. **Error handling** - Always handle errors from service calls
5. **Type safety** - Use TypeScript interfaces consistently




