/**
 * Composition Storage Service
 * 
 * Handles saving and loading composer compositions from localStorage.
 * Automatically creates backups before any save/update/delete operation.
 */

import { backupCompositions } from './autoBackup'

export interface SavedComposition {
	id: string
	name: string
	chords: {
		id: string
		chordId: number | null // null for rest
		openStates: boolean[]
		beats: number
	}[]
	tempo: number
	timeSignature: '3/4' | '4/4'
	fluteType: string
	tuning: string
	createdAt: number
	updatedAt: number
}

const STORAGE_KEY = 'innato-compositions'

/**
 * Load all saved compositions
 */
export function loadCompositions(): SavedComposition[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY)
		if (data) {
			const compositions = JSON.parse(data) as SavedComposition[]
			console.log('[loadCompositions] Loaded', compositions.length, 'compositions from localStorage:', compositions.map((c: SavedComposition) => c.name))
			return compositions
		}
		console.log('[loadCompositions] No compositions found in localStorage (key:', STORAGE_KEY + ')')
	} catch (error) {
		console.error('[loadCompositions] Error loading compositions:', error)
	}
	return []
}

/**
 * Save a composition
 */
export function saveComposition(composition: Omit<SavedComposition, 'id' | 'createdAt' | 'updatedAt'>): SavedComposition {
	// Create backup before saving
	backupCompositions()
	
	const compositions = loadCompositions()
	const now = Date.now()
	
	const saved: SavedComposition = {
		...composition,
		id: `composition-${now}`,
		createdAt: now,
		updatedAt: now
	}
	
	compositions.push(saved)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions))
	
	return saved
}

/**
 * Update an existing composition
 */
export function updateComposition(id: string, composition: Partial<SavedComposition>): boolean {
	try {
		// Create backup before updating
		backupCompositions()
		
		const compositions = loadCompositions()
		const index = compositions.findIndex(c => c.id === id)
		
		if (index === -1) return false
		
		compositions[index] = {
			...compositions[index],
			...composition,
			id, // Ensure ID doesn't change
			updatedAt: Date.now()
		}
		
		localStorage.setItem(STORAGE_KEY, JSON.stringify(compositions))
		return true
	} catch (error) {
		console.error('Error updating composition:', error)
		return false
	}
}

/**
 * Delete a composition
 */
export function deleteComposition(id: string): boolean {
	try {
		// Create backup before deleting
		backupCompositions()
		
		const compositions = loadCompositions()
		const filtered = compositions.filter(c => c.id !== id)
		localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
		return filtered.length < compositions.length
	} catch (error) {
		console.error('Error deleting composition:', error)
		return false
	}
}

/**
 * Get a composition by ID
 */
export function getComposition(id: string): SavedComposition | null {
	const compositions = loadCompositions()
	return compositions.find(c => c.id === id) || null
}


