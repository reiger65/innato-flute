/**
 * Composition Service
 * 
 * Unified service for composition storage with Supabase + localStorage fallback.
 * Automatically uses Supabase if configured, falls back to localStorage otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser, isAdmin } from './authService'
import type { SavedComposition } from './compositionStorage'

// Re-export types for convenience
export type { SavedComposition } from './compositionStorage'
import { 
	loadCompositions as loadLocal,
	saveComposition as saveLocal,
	updateComposition as updateLocal,
	deleteComposition as deleteLocal,
	getComposition as getLocal
} from './compositionStorage'

// Export deleteAllCompositions for use in console
if (typeof window !== 'undefined') {
	(window as any).deleteAllCompositions = async () => {
		const { deleteAllCompositions } = await import('./compositionService')
		return await deleteAllCompositions()
	}
}

/**
 * Sync local compositions to Supabase (migrates localStorage → Supabase)
 */
export async function syncLocalCompositionsToSupabase(): Promise<number> {
	if (!isSupabaseConfigured()) return 0
	
	try {
		const supabase = getSupabaseClient()
		if (!supabase) return 0
		
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.user?.id) return 0
		
		// Get all local compositions
		const localCompositions = loadLocal()
		if (localCompositions.length === 0) return 0
		
		// Get existing Supabase compositions (to avoid duplicates)
		const { data: existingData } = await supabase
			.from('compositions')
			.select('name, chords, tempo, time_signature')
			.eq('user_id', session.user.id)
		
		const existing = new Set(
			(existingData || []).map(c => JSON.stringify({
				name: c.name,
				chords: c.chords,
				tempo: c.tempo,
				time_signature: c.time_signature
			}))
		)
		
		// Upload local compositions that don't exist in Supabase
		let syncedCount = 0
		for (const local of localCompositions) {
			const key = JSON.stringify({
				name: local.name,
				chords: local.chords,
				tempo: local.tempo,
				time_signature: local.timeSignature
			})
			
			if (!existing.has(key)) {
				await supabase
					.from('compositions')
					.insert({
						user_id: session.user.id,
						name: local.name,
						chords: local.chords,
						tempo: local.tempo,
						time_signature: local.timeSignature,
						is_public: false,
						version: 1
					})
				syncedCount++
			}
		}
		
		if (syncedCount > 0) {
			console.log(`[compositionService] Synced ${syncedCount} local compositions to Supabase`)
		}
		
		return syncedCount
	} catch (error) {
		console.error('[compositionService] Error syncing to Supabase:', error)
		return 0
	}
}

/**
 * Load all compositions from Supabase or localStorage
 * If logged in, syncs local compositions to Supabase first, then loads from Supabase
 * Also merges with local storage to ensure nothing is lost
 */
