/**
 * Fix Existing Lessons Data in Supabase
 * 
 * This script reads lessons from localStorage (which should have correct values)
 * and updates Supabase lessons with the correct field mapping.
 * 
 * Run this in the browser console when logged in as admin.
 */

async function fixExistingLessonsInSupabase() {
	console.log('🔧 Starting to fix existing lessons data in Supabase...')
	console.log('')
	
	// Import required functions
	const { getSupabaseClient, isSupabaseConfigured } = await import('./src/lib/supabaseClient.ts')
	const { getCurrentUser } = await import('./src/lib/authService.ts')
	const { loadLessons as localLoadLessons } = await import('./src/lib/lessonsData.ts')
	
	if (!isSupabaseConfigured()) {
		console.error('❌ Supabase not configured')
		return
	}
	
	const supabase = getSupabaseClient()
	if (!supabase) {
		console.error('❌ Supabase client not available')
		return
	}
	
	const user = getCurrentUser()
	if (!user) {
		console.error('❌ Not logged in')
		return
	}
	
	const { data: { session } } = await supabase.auth.getSession()
	if (!session?.user?.id) {
		console.error('❌ No session')
		return
	}
	
	// Check if admin
	const { isAdmin } = await import('./src/lib/authService.ts')
	if (!isAdmin(user)) {
		console.error('❌ Not an admin user')
		return
	}
	
	// Load lessons from localStorage (should have correct values)
	const localLessons = localLoadLessons()
	console.log(`📋 Found ${localLessons.length} lessons in localStorage`)
	console.log('')
	
	if (localLessons.length === 0) {
		console.log('⚠️  No lessons found in localStorage')
		return
	}
	
	// Get all lessons from Supabase
	const { data: supabaseLessons, error: fetchError } = await supabase
		.from('lessons')
		.select('custom_id, id, title, subtitle, description, topic, category, difficulty')
	
	if (fetchError) {
		console.error('❌ Error fetching Supabase lessons:', fetchError)
		return
	}
	
	console.log(`📋 Found ${supabaseLessons?.length || 0} lessons in Supabase`)
	console.log('')
	
	// Create a map of local lessons by ID
	const localLessonsById = new Map(localLessons.map(l => [l.id, l]))
	
	// Update each Supabase lesson with correct data from localStorage
	let fixedCount = 0
	let skippedCount = 0
	
	for (const supabaseLesson of (supabaseLessons || [])) {
		const customId = supabaseLesson.custom_id || supabaseLesson.id
		const localLesson = localLessonsById.get(customId)
		
		if (!localLesson) {
			console.log(`⚠️  Skipping lesson ${customId} - not found in localStorage`)
			skippedCount++
			continue
		}
		
		// Extract lesson number from custom_id
		const match = customId.match(/lesson-(\d+)/)
		const lessonNumber = match ? parseInt(match[1], 10) : 1
		
		// Prepare update data with correct field mapping
		const updateData = {
			title: localLesson.title,
			subtitle: localLesson.subtitle || null,
			description: localLesson.description || null,
			topic: (localLesson as any).topic || null, // Topic goes to topic field
			category: null, // Don't use category field - use topic instead
			difficulty: localLesson.category || 'beginner', // Category maps to difficulty
			lesson_number: lessonNumber
		}
		
		console.log(`🔄 Updating lesson ${customId}:`, {
			title: updateData.title,
			subtitle: updateData.subtitle || '(empty)',
			description: updateData.description || '(empty)',
			topic: updateData.topic || '(empty)',
			difficulty: updateData.difficulty
		})
		
		// Update in Supabase using custom_id
		const { error: updateError } = await supabase
			.from('lessons')
			.update(updateData)
			.eq('custom_id', customId)
		
		if (updateError) {
			console.error(`❌ Error updating lesson ${customId}:`, updateError)
		} else {
			fixedCount++
			console.log(`✅ Fixed lesson ${customId}`)
		}
	}
	
	console.log('')
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log(`✅ Fixed ${fixedCount} lessons`)
	console.log(`⚠️  Skipped ${skippedCount} lessons`)
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
	console.log('')
	console.log('🔄 Refresh your app to see the corrected data!')
}

// Export for use in browser console
(window as any).fixExistingLessonsInSupabase = fixExistingLessonsInSupabase

console.log('✅ Fix script loaded! Run: fixExistingLessonsInSupabase()')

