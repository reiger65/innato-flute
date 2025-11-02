/**
 * Composition Service
 * 
 * Unified service for composition storage with Supabase + localStorage fallback.
 * Automatically uses Supabase if configured, falls back to localStorage otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser } from './authService'
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

/**
 * Load all compositions from Supabase or localStorage
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
			return (data || []).map(item => ({
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
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return deleteLocal(id)
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return deleteLocal(id)
			
			const { error } = await supabase
				.from('compositions')
				.delete()
				.eq('id', id)
				.eq('user_id', session.user.id) // Ensure user owns this composition
			
			if (error) {
				console.warn('[compositionService] Supabase error, falling back to localStorage:', error)
				return deleteLocal(id)
			}
			
			return true
		} catch (error) {
			console.error('[compositionService] Error deleting from Supabase:', error)
			return deleteLocal(id)
		}
	}
	
	return deleteLocal(id)
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
				updatedAt: new Date(data.updated_at).getTime()
			}
		} catch (error) {
			console.error('[compositionService] Error getting from Supabase:', error)
			return getLocal(id)
		}
	}
	
	return getLocal(id)
}

