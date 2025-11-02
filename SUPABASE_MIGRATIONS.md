# Supabase Database Migrations

## 📋 Overzicht

Dit document beschrijft hoe je database wijzigingen (migrations) kunt uitvoeren na de initiële setup.

---

## 🔄 Migratie Workflow

### Stap 1: Maak Migratie Script

Maak een nieuw bestand in `migrations/` map:
```
migrations/
  ├── 001_initial_schema.sql       (al uitgevoerd)
  ├── 002_add_new_feature.sql      (nieuwe migratie)
  └── 003_update_existing.sql      (volgende migratie)
```

### Stap 2: Test Migratie Lokaal

1. Maak een test database in Supabase (of gebruik local Supabase CLI)
2. Voer migratie uit
3. Test de app
4. Controleer of alles werkt

### Stap 3: Voer Migratie Uit in Production

1. Maak backup van database (via Supabase dashboard)
2. Voer migratie script uit in SQL Editor
3. Verifieer dat migratie succesvol was
4. Test app functionaliteit

---

## 📝 Migratie Bestandsstructuur

```
migrations/
  ├── 001_initial_schema.sql
  ├── 002_[beschrijving].sql
  ├── 003_[beschrijving].sql
  └── README.md
```

**Naamgeving:**
- `001_` = eerste migratie (initial schema)
- `002_` = tweede migratie
- etc.
- Gebruik beschrijvende namen na nummer

---

## ✅ Best Practices

### 1. Altijd Backup Maken
```sql
-- Maak altijd een backup voordat je wijzigingen maakt
-- Dit kan via Supabase dashboard: Settings > Database > Backups
```

### 2. Gebruik Transacties
```sql
BEGIN;

-- Je wijzigingen hier
ALTER TABLE compositions ADD COLUMN new_field TEXT;

COMMIT;
-- Of ROLLBACK; als er iets mis gaat
```

### 3. Test op Development Eerst
- Test altijd eerst op een development/test database
- Gebruik Supabase branching (Pro plan) of aparte project

### 4. Documenteer Wijzigingen
- Beschrijf wat de migratie doet
- Noteer breaking changes
- Update schema documentatie

### 5. Maak Migraties Reversibel
```sql
-- Bijvoorbeeld: als je een kolom toevoegt, maak een script om het te verwijderen
-- migrations/002_add_feature.sql
ALTER TABLE compositions ADD COLUMN new_field TEXT;

-- migrations/002_add_feature_rollback.sql  
ALTER TABLE compositions DROP COLUMN new_field;
```

---

## 🛠️ Veelvoorkomende Migraties

### Kolom Toevoegen
```sql
ALTER TABLE compositions 
ADD COLUMN new_field TEXT DEFAULT NULL;
```

### Kolom Verwijderen
```sql
-- ⚠️ Pas op: dit verwijdert data permanent!
ALTER TABLE compositions 
DROP COLUMN old_field;
```

### Index Toevoegen
```sql
CREATE INDEX IF NOT EXISTS idx_compositions_new_field 
ON compositions(new_field);
```

### RLS Policy Toevoegen
```sql
CREATE POLICY "Nieuwe policy naam"
ON compositions FOR SELECT
USING (auth.uid() = user_id OR is_public = TRUE);
```

### Data Migratie
```sql
-- Bijvoorbeeld: bestaande data updaten
UPDATE compositions
SET new_field = 'default_value'
WHERE new_field IS NULL;
```

---

## 🔍 Migratie Verificatie

Na elke migratie, controleer:

```sql
-- Check of tabel bestaat
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'compositions';

-- Check kolommen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'compositions';

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'compositions';

-- Check RLS policies
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'compositions';
```

---

## 📚 Meer Info

- Supabase Migrations: https://supabase.com/docs/guides/cli/local-development#database-migrations
- PostgreSQL ALTER TABLE: https://www.postgresql.org/docs/current/sql-altertable.html
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

