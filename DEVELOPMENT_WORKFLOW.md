# Development Workflow - Supabase Updates

## 🎯 Overzicht

Dit document beschrijft de workflow voor het ontwikkelen en updaten van de app met Supabase.

---

## 📁 Project Structuur

```
innato-flute/
├── migrations/              # Database migraties
│   ├── 001_initial_schema.sql
│   ├── 002_[beschrijving].sql
│   └── README.md
├── src/
│   └── lib/
│       ├── supabaseClient.ts      # Supabase client
│       ├── supabaseAuthService.ts # Auth service
│       ├── compositionStorage.ts  # (wordt gemigreerd)
│       └── ...
├── SUPABASE_SETUP.md         # Eerste setup instructies
├── SUPABASE_MIGRATIONS.md    # Migratie handleiding
├── update-supabase.sh        # Helper script
└── .env.local                # Je Supabase credentials (niet in git)
```

---

## 🔄 Typische Workflow

### 1. Nieuwe Feature Ontwikkelen

#### Lokaal Ontwikkelen (zonder Supabase)
```bash
# App werkt met localStorage
npm run dev
```

#### Met Supabase Testen
```bash
# Zorg dat .env.local bestaat met Supabase credentials
npm run dev
```

### 2. Database Wijziging Nodig?

#### A. Maak Migratie Script

```bash
# Maak nieuw bestand in migrations/
touch migrations/002_add_new_field.sql
```

#### B. Schrijf Migratie

```sql
-- migrations/002_add_new_field.sql
BEGIN;

-- Voeg nieuwe kolom toe
ALTER TABLE compositions 
ADD COLUMN difficulty_level TEXT DEFAULT 'beginner';

-- Voeg constraint toe
ALTER TABLE compositions
ADD CONSTRAINT valid_difficulty 
CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- Update bestaande data indien nodig
UPDATE compositions
SET difficulty_level = 'beginner'
WHERE difficulty_level IS NULL;

COMMIT;
```

#### C. Voer Migratie Uit

**Optie 1: Helper Script**
```bash
./update-supabase.sh
```

**Optie 2: Handmatig**
1. Open Supabase Dashboard → SQL Editor
2. Open migratie bestand
3. Kopieer en plak in SQL Editor
4. Run

#### D. Test App
```bash
npm run dev
# Test de nieuwe functionaliteit
```

### 3. Code Updates

#### Services Updaten

Bijvoorbeeld: nieuwe kolom gebruiken in compositions:

```typescript
// src/lib/compositionStorage.ts (of compositionService.ts)
export interface SavedComposition {
    // ... bestaande velden
    difficultyLevel?: string  // Nieuw veld
}

// Update save/load functies om nieuwe veld te gebruiken
```

#### Frontend Updates

```typescript
// In ComposerView.tsx of waar nodig
const [difficulty, setDifficulty] = useState('beginner')

// Save met nieuwe veld
saveComposition({
    // ... andere velden
    difficultyLevel: difficulty
})
```

---

## 🛠️ Veelvoorkomende Taken

### Nieuwe Database Kolom Toevoegen

1. **Migratie maken:**
   ```sql
   ALTER TABLE [table] ADD COLUMN [name] [type] DEFAULT [default];
   ```

2. **TypeScript interface updaten:**
   ```typescript
   interface SavedComposition {
       newField?: string
   }
   ```

3. **Service functies updaten:**
   - save functie: include new field
   - load functie: read new field
   - display: show new field in UI

4. **Test:**
   - Create new item
   - Load existing items
   - Verify data persistence

### Nieuwe Tabel Toevoegen

1. **Migratie maken:**
   ```sql
   CREATE TABLE new_table (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES auth.users(id),
       -- kolommen...
       created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- RLS policies
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can read own rows"
       ON new_table FOR SELECT
       USING (auth.uid() = user_id);
   ```

2. **TypeScript types:**
   ```typescript
   export interface NewTableItem {
       id: string
       userId: string
       // ...
   }
   ```

3. **Service functies:**
   ```typescript
   export async function loadNewItems(): Promise<NewTableItem[]> {
       // Supabase query
   }
   ```

### Bestaande Data Migreren

```sql
-- Bijvoorbeeld: rename veld of transform data
BEGIN;

-- Oude data kopiëren naar nieuw veld
UPDATE compositions
SET new_field = old_field
WHERE old_field IS NOT NULL;

-- Optioneel: oude kolom verwijderen (pas op!)
-- ALTER TABLE compositions DROP COLUMN old_field;

COMMIT;
```

---

## 🔍 Debugging & Verificatie

### Database Staat Checken

