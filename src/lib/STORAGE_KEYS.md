# LocalStorage Keys Overview

Dit document beschrijft alle localStorage keys die gebruikt worden in de app om conflicts te voorkomen.

## Bestaande Keys (NIET AANPASSEN)

### User & Authentication
- `innato-user` - Gebruikers data (localAuth.ts)
- `innato-session` - Huidige login sessie (localAuth.ts)

### Progressions
- `innato-progressions` - Opgeslagen progressions van gebruiker (progressionStorage.ts)

### Compositions
- `innato-compositions` - Opgeslagen compositions van gebruiker (compositionStorage.ts)

### Lessons
- `innato-lessons` - Lesson definities (lessonsData.ts)
- `innato-lesson-progress` - Lesson completion status (lessonsData.ts)

### Favorites (indien aanwezig)
- `innato-favorites` - Favoriete chords (indien gebruikt)

## Nieuwe Community Keys (GEEN CONFLICT)

### Shared Items (Community)
- `innato-shared-progressions` - Gedeelde progressions in community
- `innato-shared-compositions` - Gedeelde compositions in community
- `innato-shared-favorites` - Favorieten voor gedeelde items
- `innato-community-user-id` - Community user ID (separate van main user system)

## Garanties

1. **Geen overlap**: Alle community keys gebruiken `-shared-` of `-community-` prefix
2. **Read-only access**: Bestaande keys worden alleen gelezen, nooit overschreven door community functies
3. **Backward compatible**: Bestaande functionaliteit blijft volledig werken
4. **Separate namespace**: Community data is volledig gescheiden van persoonlijke data










