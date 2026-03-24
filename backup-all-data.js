// FULL BACKUP SCRIPT - Run this in the browser console
// This will backup all Supabase data and localStorage data

(async () => {
    console.log('🔄 Starting full backup...\n');
    
    const backup: any = {
        timestamp: new Date().toISOString(),
        supabase: {},
        localStorage: {},
        metadata: {}
    };
    
    try {
        // Backup Supabase data
        const { getSupabaseClient } = await import('./src/lib/supabaseClient.ts');
        const supabase = getSupabaseClient();
        
        if (supabase) {
            console.log('📊 Backing up Supabase data...');
            
            // Get session to check if logged in
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user?.id) {
                console.log(`   ✅ Logged in as: ${session.user.email}`);
                
                // Backup compositions
                try {
                    const { data: compositions, error } = await supabase
                        .from('compositions')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .order('created_at', { ascending: true });
                    
                    if (error) {
                        console.error('   ❌ Error backing up compositions:', error);
                    } else {
                        backup.supabase.compositions = compositions || [];
                        console.log(`   ✅ Backed up ${compositions?.length || 0} compositions`);
                    }
                } catch (err) {
                    console.error('   ❌ Error backing up compositions:', err);
                }
                
                // Backup progressions
                try {
                    const { data: progressions, error } = await supabase
                        .from('progressions')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .order('created_at', { ascending: true });
                    
                    if (error) {
                        console.error('   ❌ Error backing up progressions:', error);
                    } else {
                        backup.supabase.progressions = progressions || [];
                        console.log(`   ✅ Backed up ${progressions?.length || 0} progressions`);
                    }
                } catch (err) {
                    console.error('   ❌ Error backing up progressions:', err);
                }
                
                // Backup user progress
                try {
                    const { data: userProgress, error } = await supabase
                        .from('user_progress')
                        .select('*, lessons(*)')
                        .eq('user_id', session.user.id)
                        .order('completed_at', { ascending: true });
                    
                    if (error) {
                        console.error('   ❌ Error backing up user progress:', error);
                    } else {
                        backup.supabase.user_progress = userProgress || [];
                        console.log(`   ✅ Backed up ${userProgress?.length || 0} progress entries`);
                    }
                } catch (err) {
                    console.error('   ❌ Error backing up user progress:', err);
                }
                
                backup.metadata.user = {
                    id: session.user.id,
                    email: session.user.email
                };
            } else {
                console.log('   ⚠️ Not logged in, skipping user-specific Supabase data');
            }
            
            // Backup lessons (global, no auth required)
            try {
                const { data: lessons, error } = await supabase
                    .from('lessons')
                    .select('*')
                    .order('lesson_number', { ascending: true });
                
                if (error) {
                    console.error('   ❌ Error backing up lessons:', error);
                } else {
                    backup.supabase.lessons = lessons || [];
                    console.log(`   ✅ Backed up ${lessons?.length || 0} lessons`);
                }
            } catch (err) {
                console.error('   ❌ Error backing up lessons:', err);
            }
            
            // Backup shared items (if they exist)
            try {
                const { data: sharedCompositions, error: compError } = await supabase
                    .from('shared_items')
                    .select('*')
                    .eq('item_type', 'composition')
                    .order('shared_at', { ascending: true });
                
                if (!compError && sharedCompositions) {
                    backup.supabase.shared_compositions = sharedCompositions;
                    console.log(`   ✅ Backed up ${sharedCompositions.length} shared compositions`);
                }
                
                const { data: sharedProgressions, error: progError } = await supabase
                    .from('shared_items')
                    .select('*')
                    .eq('item_type', 'progression')
                    .order('shared_at', { ascending: true });
                
                if (!progError && sharedProgressions) {
                    backup.supabase.shared_progressions = sharedProgressions;
                    console.log(`   ✅ Backed up ${sharedProgressions.length} shared progressions`);
                }
            } catch (err) {
                console.error('   ❌ Error backing up shared items:', err);
            }
        } else {
            console.log('   ⚠️ Supabase not configured');
        }
    } catch (error) {
        console.error('❌ Error accessing Supabase:', error);
    }
    
    // Backup localStorage data
    console.log('\n💾 Backing up localStorage data...');
    
    const localStorageKeys = [
        'innato-compositions',
        'innato-progressions',
        'innato-lessons',
        'innato-lesson-progress',
        'innato-favorites',
        'innato-user-session',
        'deleted-composition-ids',
        'deleted-lesson-ids',
        'innato-categories',
        'innato-composer-draft'
    ];
    
    localStorageKeys.forEach(key => {
        try {
            const value = localStorage.getItem(key);
            if (value !== null) {
                backup.localStorage[key] = JSON.parse(value);
                console.log(`   ✅ Backed up ${key}`);
            }
        } catch (err) {
            console.error(`   ❌ Error backing up ${key}:`, err);
            // Try to save as string if JSON parsing fails
            backup.localStorage[key] = localStorage.getItem(key);
        }
    });
    
    // Save backup to localStorage and download as file
    console.log('\n💾 Saving backup...');
    
    const backupKey = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    localStorage.setItem(backupKey, JSON.stringify(backup, null, 2));
    
    // Also create downloadable file
    const backupBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const backupUrl = URL.createObjectURL(backupBlob);
    const backupLink = document.createElement('a');
    backupLink.href = backupUrl;
    backupLink.download = `innato-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(backupLink);
    backupLink.click();
    document.body.removeChild(backupLink);
    URL.revokeObjectURL(backupUrl);
    
    console.log('\n✅ Backup complete!');
    console.log(`📦 Backup saved to localStorage with key: ${backupKey}`);
    console.log(`📥 Backup file downloaded: innato-backup-${new Date().toISOString().split('T')[0]}.json`);
    console.log('\n📊 Backup Summary:');
    console.log(`   Compositions: ${backup.supabase.compositions?.length || 0}`);
    console.log(`   Progressions: ${backup.supabase.progressions?.length || 0}`);
    console.log(`   Lessons: ${backup.supabase.lessons?.length || 0}`);
    console.log(`   User Progress: ${backup.supabase.user_progress?.length || 0}`);
    console.log(`   LocalStorage keys: ${Object.keys(backup.localStorage).length}`);
    
    return backup;
})();









