/**
 * Shared Items Storage Service
 * 
 * Handles shared progressions and compositions for Community feature.
 * Uses Supabase when available, falls back to localStorage.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser } from './authService'

export interface SharedProgression {
	id: string // Shared item ID (unique)
	originalId: string // Original progression ID (from user's local storage)
	name: string
	chordIds: number[]
	sharedBy: string // User ID
	sharedByUsername: string
	sharedAt: number
	isPublic: boolean
	favoriteCount: number
	createdAt: number // Original creation date
	version: number // Version number (increments when updated)
}

export interface SharedComposition {
	id: string // Shared item ID (unique)
	originalId: string // Original composition ID (from user's local storage)
	name: string
	chords: {
		id: string
		chordId: number | null
		openStates: boolean[]
		beats: number
	}[]
	tempo: number
	timeSignature: '3/4' | '4/4'
	fluteType: string
	tuning: string
	sharedBy: string // User ID
	sharedByUsername: string
	sharedAt: number
	isPublic: boolean
	favoriteCount: number
	isReadOnly: boolean // Always true for shared items
	createdAt: number
	updatedAt: number
	version: number
}

export interface SharedItemFavorite {
	userId: string
	itemId: string
	itemType: 'progression' | 'composition'
	favoritedAt: number
}

// Storage keys - using unique prefixes to avoid conflicts with existing localStorage data
const STORAGE_KEY_PROGRESSIONS = 'innato-shared-progressions'
const STORAGE_KEY_COMPOSITIONS = 'innato-shared-compositions'
const STORAGE_KEY_FAVORITES = 'innato-shared-favorites'
const STORAGE_KEY_USER_ID = 'innato-community-user-id' // Separate from main user ID to avoid conflicts

/**
 * Generate a user ID (for now, use localStorage - later replace with real auth)
 * Uses separate key to avoid conflicts with existing user storage
 */
