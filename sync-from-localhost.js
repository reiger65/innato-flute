// SYNC LESSONS FROM LOCALHOST TO SUPABASE
// Run this in the browser console on LOCALHOST while logged in as admin
// This will sync all local lessons (including 12, 13, 14) to Supabase

(async () => {
    console.log('🔄 Syncing lessons from localhost to Supabase...\n');
    
    try {
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
            console.log('💡 Please log in first, then run this script again.');
            return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            console.error('❌ No active Supabase session');
            console.log('💡 Please log in first, then run this script again.');
            return;
        }
        
        console.log(`✅ Logged in as: ${user.email}\n`);
        
        // Get local lessons
        const localLessons = localLoadLessons();
        const validLocal = localLessons.filter(l => l.compositionId !== null);
        console.log(`📊 Found ${validLocal.length} local lesson(s) in localStorage\n`);
        
        if (validLocal.length === 0) {
            console.log('⚠️ No local lessons found to sync.');
            return;
        }
        
        // Show all local lessons
        validLocal.forEach(lesson => {
            console.log(`   - ${lesson.id}: "${lesson.title}"`);
        });
        console.log('');
        
        // Get Supabase lessons
        const { data: supabaseLessons, error: fetchError } = await supabase
            .from('lessons')
            .select('custom_id, title, lesson_number')
            .order('lesson_number', { ascending: true });
        
        if (fetchError) {
            console.warn('⚠️ Error fetching Supabase lessons:', fetchError);
        }
        
        const supabaseIds = new Set((supabaseLessons || []).map(l => l.custom_id || `lesson-${l.lesson_number}`));
        console.log(`📊 Found ${supabaseLessons?.length || 0} lesson(s) already in Supabase\n`);
        
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
        let failedCount = 0;
        
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
                    console.log(`   ✅ Synced ${local.id}: "${local.title}"`);
                } else {
                    failedCount++;
                    console.error(`   ❌ Error syncing ${local.id}:`, error);
                }
            } catch (err) {
                failedCount++;
                console.error(`   ❌ Failed to sync ${local.id}:`, err);
            }
        }
        
        console.log('');
        if (syncedCount > 0) {
            console.log(`✅ Successfully synced ${syncedCount} lesson(s) to Supabase!`);
            console.log('🔄 Now refresh the online version to see all lessons.');
        }
        if (failedCount > 0) {
            console.log(`⚠️ ${failedCount} lesson(s) failed to sync. Check errors above.`);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();

