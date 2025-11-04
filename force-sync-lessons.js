// FORCE SYNC ALL LESSONS TO SUPABASE
// Run this in the browser console while logged in online

(async () => {
    console.log('🔄 Force syncing all lessons to Supabase...\n');
    
    try {
        // Import the sync function
        const { syncLocalLessonsToSupabase } = await import('./src/lib/lessonsService.ts');
        
        // Clear sessionStorage to force sync
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
            if (key.startsWith('lesson-auto-sync-')) {
                sessionStorage.removeItem(key);
                console.log(`   Cleared ${key}`);
            }
        });
        
        // Force sync
        const syncedCount = await syncLocalLessonsToSupabase();
        
        if (syncedCount > 0) {
            console.log(`\n✅ Successfully synced ${syncedCount} lesson(s) to Supabase!`);
            console.log('🔄 Please refresh the page to see all lessons.');
        } else {
            console.log('\n✅ No lessons to sync (all lessons already in Supabase or none found locally)');
            
            // Check what's in local vs Supabase
            const { localLoadLessons } = await import('./src/lib/lessonsData.ts');
            const localLessons = localLoadLessons();
            const validLocal = localLessons.filter(l => l.compositionId !== null);
            
            console.log(`\n📊 Local lessons: ${validLocal.length}`);
            validLocal.forEach(lesson => {
                console.log(`   - ${lesson.id}: "${lesson.title}"`);
            });
            
            // Check Supabase
            const { getSupabaseClient } = await import('./src/lib/supabaseClient.ts');
            const supabase = getSupabaseClient();
            
            if (supabase) {
                const { data: supabaseLessons } = await supabase
                    .from('lessons')
                    .select('custom_id, title, lesson_number')
                    .order('lesson_number', { ascending: true });
                
                console.log(`\n📊 Supabase lessons: ${supabaseLessons?.length || 0}`);
                supabaseLessons?.forEach(lesson => {
                    console.log(`   - ${lesson.custom_id || `lesson-${lesson.lesson_number}`}: "${lesson.title}"`);
                });
                
                // Find missing lessons
                const localIds = new Set(validLocal.map(l => l.id));
                const supabaseIds = new Set(supabaseLessons?.map(l => l.custom_id || `lesson-${l.lesson_number}`) || []);
                const missing = validLocal.filter(l => !supabaseIds.has(l.id));
                
                if (missing.length > 0) {
                    console.log(`\n⚠️ Found ${missing.length} lesson(s) in local but not in Supabase:`);
                    missing.forEach(lesson => {
                        console.log(`   - ${lesson.id}: "${lesson.title}"`);
                    });
                    console.log('\n💡 Try running sync again - it might have failed silently.');
                }
            }
        }
    } catch (error) {
        console.error('❌ Error syncing lessons:', error);
        console.error('Full error:', error);
    }
})();