function getCurrentUserId(): string {
	const userId = localStorage.getItem(STORAGE_KEY_USER_ID)
	if (userId) return userId
	
	// Try to get from existing session first (if user is logged in)
	try {
		const session = localStorage.getItem('innato-session')
		if (session) {
			const parsed = JSON.parse(session)
			if (parsed.user?.id) {
				// Use existing user ID and store it for community
				localStorage.setItem(STORAGE_KEY_USER_ID, parsed.user.id)
				return parsed.user.id
			}
		}
	} catch {
		// ignore
	}
	
	// Create new community user ID (separate from main user system)
	const newUserId = `community-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
	localStorage.setItem(STORAGE_KEY_USER_ID, newUserId)
	return newUserId
}

/**
 * Get current username (fallback to "Anonymous")
 */
function getCurrentUsername(): string {
	// Later: get from user profile
	// For now: try to get from localAuth
	try {
		const session = localStorage.getItem('innato-session')
		if (session) {
			const parsed = JSON.parse(session)
			return parsed.user?.username || parsed.user?.email?.split('@')[0] || 'Anonymous'
		}
	} catch {
		// ignore
	}
	return 'Anonymous'
}

/**
 * Load all shared progressions
 */
export function loadSharedProgressions(): SharedProgression[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY_PROGRESSIONS)
		if (data) {
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading shared progressions:', error)
	}
	return []
}

/**
 * Load all shared compositions from Supabase or localStorage
 */
export async function loadSharedCompositions(): Promise<SharedComposition[]> {
	console.log('[sharedItemsStorage] loadSharedCompositions called')
	console.log('[sharedItemsStorage] isSupabaseConfigured:', isSupabaseConfigured())
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				console.warn('[sharedItemsStorage] Supabase client is null, using localStorage')
				return loadLocalSharedCompositions()
			}
			
			console.log('[sharedItemsStorage] Loading public compositions from Supabase...')
			// Load public compositions from Supabase
			const { data, error } = await supabase
				.from('compositions')
				.select('*')
				.eq('is_public', true)
				.order('updated_at', { ascending: false })
			
			if (error) {
				console.error('[sharedItemsStorage] Supabase error loading shared compositions:', error)
				console.error('[sharedItemsStorage] Error details:', JSON.stringify(error, null, 2))
				return loadLocalSharedCompositions()
			}
			
			console.log('[sharedItemsStorage] Loaded', data?.length || 0, 'public compositions from Supabase')
			
			// Transform Supabase data to SharedComposition format
			const sharedCompositions: SharedComposition[] = (data || []).map(item => ({
				id: item.id,
				originalId: item.id,
				name: item.name,
				chords: item.chords as SharedComposition['chords'],
				tempo: item.tempo,
				timeSignature: item.time_signature as '3/4' | '4/4',
				fluteType: 'innato', // Default
				tuning: '440', // Default
				sharedBy: item.user_id,
				sharedByUsername: 'Anonymous', // TODO: Get from user profile table
				sharedAt: new Date(item.created_at).getTime(),
				isPublic: true,
				favoriteCount: 0, // TODO: Calculate from favorites table
				isReadOnly: true,
				createdAt: new Date(item.created_at).getTime(),
				updatedAt: new Date(item.updated_at).getTime(),
				version: item.version || 1
			}))
			
			// Also merge with localStorage for backward compatibility
			const localShared = loadLocalSharedCompositions()
			const supabaseIds = new Set(sharedCompositions.map(c => c.id))
			const localOnly = localShared.filter(c => !supabaseIds.has(c.id))
			
			const result = [...sharedCompositions, ...localOnly]
			console.log('[sharedItemsStorage] Returning', result.length, 'total shared compositions (', sharedCompositions.length, 'from Supabase,', localOnly.length, 'from localStorage)')
			return result
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading shared compositions from Supabase:', error)
			console.error('[sharedItemsStorage] Error stack:', error instanceof Error ? error.stack : 'N/A')
			return loadLocalSharedCompositions()
		}
	}
	
	console.log('[sharedItemsStorage] Supabase not configured, using localStorage only')
	const local = loadLocalSharedCompositions()
	console.log('[sharedItemsStorage] Loaded', local.length, 'compositions from localStorage')
	return local
}

/**
 * Load shared compositions from localStorage (fallback)
 */
function loadLocalSharedCompositions(): SharedComposition[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY_COMPOSITIONS)
		if (data) {
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading shared compositions:', error)
	}
	return []
}

/**
 * Save shared progression
 */
export function saveSharedProgression(
	progression: Omit<SharedProgression, 'id' | 'sharedBy' | 'sharedByUsername' | 'sharedAt' | 'favoriteCount' | 'version'>,
	isUpdate: boolean = false
): SharedProgression {
	const shared = loadSharedProgressions()
	const currentUserId = getCurrentUserId()
	const now = Date.now()
	
	// Check if this progression was already shared by this user
	const existingIndex = shared.findIndex(
		s => s.originalId === progression.originalId && s.sharedBy === currentUserId
	)
	
	let saved: SharedProgression
	
	if (existingIndex >= 0 && isUpdate) {
		// Update existing shared progression (new version)
		const existing = shared[existingIndex]
		saved = {
			...progression,
			id: existing.id, // Keep same ID
			sharedBy: existing.sharedBy,
			sharedByUsername: existing.sharedByUsername,
			sharedAt: existing.sharedAt, // Keep original share date
			favoriteCount: existing.favoriteCount, // Keep favorite count
			version: existing.version + 1, // Increment version
			createdAt: progression.createdAt
		}
		shared[existingIndex] = saved
	} else if (existingIndex >= 0 && !isUpdate) {
		// Already exists, return existing
		return shared[existingIndex]
	} else {
		// New share
		saved = {
			...progression,
			id: `shared-progression-${now}-${Math.random().toString(36).substring(2, 9)}`,
			sharedBy: currentUserId,
			sharedByUsername: getCurrentUsername(),
			sharedAt: now,
			favoriteCount: 0,
			version: 1
		}
		shared.push(saved)
	}
	
	localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(shared))
	return saved
}

/**
 * Save shared composition to Supabase and localStorage
 */
export async function saveSharedComposition(
	composition: Omit<SharedComposition, 'id' | 'sharedBy' | 'sharedByUsername' | 'sharedAt' | 'favoriteCount' | 'isReadOnly' | 'version'>,
	isUpdate: boolean = false
): Promise<SharedComposition> {
	const currentUserId = getCurrentUserId()
	const now = Date.now()
	
	// Try to save to Supabase first
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			const user = getCurrentUser()
			
			if (supabase && user) {
				const { data: { session } } = await supabase.auth.getSession()
				if (session?.user?.id) {
					// Check if composition exists in Supabase
					const { data: existing } = await supabase
						.from('compositions')
						.select('id, version')
						.eq('id', composition.originalId)
						.eq('user_id', session.user.id)
						.single()
					
					if (existing) {
						// Update existing composition to be public
						const { data: updated, error } = await supabase
							.from('compositions')
							.update({
								name: composition.name,
								chords: composition.chords,
								tempo: composition.tempo,
								time_signature: composition.timeSignature,
								is_public: true,
								version: isUpdate ? (existing.version || 1) + 1 : existing.version || 1
							})
							.eq('id', composition.originalId)
							.eq('user_id', session.user.id)
							.select()
							.single()
						
						if (!error && updated) {
							const saved: SharedComposition = {
								id: updated.id,
								originalId: updated.id,
								name: updated.name,
								chords: updated.chords as SharedComposition['chords'],
								tempo: updated.tempo,
								timeSignature: updated.time_signature as '3/4' | '4/4',
								fluteType: composition.fluteType,
								tuning: composition.tuning,
								sharedBy: session.user.id,
								sharedByUsername: getCurrentUsername(),
								sharedAt: new Date(updated.created_at).getTime(),
								isPublic: true,
								favoriteCount: 0,
								isReadOnly: true,
								createdAt: new Date(updated.created_at).getTime(),
								updatedAt: new Date(updated.updated_at).getTime(),
								version: updated.version || 1
							}
							
							// Also save to localStorage for backward compatibility
							saveLocalSharedComposition(saved)
							return saved
						}
					} else {
						// Composition doesn't exist in Supabase yet - create it as public
						const { data: inserted, error: insertError } = await supabase
							.from('compositions')
							.insert({
								user_id: session.user.id,
								name: composition.name,
								chords: composition.chords,
								tempo: composition.tempo,
								time_signature: composition.timeSignature,
								is_public: true,
								version: 1
							})
							.select()
							.single()
						
						if (!insertError && inserted) {
							const saved: SharedComposition = {
								id: inserted.id,
								originalId: inserted.id,
								name: inserted.name,
								chords: inserted.chords as SharedComposition['chords'],
								tempo: inserted.tempo,
								timeSignature: inserted.time_signature as '3/4' | '4/4',
								fluteType: composition.fluteType,
								tuning: composition.tuning,
								sharedBy: session.user.id,
								sharedByUsername: getCurrentUsername(),
								sharedAt: new Date(inserted.created_at).getTime(),
								isPublic: true,
								favoriteCount: 0,
								isReadOnly: true,
								createdAt: new Date(inserted.created_at).getTime(),
								updatedAt: new Date(inserted.updated_at).getTime(),
								version: inserted.version || 1
							}
							
							// Also save to localStorage for backward compatibility
							saveLocalSharedComposition(saved)
							return saved
						}
					}
				}
			}
		} catch (error) {
			console.warn('[sharedItemsStorage] Error saving to Supabase, falling back to localStorage:', error)
		}
	}
	
	// Fallback to localStorage only
	const shared = loadLocalSharedCompositions()
	const existingIndex = shared.findIndex(
		s => s.originalId === composition.originalId && s.sharedBy === currentUserId
	)
	
	let saved: SharedComposition
	
	if (existingIndex >= 0 && isUpdate) {
		const existing = shared[existingIndex]
		saved = {
			...composition,
			id: existing.id,
			sharedBy: existing.sharedBy,
			sharedByUsername: existing.sharedByUsername,
			sharedAt: existing.sharedAt,
			favoriteCount: existing.favoriteCount,
			isReadOnly: true,
			version: existing.version + 1,
			updatedAt: composition.updatedAt
		}
		shared[existingIndex] = saved
	} else if (existingIndex >= 0 && !isUpdate) {
		return shared[existingIndex]
	} else {
		saved = {
			...composition,
			id: `shared-composition-${now}-${Math.random().toString(36).substring(2, 9)}`,
			sharedBy: currentUserId,
			sharedByUsername: getCurrentUsername(),
			sharedAt: now,
			favoriteCount: 0,
			isReadOnly: true,
			version: 1
		}
		shared.push(saved)
	}
	
	localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(shared))
	return saved
}

/**
 * Save shared composition to localStorage (helper)
 */
function saveLocalSharedComposition(saved: SharedComposition): void {
	const shared = loadLocalSharedCompositions()
	const existingIndex = shared.findIndex(s => s.id === saved.id)
	if (existingIndex >= 0) {
		shared[existingIndex] = saved
	} else {
		shared.push(saved)
	}
	localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(shared))
}

/**
 * Load user's favorites for shared items
 */
function loadSharedFavorites(): SharedItemFavorite[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY_FAVORITES)
		if (data) {
			return JSON.parse(data)
		}
	} catch (error) {
		console.error('Error loading shared favorites:', error)
	}
	return []
}

/**
 * Add favorite to shared item
 */
export function addSharedFavorite(itemId: string, itemType: 'progression' | 'composition'): void {
	const favorites = loadSharedFavorites()
	const currentUserId = getCurrentUserId()
	const now = Date.now()
	
	// Check if already favorited
	const existing = favorites.find(
		f => f.userId === currentUserId && f.itemId === itemId && f.itemType === itemType
	)
	
	if (existing) return // Already favorited
	
	favorites.push({
		userId: currentUserId,
		itemId,
		itemType,
		favoritedAt: now
	})
	
	localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites))
	
	// Update favorite count
	if (itemType === 'progression') {
		const shared = loadSharedProgressions()
		const item = shared.find(s => s.id === itemId)
		if (item) {
			item.favoriteCount = favorites.filter(f => f.itemId === itemId && f.itemType === 'progression').length
			localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(shared))
		}
	} else {
		const shared = loadLocalSharedCompositions()
		const item = shared.find(s => s.id === itemId)
		if (item) {
			item.favoriteCount = favorites.filter(f => f.itemId === itemId && f.itemType === 'composition').length
			localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(shared))
		}
	}
}

/**
 * Remove favorite from shared item
 */
export function removeSharedFavorite(itemId: string, itemType: 'progression' | 'composition'): void {
	const favorites = loadSharedFavorites()
	const currentUserId = getCurrentUserId()
	
	const filtered = favorites.filter(
		f => !(f.userId === currentUserId && f.itemId === itemId && f.itemType === itemType)
	)
	
	localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filtered))
	
	// Update favorite count
	if (itemType === 'progression') {
		const shared = loadSharedProgressions()
		const item = shared.find(s => s.id === itemId)
		if (item) {
			item.favoriteCount = filtered.filter(f => f.itemId === itemId && f.itemType === 'progression').length
			localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(shared))
		}
	} else {
		const shared = loadLocalSharedCompositions()
		const item = shared.find(s => s.id === itemId)
		if (item) {
			item.favoriteCount = filtered.filter(f => f.itemId === itemId && f.itemType === 'composition').length
			localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(shared))
		}
	}
}

/**
 * Check if user has favorited an item
 */
export function isSharedItemFavorited(itemId: string, itemType: 'progression' | 'composition'): boolean {
	const favorites = loadSharedFavorites()
	const currentUserId = getCurrentUserId()
	return favorites.some(
		f => f.userId === currentUserId && f.itemId === itemId && f.itemType === itemType
	)
}

/**
 * Get shared items sorted by favorite count (for ranking)
 */
export async function getRankedSharedItems() {
	const progressions = loadSharedProgressions()
	const compositions = await loadSharedCompositions()
	
	// Sort by favorite count (descending), then by share date (newest first)
	const rankedProgressions = [...progressions]
		.filter(p => p.isPublic)
		.sort((a, b) => {
			if (b.favoriteCount !== a.favoriteCount) {
				return b.favoriteCount - a.favoriteCount
			}
			return b.sharedAt - a.sharedAt
		})
	
	const rankedCompositions = [...compositions]
		.filter(c => c.isPublic)
		.sort((a, b) => {
			if (b.favoriteCount !== a.favoriteCount) {
				return b.favoriteCount - a.favoriteCount
			}
			return b.sharedAt - a.sharedAt
		})
	
	return {
		progressions: rankedProgressions,
		compositions: rankedCompositions
	}
}

/**
 * Delete shared item (only if user is the creator)
 */
export function deleteSharedItem(itemId: string, itemType: 'progression' | 'composition'): boolean {
	const currentUserId = getCurrentUserId()
	
	if (itemType === 'progression') {
		const shared = loadSharedProgressions()
		const item = shared.find(s => s.id === itemId)
		if (!item || item.sharedBy !== currentUserId) return false
		
		const filtered = shared.filter(s => s.id !== itemId)
		localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(filtered))
		
		// Remove all favorites for this item
		const favorites = loadSharedFavorites()
		const filteredFavorites = favorites.filter(f => !(f.itemId === itemId && f.itemType === 'progression'))
		localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filteredFavorites))
	} else {
		const shared = loadLocalSharedCompositions()
		const item = shared.find(s => s.id === itemId)
		if (!item || item.sharedBy !== currentUserId) return false
		
		const filtered = shared.filter(s => s.id !== itemId)
		localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(filtered))
		
		// Remove all favorites for this item
		const favorites = loadSharedFavorites()
		const filteredFavorites = favorites.filter(f => !(f.itemId === itemId && f.itemType === 'composition'))
		localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filteredFavorites))
	}
	
	return true
}

