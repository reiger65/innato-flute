/**
 * Progression Storage Service
 * 
 * Handles saving and loading progressions from localStorage.
 */

export interface SavedProgression {
	id: string
	name: string
	chordIds: number[]
	createdAt: number
}

const STORAGE_KEY = 'innato-progressions'

/**
 * Load all saved progressions
 */
export function loadProgressions(): SavedProgression[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY)
		if (data) {
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading progressions:', error)
	}
	return []
}

/**
 * Save a progression
 */
export function saveProgression(progression: Omit<SavedProgression, 'id' | 'createdAt'>): SavedProgression {
	const progressions = loadProgressions()
	const now = Date.now()
	
	const saved: SavedProgression = {
		...progression,
		id: `progression-${now}-${Math.random().toString(36).substring(2, 9)}`,
		createdAt: now
	}
	
	progressions.push(saved)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(progressions))
	
	return saved
}

/**
 * Delete a progression
 */
export function deleteProgression(id: string): boolean {
	try {
		const progressions = loadProgressions()
		const filtered = progressions.filter(p => p.id !== id)
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
		return filtered.length < progressions.length
	} catch (error) {
		console.error('Error deleting progression:', error)
		return false
	}
}

/**
 * Get a progression by ID
 */
export function getProgression(id: string): SavedProgression | null {
	const progressions = loadProgressions()
	return progressions.find(p => p.id === id) || null
}






