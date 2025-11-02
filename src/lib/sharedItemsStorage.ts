/**
 * Shared Items Storage Service
 * 
 * Handles shared progressions and compositions for Community feature.
 * Initially uses localStorage, later can migrate to backend API.
 */

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
 * Load all shared compositions
 */
export function loadSharedCompositions(): SharedComposition[] {
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
 * Save shared composition
 */
export function saveSharedComposition(
	composition: Omit<SharedComposition, 'id' | 'sharedBy' | 'sharedByUsername' | 'sharedAt' | 'favoriteCount' | 'isReadOnly' | 'version'>,
	isUpdate: boolean = false
): SharedComposition {
	const shared = loadSharedCompositions()
	const currentUserId = getCurrentUserId()
	const now = Date.now()
	
	// Check if this composition was already shared by this user
	const existingIndex = shared.findIndex(
		s => s.originalId === composition.originalId && s.sharedBy === currentUserId
	)
	
	let saved: SharedComposition
	
	if (existingIndex >= 0 && isUpdate) {
		// Update existing shared composition (new version)
		const existing = shared[existingIndex]
		saved = {
			...composition,
			id: existing.id, // Keep same ID
			sharedBy: existing.sharedBy,
			sharedByUsername: existing.sharedByUsername,
			sharedAt: existing.sharedAt, // Keep original share date
			favoriteCount: existing.favoriteCount, // Keep favorite count
			isReadOnly: true, // Always read-only
			version: existing.version + 1, // Increment version
			updatedAt: composition.updatedAt
		}
		shared[existingIndex] = saved
	} else if (existingIndex >= 0 && !isUpdate) {
		// Already exists, return existing
		return shared[existingIndex]
	} else {
		// New share
		saved = {
			...composition,
			id: `shared-composition-${now}-${Math.random().toString(36).substring(2, 9)}`,
			sharedBy: currentUserId,
			sharedByUsername: getCurrentUsername(),
			sharedAt: now,
			favoriteCount: 0,
			isReadOnly: true, // Always read-only for shared items
			version: 1
		}
		shared.push(saved)
	}
	
	localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(shared))
	return saved
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
		const shared = loadSharedCompositions()
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
		const shared = loadSharedCompositions()
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
export function getRankedSharedItems() {
	const progressions = loadSharedProgressions()
	const compositions = loadSharedCompositions()
	
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
		const shared = loadSharedCompositions()
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

