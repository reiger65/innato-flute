-- ============================================================================
-- INNATO Flute App - Supabase Database Schema
-- ============================================================================
-- 
-- Voer dit script uit in de Supabase SQL Editor
-- Tools > SQL Editor > New Query > Plak dit script > Run
--
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Compositions Table
CREATE TABLE IF NOT EXISTS compositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    chords JSONB NOT NULL, -- Array of chord objects
    tempo INTEGER NOT NULL DEFAULT 60,
    time_signature TEXT NOT NULL DEFAULT '4/4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    CONSTRAINT valid_time_signature CHECK (time_signature IN ('3/4', '4/4'))
);

-- Progressions Table
CREATE TABLE IF NOT EXISTS progressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    chord_ids INTEGER[] NOT NULL, -- Array of chord IDs (1-64)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    composition_id UUID REFERENCES compositions(id) ON DELETE SET NULL,
    lesson_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT unique_lesson_number UNIQUE (lesson_number)
);

-- User Progress Table
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress_data JSONB, -- Extra progress info (attempts, score, etc.)
    UNIQUE(user_id, lesson_id)
);

-- Favorites Table (for favorite chords)
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chord_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_chord_id CHECK (chord_id >= 1 AND chord_id <= 64),
    UNIQUE(user_id, chord_id)
);

-- Shared Items Table (for community features)
CREATE TABLE IF NOT EXISTS shared_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_id UUID NOT NULL, -- Reference to composition or progression
    favorites_count INTEGER DEFAULT 0,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    CONSTRAINT valid_item_type CHECK (item_type IN ('composition', 'progression')),
    UNIQUE(user_id, item_type, item_id)
);

