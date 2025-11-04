// Run this in the browser console (F12) on your app
// It will check for deleted lesson IDs and list all lessons

console.log('🔍 Checking for deleted lessons...\n')

// Check deleted lesson IDs
const deletedIdsKey = 'deleted-lesson-ids'
const deletedIds = JSON.parse(localStorage.getItem(deletedIdsKey) || '[]')
console.log('📋 Deleted Lesson IDs:', deletedIds.length > 0 ? deletedIds : 'None')

// Check localStorage lessons
try {
	const localLessons = JSON.parse(localStorage.getItem('innato-lessons') || '[]')
	console.log(`\n💾 localStorage Lessons: ${localLessons.length}`)
	localLessons.forEach(lesson => {
		console.log(`  - ${lesson.title} (${lesson.id})`, {
			subtitle: lesson.subtitle || '(empty)',
			topic: lesson.topic || '(empty)',
			description: lesson.description || '(empty)',
			hasComposition: !!lesson.compositionId
		})
	})
} catch (e) {
	console.log('No localStorage lessons found')
}

// Check if we can access Supabase
if (typeof window !== 'undefined') {
	console.log('\n🌐 Checking Supabase lessons...')
	console.log('(This requires the app to be loaded and Supabase to be configured)')
	console.log('Look for console logs starting with [lessonsService] for Supabase data')
}

// Helper function to clear deleted IDs
window.clearDeletedLessonIds = function() {
	if (confirm(`Clear ${deletedIds.length} deleted lesson ID(s)?`)) {
		localStorage.removeItem(deletedIdsKey)
		console.log('✅ Cleared deleted lesson IDs. Refresh the page to see restored lessons.')
		location.reload()
	}
}

console.log('\n💡 To clear deleted lesson IDs, run: clearDeletedLessonIds()')