export async function loadCompositions(): Promise<SavedComposition[]> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return loadLocal()
			
			const user = getCurrentUser()
			if (!user) return loadLocal() // Not logged in, use local
			
			// Get user ID from Supabase session
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return loadLocal()
			
			// Filter out deleted compositions before syncing
			const deletedIdsKey = 'deleted-composition-ids'
			const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
			
			// Sync local compositions to Supabase (only once per session)
			// But skip deleted ones
			const syncKey = `composition-sync-${session.user.id}`
			if (!sessionStorage.getItem(syncKey)) {
				// Temporarily filter out deleted IDs from localStorage before sync
				const originalLocal = loadLocal()
				const localWithoutDeleted = originalLocal.filter(c => !deletedIds.has(c.id))
				
				// Temporarily replace localStorage content
				const STORAGE_KEY = 'innato-compositions'
				const originalContent = localStorage.getItem(STORAGE_KEY)
				localStorage.setItem(STORAGE_KEY, JSON.stringify(localWithoutDeleted))
				
				try {
					const synced = await syncLocalCompositionsToSupabase()
					sessionStorage.setItem(syncKey, 'true')
					if (synced > 0) {
						console.log(`[compositionService] Synced ${synced} compositions to Supabase (excluding ${deletedIds.size} deleted ones)`)
					}
				} finally {
					// Restore original localStorage
					if (originalContent) {
						localStorage.setItem(STORAGE_KEY, originalContent)
					}
				}
			}
			
			// Load from Supabase
			const { data, error } = await supabase
				.from('compositions')
				.select('*')
				.eq('user_id', session.user.id)
				.order('updated_at', { ascending: false })
			
			if (error) {
				console.warn('[compositionService] Supabase error, falling back to localStorage:', error)
				return loadLocal()
			}
			
			// Transform Supabase data to SavedComposition format
			const supabaseCompositions = (data || []).map(item => ({
				id: item.id,
				name: item.name,
				chords: item.chords as SavedComposition['chords'],
				tempo: item.tempo,
				timeSignature: item.time_signature as '3/4' | '4/4',
				fluteType: 'innato', // Default, could be stored in DB later
				tuning: '440', // Default, could be stored in DB later
				createdAt: new Date(item.created_at).getTime(),
				updatedAt: new Date(item.updated_at).getTime()
			}))
			
			// Filter out deleted compositions (using the same deletedIds variable declared above)
			const filteredSupabaseCompositions = supabaseCompositions.filter(c => !deletedIds.has(c.id))
			
			// Also load local compositions as backup/merge (excluding deleted ones)
			const localCompositions = loadLocal().filter(c => !deletedIds.has(c.id))
			
			// Merge: use Supabase IDs as primary, but include any local that don't exist in Supabase
			const supabaseIds = new Set(filteredSupabaseCompositions.map(c => c.id))
			const localOnly = localCompositions.filter(c => !supabaseIds.has(c.id))
			
			if (localOnly.length > 0) {
				console.log(`[compositionService] Found ${localOnly.length} local compositions not in Supabase, merging...`)
				// Try to sync these again (but skip deleted ones)
				for (const local of localOnly) {
					if (deletedIds.has(local.id)) {
						console.log(`[compositionService] Skipping deleted composition: ${local.id}`)
						continue
					}
					try {
						const { error: insertError } = await supabase
							.from('compositions')
							.insert({
								user_id: session.user.id,
								name: local.name,
								chords: local.chords,
								tempo: local.tempo,
								time_signature: local.timeSignature,
								is_public: false,
								version: 1
							})
						if (!insertError) {
							console.log(`[compositionService] Synced "${local.name}" to Supabase`)
						}
					} catch (err) {
						console.warn(`[compositionService] Failed to sync "${local.name}":`, err)
					}
				}
				// Reload from Supabase after sync
				const { data: reloadData } = await supabase
					.from('compositions')
					.select('*')
					.eq('user_id', session.user.id)
					.order('updated_at', { ascending: false })
				
				if (reloadData) {
					return (reloadData || []).map(item => ({
						id: item.id,
						name: item.name,
						chords: item.chords as SavedComposition['chords'],
						tempo: item.tempo,
						timeSignature: item.time_signature as '3/4' | '4/4',
						fluteType: 'innato',
						tuning: '440',
						createdAt: new Date(item.created_at).getTime(),
						updatedAt: new Date(item.updated_at).getTime()
					}))
				}
			}
			
			return filteredSupabaseCompositions
		} catch (error) {
			console.error('[compositionService] Error loading from Supabase:', error)
			return loadLocal()
		}
	}
	
	return loadLocal()
}

/**
 * Save composition to Supabase or localStorage
 */
export async function saveComposition(composition: Omit<SavedComposition, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedComposition> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return saveLocal(composition)
			
			const user = getCurrentUser()
			if (!user) return saveLocal(composition)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return saveLocal(composition)
			
			const { data, error } = await supabase
				.from('compositions')
				.insert({
					user_id: session.user.id,
					name: composition.name,
					chords: composition.chords,
					tempo: composition.tempo,
					time_signature: composition.timeSignature,
					is_public: false,
					version: 1
				})
				.select()
				.single()
			
			if (error) {
				console.warn('[compositionService] Supabase error, falling back to localStorage:', error)
				return saveLocal(composition)
			}
			
			if (!data) return saveLocal(composition)
			
			// Transform to SavedComposition
			return {
				id: data.id,
				name: data.name,
				chords: data.chords as SavedComposition['chords'],
				tempo: data.tempo,
				timeSignature: data.time_signature as '3/4' | '4/4',
				fluteType: composition.fluteType,
				tuning: composition.tuning,
				createdAt: new Date(data.created_at).getTime(),
				updatedAt: new Date(data.updated_at).getTime()
			}
		} catch (error) {
			console.error('[compositionService] Error saving to Supabase:', error)
			return saveLocal(composition)
		}
	}
	
	return saveLocal(composition)
}

/**
 * Update composition in Supabase or localStorage
 */
export async function updateComposition(id: string, composition: Partial<SavedComposition>): Promise<boolean> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return updateLocal(id, composition)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return updateLocal(id, composition)
			
			// Build update object
			const updateData: any = {}
			if (composition.name !== undefined) updateData.name = composition.name
			if (composition.chords !== undefined) updateData.chords = composition.chords
			if (composition.tempo !== undefined) updateData.tempo = composition.tempo
			if (composition.timeSignature !== undefined) updateData.time_signature = composition.timeSignature
			if (composition.updatedAt !== undefined) {
				// Supabase will auto-update updated_at via trigger
			}
			
			const { error } = await supabase
				.from('compositions')
				.update(updateData)
				.eq('id', id)
				.eq('user_id', session.user.id) // Ensure user owns this composition
			
			if (error) {
				console.warn('[compositionService] Supabase error, falling back to localStorage:', error)
				return updateLocal(id, composition)
			}
			
			return true
		} catch (error) {
			console.error('[compositionService] Error updating in Supabase:', error)
			return updateLocal(id, composition)
		}
	}
	
	return updateLocal(id, composition)
}

