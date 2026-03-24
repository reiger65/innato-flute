// FORCE SYNC MISSING LESSONS (12, 13, 14) TO SUPABASE
// Run this in the browser console while logged in online
// Copy and paste the entire script into the console and press Enter

(async () => {
    console.log('🔄 Force syncing missing lessons to Supabase...\n');
    
    try {
        // Clear sessionStorage to allow sync
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('lesson-auto-sync-')) {
                sessionStorage.removeItem(key);
                console.log(`   ✅ Cleared ${key}`);
            }
        });
        
        // Get Supabase client
        const { getSupabaseClient } = await import('/src/lib/supabaseClient.ts');
        const { getCurrentUser } = await import('/src/lib/authService.ts');
        const { isAdmin } = await import('/src/lib/authService.ts');
        const { localLoadLessons } = await import('/src/lib/lessonsData.ts');
        
        const supabase = getSupabaseClient();
        const user = getCurrentUser();
        
        if (!supabase) {
            console.error('❌ Supabase client not available');
            return;
        }
        
        if (!user || !isAdmin(user)) {
            console.error('❌ Must be logged in as admin');
            return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            console.error('❌ No active Supabase session');
            return;
        }
        
        // Get local lessons
        const localLessons = localLoadLessons();
        const validLocal = localLessons.filter(l => l.compositionId !== null);
        console.log(`📊 Found ${validLocal.length} local lessons\n`);
        
        // Get Supabase lessons
        const { data: supabaseLessons } = await supabase
            .from('lessons')
            .select('custom_id, title, lesson_number')
            .order('lesson_number', { ascending: true });
        
        const supabaseIds = new Set((supabaseLessons || []).map(l => l.custom_id || `lesson-${l.lesson_number}`));
        console.log(`📊 Found ${supabaseLessons?.length || 0} lessons in Supabase\n`);
        
        // Find missing lessons
        const missing = validLocal.filter(l => !supabaseIds.has(l.id));
        
        if (missing.length === 0) {
            console.log('✅ All lessons are already in Supabase!');
            return;
        }
        
        console.log(`⚠️ Found ${missing.length} missing lesson(s):\n`);
        missing.forEach(lesson => {
            console.log(`   - ${lesson.id}: "${lesson.title}"`);
        });
        console.log('');
        
        // Sync missing lessons
        let syncedCount = 0;
        for (const local of missing) {
            const match = local.id.match(/lesson-(\d+)/);
            const lessonNumber = match ? parseInt(match[1], 10) : missing.indexOf(local) + 1;
            
            try {
                const { error } = await supabase
                    .from('lessons')
                    .insert({
                        created_by: session.user.id,
                        composition_id: local.compositionId || null,
                        lesson_number: lessonNumber,
                        title: local.title,
                        description: local.description || null,
                        difficulty: local.category,
                        category: null,
                        subtitle: local.subtitle || null,
                        topic: (local as any).topic || null,
                        custom_id: local.id
                    });
                
                if (!error) {
                    syncedCount++;
                    console.log(`   ✅ Synced ${local.id}`);
                } else {
                    console.error(`   ❌ Error syncing ${local.id}:`, error);
                }
            } catch (err) {
                console.error(`   ❌ Failed to sync ${local.id}:`, err);
            }
        }
        
        if (syncedCount > 0) {
            console.log(`\n✅ Successfully synced ${syncedCount} lesson(s) to Supabase!`);
            console.log('🔄 Please refresh the page to see all lessons.');
        } else {
            console.log('\n⚠️ No lessons were synced. Check errors above.');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();