-- Shared Item Favorites (junction table)
CREATE TABLE IF NOT EXISTS shared_item_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_item_id UUID NOT NULL REFERENCES shared_items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, shared_item_id)
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_compositions_user_id ON compositions(user_id);
CREATE INDEX IF NOT EXISTS idx_compositions_public ON compositions(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_compositions_updated_at ON compositions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_progressions_user_id ON progressions(user_id);
CREATE INDEX IF NOT EXISTS idx_progressions_public ON progressions(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_progressions_updated_at ON progressions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lessons_lesson_number ON lessons(lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON lessons(created_by);
CREATE INDEX IF NOT EXISTS idx_lessons_composition_id ON lessons(composition_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

CREATE INDEX IF NOT EXISTS idx_shared_items_user_id ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_item_type ON shared_items(item_type);
CREATE INDEX IF NOT EXISTS idx_shared_items_favorites_count ON shared_items(favorites_count DESC);

CREATE INDEX IF NOT EXISTS idx_shared_item_favorites_user_id ON shared_item_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_item_favorites_shared_item_id ON shared_item_favorites(shared_item_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_compositions_updated_at ON compositions;
CREATE TRIGGER update_compositions_updated_at
    BEFORE UPDATE ON compositions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_progressions_updated_at ON progressions;
CREATE TRIGGER update_progressions_updated_at
    BEFORE UPDATE ON progressions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
CREATE TRIGGER update_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update favorites_count on shared_items
CREATE OR REPLACE FUNCTION update_shared_item_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE shared_items
        SET favorites_count = favorites_count + 1
        WHERE id = NEW.shared_item_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE shared_items
        SET favorites_count = GREATEST(favorites_count - 1, 0)
        WHERE id = OLD.shared_item_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for favorites_count
DROP TRIGGER IF EXISTS update_shared_item_favorites_count_trigger ON shared_item_favorites;
CREATE TRIGGER update_shared_item_favorites_count_trigger
    AFTER INSERT OR DELETE ON shared_item_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_shared_item_favorites_count();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE compositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_item_favorites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMPOSITIONS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for re-running script)
DROP POLICY IF EXISTS "Users can read own compositions" ON compositions;
DROP POLICY IF EXISTS "Anyone can read public compositions" ON compositions;
DROP POLICY IF EXISTS "Users can insert own compositions" ON compositions;
DROP POLICY IF EXISTS "Users can update own compositions" ON compositions;
DROP POLICY IF EXISTS "Users can delete own compositions" ON compositions;

-- Users can read their own compositions
CREATE POLICY "Users can read own compositions"
    ON compositions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can read public compositions
CREATE POLICY "Anyone can read public compositions"
    ON compositions FOR SELECT
    USING (is_public = TRUE);

-- Users can insert their own compositions
CREATE POLICY "Users can insert own compositions"
    ON compositions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own compositions
CREATE POLICY "Users can update own compositions"
    ON compositions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own compositions
CREATE POLICY "Users can delete own compositions"
    ON compositions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PROGRESSIONS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own progressions" ON progressions;
DROP POLICY IF EXISTS "Anyone can read public progressions" ON progressions;
DROP POLICY IF EXISTS "Users can insert own progressions" ON progressions;
DROP POLICY IF EXISTS "Users can update own progressions" ON progressions;
DROP POLICY IF EXISTS "Users can delete own progressions" ON progressions;

-- Users can read their own progressions
CREATE POLICY "Users can read own progressions"
    ON progressions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can read public progressions
CREATE POLICY "Anyone can read public progressions"
    ON progressions FOR SELECT
    USING (is_public = TRUE);

-- Users can insert their own progressions
CREATE POLICY "Users can insert own progressions"
    ON progressions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progressions
CREATE POLICY "Users can update own progressions"
    ON progressions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progressions
CREATE POLICY "Users can delete own progressions"
    ON progressions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- LESSONS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can update lessons" ON lessons;
DROP POLICY IF EXISTS "Admins can delete lessons" ON lessons;

-- Anyone can read lessons
CREATE POLICY "Anyone can read lessons"
    ON lessons FOR SELECT
    USING (TRUE);

-- Only admins can insert lessons
-- Note: Admin check will be done in application code for now
-- Later: Create a function to check admin role
CREATE POLICY "Admins can insert lessons"
    ON lessons FOR INSERT
    WITH CHECK (TRUE); -- Will be filtered in app code

-- Only admins can update lessons
CREATE POLICY "Admins can update lessons"
    ON lessons FOR UPDATE
    USING (TRUE) -- Will be filtered in app code
    WITH CHECK (TRUE);

-- Only admins can delete lessons
CREATE POLICY "Admins can delete lessons"
    ON lessons FOR DELETE
    USING (TRUE); -- Will be filtered in app code

-- ============================================================================
-- USER_PROGRESS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;

-- Users can read their own progress
CREATE POLICY "Users can read own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own progress
CREATE POLICY "Users can delete own progress"
    ON user_progress FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- FAVORITES POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;

-- Users can read their own favorites
CREATE POLICY "Users can read own favorites"
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SHARED_ITEMS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can insert own shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can update own shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can delete own shared items" ON shared_items;

-- Anyone can read shared items
CREATE POLICY "Anyone can read shared items"
    ON shared_items FOR SELECT
    USING (TRUE);

-- Users can insert their own shared items
CREATE POLICY "Users can insert own shared items"
    ON shared_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own shared items
CREATE POLICY "Users can update own shared items"
    ON shared_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shared items
CREATE POLICY "Users can delete own shared items"
    ON shared_items FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- SHARED_ITEM_FAVORITES POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read shared item favorites" ON shared_item_favorites;
DROP POLICY IF EXISTS "Users can insert own shared item favorites" ON shared_item_favorites;
DROP POLICY IF EXISTS "Users can delete own shared item favorites" ON shared_item_favorites;

-- Users can read favorites for shared items
CREATE POLICY "Users can read shared item favorites"
    ON shared_item_favorites FOR SELECT
    USING (TRUE);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own shared item favorites"
    ON shared_item_favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own shared item favorites"
    ON shared_item_favorites FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- DONE!
-- ============================================================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'compositions', 
    'progressions', 
    'lessons', 
    'user_progress', 
    'favorites', 
    'shared_items', 
    'shared_item_favorites'
  )
ORDER BY table_name;

