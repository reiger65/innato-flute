/**
 * Progression Service
 * 
 * Unified service for progression storage with Supabase + localStorage fallback.
 * Automatically uses Supabase if configured, falls back to localStorage otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser, isAdmin } from './authService'
import type { SavedProgression } from './progressionStorage'

// Re-export types for convenience
export type { SavedProgression } from './progressionStorage'
import {
	loadProgressions as loadLocal,
	saveProgression as saveLocal,
	deleteProgression as deleteLocal,
	getProgression as getLocal
} from './progressionStorage'

// Export deleteAllProgressions for use in console
if (typeof window !== 'undefined') {
	(window as any).deleteAllProgressions = async () => {
		const { deleteAllProgressions } = await import('./progressionService')
		return await deleteAllProgressions()
	}
}

/**
 * Sync local progressions to Supabase (migrates localStorage → Supabase)
 */
export async function syncLocalProgressionsToSupabase(): Promise<number> {
	if (!isSupabaseConfigured()) return 0
	
	try {
		const supabase = getSupabaseClient()
		if (!supabase) return 0
		
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.user?.id) return 0
		
		// Get all local progressions
		const localProgressions = loadLocal()
		if (localProgressions.length === 0) return 0
		
		// Get existing Supabase progressions (to avoid duplicates)
		const { data: existingData } = await supabase
			.from('progressions')
			.select('name, chord_ids')
			.eq('user_id', session.user.id)
		
		const existing = new Set(
			(existingData || []).map(p => JSON.stringify({
				name: p.name,
				chord_ids: p.chord_ids
			}))
		)
		
		// Upload local progressions that don't exist in Supabase
		let syncedCount = 0
		for (const local of localProgressions) {
			const key = JSON.stringify({
				name: local.name,
				chord_ids: local.chordIds
			})
			
			if (!existing.has(key)) {
				await supabase
					.from('progressions')
					.insert({
						user_id: session.user.id,
						name: local.name,
						chord_ids: local.chordIds,
						is_public: false,
						version: 1
					})
				syncedCount++
			}
		}
		
		if (syncedCount > 0) {
			console.log(`[progressionService] Synced ${syncedCount} local progressions to Supabase`)
		}
		
		return syncedCount
	} catch (error) {
		console.error('[progressionService] Error syncing to Supabase:', error)
		return 0
	}
}

/**
 * Load all progressions from Supabase or localStorage
 * If logged in, syncs local progressions to Supabase first, then loads from Supabase
 */
export async function loadProgressions(): Promise<SavedProgression[]> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return loadLocal()
			
			const user = getCurrentUser()
			if (!user) return loadLocal()
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return loadLocal()
			
			// Sync local progressions to Supabase (only once per session)
			const syncKey = `progression-sync-${session.user.id}`
			if (!sessionStorage.getItem(syncKey)) {
				await syncLocalProgressionsToSupabase()
				sessionStorage.setItem(syncKey, 'true')
			}
			
			const { data, error } = await supabase
				.from('progressions')
				.select('*')
				.eq('user_id', session.user.id)
				.order('updated_at', { ascending: false })
			
			if (error) {
				console.warn('[progressionService] Supabase error, falling back to localStorage:', error)
				return loadLocal()
			}
			
			// Transform Supabase data to SavedProgression format
			return (data || []).map(item => ({
				id: item.id,
				name: item.name,
				chordIds: item.chord_ids,
				createdAt: new Date(item.created_at).getTime()
			}))
		} catch (error) {
			console.error('[progressionService] Error loading from Supabase:', error)
			return loadLocal()
		}
	}
	
	return loadLocal()
}

/**
 * Save progression to Supabase or localStorage
 */
export async function saveProgression(progression: Omit<SavedProgression, 'id' | 'createdAt'>): Promise<SavedProgression> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return saveLocal(progression)
			
			const user = getCurrentUser()
			if (!user) return saveLocal(progression)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return saveLocal(progression)
			
			const { data, error } = await supabase
				.from('progressions')
				.insert({
					user_id: session.user.id,
					name: progression.name,
					chord_ids: progression.chordIds,
					is_public: false,
					version: 1
				})
				.select()
				.single()
			
			if (error) {
				console.warn('[progressionService] Supabase error, falling back to localStorage:', error)
				return saveLocal(progression)
			}
			
			if (!data) return saveLocal(progression)
			
			return {
				id: data.id,
				name: data.name,
				chordIds: data.chord_ids,
				createdAt: new Date(data.created_at).getTime()
			}
		} catch (error) {
			console.error('[progressionService] Error saving to Supabase:', error)
			return saveLocal(progression)
		}
	}
	
	return saveLocal(progression)
}

/**
 * Delete progression from Supabase or localStorage
 */
export async function deleteProgression(id: string): Promise<boolean> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return deleteLocal(id)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return deleteLocal(id)
			
			const { error } = await supabase
				.from('progressions')
				.delete()
				.eq('id', id)
				.eq('user_id', session.user.id)
			
			if (error) {
				console.warn('[progressionService] Supabase error, falling back to localStorage:', error)
				return deleteLocal(id)
			}
			
			return true
		} catch (error) {
			console.error('[progressionService] Error deleting from Supabase:', error)
			return deleteLocal(id)
		}
	}
	
	return deleteLocal(id)
}

/**
 * Delete ALL progressions for the current user (Admin only)
 */
export async function deleteAllProgressions(): Promise<number> {
	// Check if user is admin
	const user = getCurrentUser()
	if (!isAdmin(user)) {
		console.error('[progressionService] Only admins can delete all progressions')
		throw new Error('Only admins can delete all progressions')
	}
	
	// Get count before deletion
	const beforeCount = (await loadProgressions()).length
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (supabase) {
				const { data: { session } } = await supabase.auth.getSession()
				if (session?.user?.id) {
					// Delete all from Supabase
					const { error } = await supabase
						.from('progressions')
						.delete()
						.eq('user_id', session.user.id)
					
					if (error) {
						console.warn('[progressionService] Error deleting all from Supabase:', error)
					} else {
						console.log('[progressionService] Deleted all progressions from Supabase')
					}
				}
			}
		} catch (error) {
			console.error('[progressionService] Error deleting all from Supabase:', error)
		}
	}
	
	// Also clear localStorage completely
	try {
		const STORAGE_KEY = 'innato-progressions'
		localStorage.removeItem(STORAGE_KEY)
		console.log('[progressionService] Cleared all progressions from localStorage')
	} catch (error) {
		console.error('[progressionService] Error clearing localStorage:', error)
	}
	
	return beforeCount
}

/**
 * Get single progression by ID
 */
export async function getProgression(id: string): Promise<SavedProgression | null> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return getLocal(id)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return getLocal(id)
			
			const { data, error } = await supabase
				.from('progressions')
				.select('*')
				.eq('id', id)
				.eq('user_id', session.user.id)
				.single()
			
			if (error || !data) {
				console.warn('[progressionService] Supabase error, falling back to localStorage:', error)
				return getLocal(id)
			}
			
			return {
				id: data.id,
				name: data.name,
				chordIds: data.chord_ids,
				createdAt: new Date(data.created_at).getTime()
			}
		} catch (error) {
			console.error('[progressionService] Error getting from Supabase:', error)
			return getLocal(id)
		}
	}
	
	return getLocal(id)
}

