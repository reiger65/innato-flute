# Database Migrations

Deze map bevat alle database migraties voor Supabase.

## Gebruik

1. Maak een nieuw migratie bestand: `003_[beschrijving].sql`
2. Voer uit in Supabase SQL Editor
3. Test de app
4. Commit migratie naar git

## Volgorde

Voer migraties altijd in volgorde uit (001, 002, 003, etc.)

## Rollback

Voor belangrijke migraties, maak een `_rollback.sql` bestand met de reverse operaties.


