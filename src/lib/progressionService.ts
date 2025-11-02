/**
 * Progression Service
 * 
 * Unified service for progression storage with Supabase + localStorage fallback.
 * Automatically uses Supabase if configured, falls back to localStorage otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser } from './authService'
import type { SavedProgression } from './progressionStorage'

// Re-export types for convenience
export type { SavedProgression } from './progressionStorage'
import {
	loadProgressions as loadLocal,
	saveProgression as saveLocal,
	deleteProgression as deleteLocal,
	getProgression as getLocal
} from './progressionStorage'

/**
 * Load all progressions from Supabase or localStorage
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