/**
 * Delete composition from Supabase or localStorage
 */
export async function deleteComposition(id: string): Promise<boolean> {
	// Track deletion in a set to prevent re-sync
	const deletedIdsKey = 'deleted-composition-ids'
	const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
	deletedIds.add(id)
	localStorage.setItem(deletedIdsKey, JSON.stringify(Array.from(deletedIds)))
	
	// Always delete from localStorage first
	const localDeleted = deleteLocal(id)
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				console.warn('[compositionService] No Supabase client, using localStorage only')
				return localDeleted
			}
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) {
				console.warn('[compositionService] No session, using localStorage only')
				return localDeleted
			}
			
			// Try deleting with user_id check first
			let { data, error } = await supabase
				.from('compositions')
				.delete()
				.eq('id', id)
				.eq('user_id', session.user.id)
				.select()
			
			// If no rows deleted with user_id check, try without user_id check (might be admin or different owner)
			if (!error && (!data || data.length === 0)) {
				console.warn(`[compositionService] No rows deleted with user_id check for ${id}, trying without user_id check`)
				const result = await supabase
					.from('compositions')
					.delete()
					.eq('id', id)
					.select()
				
				data = result.data
				error = result.error
			}
			
			if (error) {
				console.warn('[compositionService] Supabase error:', error)
				// Even if Supabase fails, localStorage deletion succeeded, so return true
				return localDeleted
			}
			
			// Check if anything was actually deleted
			if (!data || data.length === 0) {
				console.warn(`[compositionService] No rows deleted from Supabase for composition ${id}`)
				// Still return true if localStorage deletion worked
				return localDeleted
			}
			
			console.log(`[compositionService] Successfully deleted composition ${id} from Supabase`)
			return true
		} catch (error) {
			console.error('[compositionService] Error deleting from Supabase:', error)
			return localDeleted
		}
	}
	
	return localDeleted
}

/**
 * Delete ALL compositions for the current user (Admin only)
 */
export async function deleteAllCompositions(): Promise<number> {
	// Check if user is admin
	const user = getCurrentUser()
	if (!isAdmin(user)) {
		console.error('[compositionService] Only admins can delete all compositions')
		throw new Error('Only admins can delete all compositions')
	}
	
	// Get count before deletion
	const beforeCount = (await loadCompositions()).length
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (supabase) {
				const { data: { session } } = await supabase.auth.getSession()
				if (session?.user?.id) {
					// Delete all from Supabase
					const { error } = await supabase
						.from('compositions')
						.delete()
						.eq('user_id', session.user.id)
					
					if (error) {
						console.warn('[compositionService] Error deleting all from Supabase:', error)
					} else {
						console.log('[compositionService] Deleted all compositions from Supabase')
					}
				}
			}
		} catch (error) {
			console.error('[compositionService] Error deleting all from Supabase:', error)
		}
	}
	
	// Also clear localStorage completely
	try {
		const STORAGE_KEY = 'innato-compositions'
		localStorage.removeItem(STORAGE_KEY)
		localStorage.removeItem('deleted-composition-ids')
		console.log('[compositionService] Cleared all compositions from localStorage')
	} catch (error) {
		console.error('[compositionService] Error clearing localStorage:', error)
	}
	
	return beforeCount
}

/**
 * Get single composition by ID
 */
export async function getComposition(id: string): Promise<SavedComposition | null> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return getLocal(id)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return getLocal(id)
			
			const { data, error } = await supabase
				.from('compositions')
				.select('*')
				.eq('id', id)
				.eq('user_id', session.user.id)
				.single()
			
			if (error || !data) {
				console.warn('[compositionService] Supabase error, falling back to localStorage:', error)
				return getLocal(id)
			}
			
			// Transform to SavedComposition
			return {
				id: data.id,
				name: data.name,
				chords: data.chords as SavedComposition['chords'],
				tempo: data.tempo,
				timeSignature: data.time_signature as '3/4' | '4/4',
				fluteType: 'innato', // Default
				tuning: '440', // Default
				createdAt: new Date(data.created_at).getTime(),
				updatedAt: new Date(data.updated_at).getTime(),
				// Include metadata fields if they exist (cast to any to allow additional fields)
				...(data as any).subtitle && { subtitle: (data as any).subtitle },
				...(data as any).description && { description: (data as any).description },
				...(data as any).topic && { topic: (data as any).topic },
				...(data as any).difficulty && { difficulty: (data as any).difficulty }
			} as SavedComposition & { subtitle?: string; description?: string; topic?: string; difficulty?: string }
		} catch (error) {
			console.error('[compositionService] Error getting from Supabase:', error)
			return getLocal(id)
		}
	}
	
	return getLocal(id)
}

