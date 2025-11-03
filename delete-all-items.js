/**
 * Script to delete all compositions and progressions
 * Run this in the browser console after the app is loaded
 */

// Delete all compositions
async function deleteAllCompositions() {
	const { loadCompositions, deleteComposition } = await import('./src/lib/compositionService.ts')
	const compositions = await loadCompositions()
	let deleted = 0
	for (const comp of compositions) {
		const success = await deleteComposition(comp.id)
		if (success) deleted++
	}
	localStorage.removeItem('innato-compositions')
	localStorage.removeItem('deleted-composition-ids')
	console.log(`Deleted ${deleted} compositions`)
	return deleted
}

// Delete all progressions
async function deleteAllProgressions() {
	const { loadProgressions, deleteProgression } = await import('./src/lib/progressionService.ts')
	const progressions = await loadProgressions()
	let deleted = 0
	for (const prog of progressions) {
		const success = await deleteProgression(prog.id)
		if (success) deleted++
	}
	localStorage.removeItem('innato-progressions')
	console.log(`Deleted ${deleted} progressions`)
	return deleted
}

// Run both
(async () => {
	console.log('Starting deletion of all items...')
	const compsDeleted = await deleteAllCompositions()
	const progsDeleted = await deleteAllProgressions()
	console.log(`Done! Deleted ${compsDeleted} compositions and ${progsDeleted} progressions`)
	alert(`Deleted ${compsDeleted} compositions and ${progsDeleted} progressions. Please reload the page.`)
	window.location.reload()
})()

