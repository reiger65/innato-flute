-- Fix triggers: Drop and recreate if they already exist
-- Voer uit in: Supabase Dashboard → SQL Editor

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_compositions_updated_at ON compositions;
DROP TRIGGER IF EXISTS update_progressions_updated_at ON progressions;
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_shared_item_favorites_count_trigger ON shared_item_favorites;

-- Recreate triggers
CREATE TRIGGER update_compositions_updated_at
    BEFORE UPDATE ON compositions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progressions_updated_at
    BEFORE UPDATE ON progressions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_item_favorites_count_trigger
    AFTER INSERT OR DELETE ON shared_item_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_item_favorites_count();

-- Verify triggers were created
SELECT 
    trigger_name, 
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'update_compositions_updated_at',
    'update_progressions_updated_at',
    'update_lessons_updated_at',
    'update_shared_item_favorites_count_trigger'
  )
ORDER BY trigger_name;





