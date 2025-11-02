# 🚀 Quick Update Guide

## Snelle Referentie voor App Updates

### ✅ Ik wil een nieuwe feature toevoegen

**Voorbeeld: Nieuwe veld "difficulty" toevoegen aan compositions**

1. **Database update:**
   ```bash
   # Maak nieuw bestand
   echo "ALTER TABLE compositions ADD COLUMN difficulty TEXT DEFAULT 'beginner';" > migrations/002_add_difficulty.sql
   
   # Voer uit via helper script
   ./update-supabase.sh
   ```
   
   Of handmatig:
   - Open `migrations/002_add_difficulty.sql`
   - Kopieer naar Supabase SQL Editor
   - Run

2. **Code update:**
   ```typescript
   // src/lib/compositionStorage.ts
   interface SavedComposition {
       // ... bestaande velden
       difficulty?: string  // Nieuw!
   }
   ```

3. **UI update:**
   ```typescript
   // In ComposerView.tsx
   const [difficulty, setDifficulty] = useState('beginner')
   
   // Bij save:
   saveComposition({
       // ...
       difficulty: difficulty
   })
   ```

4. **Test:**
   ```bash
   npm run dev
   ```

---

### ✅ Ik wil een nieuwe tabel maken

**Voorbeeld: "user_settings" tabel**

1. **Maak migratie:**
   ```bash
   cat > migrations/002_user_settings.sql << 'EOF'
   CREATE TABLE user_settings (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       user_id UUID REFERENCES auth.users(id),
       setting_key TEXT NOT NULL,
       setting_value JSONB,
       created_at TIMESTAMP DEFAULT NOW(),
       UNIQUE(user_id, setting_key)
   );
   
   ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can manage own settings"
       ON user_settings FOR ALL
       USING (auth.uid() = user_id);
   EOF
   ```

2. **Voer uit:**
   ```bash
   ./update-supabase.sh
   ```

3. **Maak service:**
   ```typescript
   // src/lib/userSettingsService.ts
   export async function getUserSetting(key: string) {
       // Supabase query
   }
   ```

---

### ✅ Ik wil data migreren/transformeren

**Voorbeeld: Oude data omzetten naar nieuw formaat**

1. **Maak migratie:**
   ```sql
   -- migrations/002_migrate_data.sql
   UPDATE compositions
   SET new_format = json_build_object(
       'old_field_1', old_field_1,
       'old_field_2', old_field_2
   )
   WHERE new_format IS NULL;
   ```

2. **Voer uit en test**

---

### ✅ Ik wil de app updaten zonder database changes

**Gewoon code updaten:**
```bash
# Code aanpassen
# Testen
npm run dev

# Build
npm run build

# Deploy (later)
```

**Geen Supabase actie nodig!**

---

## 📋 Update Checklist

Voor elke update:

- [ ] Backup gemaakt? (via Supabase dashboard)
- [ ] Migratie script geschreven?
- [ ] Code geüpdatet?
- [ ] Getest lokaal?
- [ ] Getest met Supabase?
- [ ] Geen errors in console?
- [ ] Documentatie geüpdatet?

---

## 🆘 Hulp

- **Migratie probleem?** → Zie `SUPABASE_MIGRATIONS.md`
- **Code probleem?** → Zie `DEVELOPMENT_WORKFLOW.md`
- **Setup probleem?** → Zie `QUICK_START_SUPABASE.md`

---

## 💡 Pro Tips

1. **Altijd backup voor database changes**
2. **Test lokaal eerst**
3. **Gebruik helper scripts:** `./update-supabase.sh`
4. **Documenteer je changes**
5. **Commit naar git na testing**