```sql
-- Check alle tabellen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check kolommen van tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'compositions'
ORDER BY ordinal_position;

-- Check data
SELECT COUNT(*) FROM compositions;
SELECT * FROM compositions LIMIT 5;

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'compositions';
```

### App Logs Checken

```bash
# Browser console
# Check voor Supabase errors
# Check network tab voor failed requests
```

### Supabase Dashboard

- **Table Editor:** Bekijk data visueel
- **SQL Editor:** Voer queries uit
- **Logs:** Check voor errors
- **API Docs:** Auto-generated API docs

---

## 📝 Best Practices

### 1. Always Test Lokaal Eerst
```bash
# Test met localStorage eerst
# Dan test met Supabase (development project)
# Dan pas naar production
```

### 2. Maak Backups
```bash
# Via Supabase dashboard:
# Settings > Database > Backups > Create backup
```

### 3. Version Control
```bash
# Commit migraties naar git
git add migrations/002_new_feature.sql
git commit -m "Add new feature: [beschrijving]"
```

### 4. Documenteer Breaking Changes
```markdown
# migrations/002_breaking_change.sql
-- BREAKING CHANGE: Removes old_field column
-- Migration: Update your code to use new_field instead
```

### 5. Staged Rollout
```bash
# Test op development Supabase project
# Dan naar production
```

---

## 🚨 Troubleshooting

### Migratie Fails

1. **Check error message** in SQL Editor
2. **Check of je permissies hebt** (moet project owner zijn)
3. **Check of tabel bestaat** voor ALTER TABLE
4. **Check constraints** voor data conflicts
5. **Rollback indien nodig:**
   ```sql
   ROLLBACK;
   ```

### App Connecteert Niet naar Supabase

1. **Check .env.local:**
   ```bash
   cat .env.local
   ```

2. **Check Supabase URL/key:**
   - Ga naar Supabase Dashboard → Settings → API
   - Verifieer URL en key

3. **Check browser console:**
   - Network errors?
   - Auth errors?

4. **Test verbinding:**
   ```typescript
   // In browser console:
   import { getSupabaseClient } from './lib/supabaseClient'
   const supabase = getSupabaseClient()
   console.log(supabase) // Should not be null
   ```

### Data Verschijnt Niet

1. **Check RLS policies:**
   - Zijn policies correct?
   - Is user_id correct?

2. **Check queries:**
   - Select statement correct?
   - Filters correct?

3. **Check data bestaat:**
   - Table Editor in Supabase
   - Direct SQL query

---

## 📚 Handige Resources

### Supabase Docs
- **RLS:** https://supabase.com/docs/guides/auth/row-level-security
- **Migrations:** https://supabase.com/docs/guides/cli/local-development
- **API:** https://supabase.com/docs/reference/javascript/introduction

### PostgreSQL Docs
- **ALTER TABLE:** https://www.postgresql.org/docs/current/sql-altertable.html
- **CREATE TABLE:** https://www.postgresql.org/docs/current/sql-createtable.html
- **Indexes:** https://www.postgresql.org/docs/current/sql-createindex.html

### Project Files
- `SUPABASE_SCHEMA.sql` - Initial schema reference
- `SUPABASE_MIGRATIONS.md` - Migration guide
- `SUPABASE_SETUP.md` - Setup instructions

---

## ✅ Checklist voor Updates

Voor elke update:

- [ ] Backup database gemaakt
- [ ] Migratie script geschreven en getest
- [ ] TypeScript interfaces geüpdatet
- [ ] Service functies geüpdatet
- [ ] Frontend code geüpdatet
- [ ] Getest met localStorage (fallback)
- [ ] Getest met Supabase
- [ ] Geen console errors
- [ ] Data persist correct
- [ ] Documentatie geüpdatet
- [ ] Migratie naar git gecommit

---

## 🎯 Quick Reference

### Nieuwe Kolom Toevoegen
```bash
# 1. Maak migratie
echo "ALTER TABLE compositions ADD COLUMN new_field TEXT;" > migrations/002_add_field.sql

# 2. Voer uit
./update-supabase.sh

# 3. Update code
# - TypeScript interface
# - Service functions
# - Frontend
```

### Nieuwe Tabel Toevoegen
```bash
# 1. Maak migratie met CREATE TABLE + RLS
# 2. Voer uit
# 3. Maak service functions
# 4. Integreer in frontend
```

### Data Queryen
```sql
-- In Supabase SQL Editor
SELECT * FROM compositions WHERE user_id = 'user-uuid';
```

---

## 💡 Tips

1. **Gebruik Supabase Table Editor** voor snelle data checks
2. **Gebruik SQL Editor** voor complexe queries
3. **Maak development Supabase project** voor testing
4. **Test altijd fallback** (zonder Supabase)
5. **Documenteer custom queries** die je vaak gebruikt




