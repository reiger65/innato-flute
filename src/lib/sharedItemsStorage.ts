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
 * Query with timeout and retry logic (Safari-compatible)
 */
async function queryWithRetry<T>(
	queryFn: () => Promise<{ data: T | null, error: any }>,
	maxRetries: number = 3,
	timeoutMs: number = 8000
): Promise<{ data: T | null, error: any }> {
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Create timeout promise
			const timeoutPromise = new Promise<{ data: null, error: any }>((resolve) => {
				setTimeout(() => {
					resolve({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } })
				}, timeoutMs)
			})
			
			// Race between query and timeout
			const result = await Promise.race([queryFn(), timeoutPromise])
			
			// If we got data or a non-timeout error, return
			if (result.data || (result.error && result.error.code !== 'TIMEOUT')) {
				return result
			}
			
			// If timeout and we have retries left, wait and retry
			if (attempt < maxRetries) {
				const waitTime = Math.min(1000 * attempt, 3000) // Exponential backoff, max 3s
				console.log(`[sharedItemsStorage] Query timeout, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})...`)
				await new Promise(resolve => setTimeout(resolve, waitTime))
			}
		} catch (err) {
			console.error(`[sharedItemsStorage] Query attempt ${attempt} failed:`, err)
			if (attempt === maxRetries) {
				return { data: null, error: err }
			}
		}
	}
	
	return { data: null, error: { message: 'All retry attempts failed', code: 'RETRY_FAILED' } }
}

// Detect Safari/iOS - improved detection
function isSafari(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent.toLowerCase()
	
	// iOS devices always use Safari
	if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
		return true
	}
	
	// Safari on desktop (but not Chrome/Firefox which also include "safari" in UA)
	if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('firefox') && !ua.includes('edge')) {
		return true
	}
	
	return false
}

export async function loadSharedCompositions(): Promise<SharedComposition[]> {
	console.log('[sharedItemsStorage] loadSharedCompositions called')
	console.log('[sharedItemsStorage] isSupabaseConfigured:', isSupabaseConfigured())
	console.log('[sharedItemsStorage] Browser:', isSafari() ? 'Safari/iOS' : 'Other')
	
	// Transform function (reusable)
	function transformSupabaseCompositions(items: any[]): SharedComposition[] {
		return items.map(item => ({
			id: item.id,
			originalId: item.id,
			name: item.name,
			chords: item.chords as SharedComposition['chords'],
			tempo: item.tempo,
			timeSignature: item.time_signature as '3/4' | '4/4',
			fluteType: 'innato',
			tuning: '440',
			sharedBy: item.user_id,
			sharedByUsername: 'Anonymous',
			sharedAt: new Date(item.created_at).getTime(),
			isPublic: true,
			favoriteCount: 0,
			isReadOnly: true,
			createdAt: new Date(item.created_at).getTime(),
			updatedAt: new Date(item.updated_at).getTime(),
			version: item.version || 1
		}))
	}
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				console.warn('[sharedItemsStorage] Supabase client is null, using localStorage')
				return loadLocalSharedCompositions()
			}
			
			console.log('[sharedItemsStorage] Loading public compositions from Supabase...')
			
			// Try REST API directly via fetch first (works better on Safari/iOS)
			// This bypasses potential Supabase client issues
			const useRestApi = isSafari() || true // Always use REST API for now
			if (useRestApi) {
				console.log('[sharedItemsStorage] Using REST API fetch approach (Safari:', isSafari(), ')')
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'
					
					// Use REST API directly - more reliable on Safari
					// URL encode the filter parameter properly
					const url = `${supabaseUrl}/rest/v1/compositions?select=id,name,chords,tempo,time_signature,created_at,updated_at,user_id,version&is_public=eq.true`
					
					console.log('[sharedItemsStorage] Full REST API URL:', url)
					
					console.log('[sharedItemsStorage] Safari: Fetching from REST API:', url.substring(0, 80) + '...')
					console.log('[sharedItemsStorage] Safari: User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')
					
					const fetchPromise = fetch(url, {
						method: 'GET',
						headers: {
							'apikey': supabaseKey,
							'Authorization': `Bearer ${supabaseKey}`,
							'Content-Type': 'application/json',
							'Prefer': 'return=representation'
						},
						cache: 'no-cache' // Prevent Safari caching issues
					})
					
					const timeoutPromise = new Promise<Response>((resolve) => {
						setTimeout(() => {
							console.warn('[sharedItemsStorage] Safari REST API timeout after 8 seconds')
							resolve(new Response(null, { status: 408, statusText: 'Timeout' }))
						}, 8000)
					})
					
					const startTime = Date.now()
					const response = await Promise.race([fetchPromise, timeoutPromise])
					const duration = Date.now() - startTime
					
					console.log('[sharedItemsStorage] Safari REST API response:', {
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
						duration: `${duration}ms`
					})
					
					if (response.ok && response.status !== 408) {
						try {
							const data = await response.json()
							console.log('[sharedItemsStorage] ✅ Safari REST API succeeded! Loaded', data.length, 'compositions')
							
							if (!Array.isArray(data)) {
								console.error('[sharedItemsStorage] Safari: Expected array but got:', typeof data)
								throw new Error('Invalid response format')
							}
							
							if (Array.isArray(data) && data.length > 0) {
								const sortedData = [...data].sort((a: any, b: any) => {
									const dateA = new Date(a.updated_at || a.created_at).getTime()
									const dateB = new Date(b.updated_at || b.created_at).getTime()
									return dateB - dateA
								})
								const sharedCompositions = transformSupabaseCompositions(sortedData)
								
								// Merge with localStorage
								const localShared = loadLocalSharedCompositions()
								const supabaseIds = new Set(sharedCompositions.map(c => c.id))
								const localOnly = localShared.filter(c => !supabaseIds.has(c.id))
								
								return [...sharedCompositions, ...localOnly]
							}
						} catch (parseErr) {
							console.error('[sharedItemsStorage] Safari: Error parsing JSON response:', parseErr)
							throw parseErr
						}
					} else {
						let errorText = ''
						try {
							errorText = await response.text()
							const errorDetails = {
								status: response.status,
								statusText: response.statusText,
								body: errorText.substring(0, 500)
							}
							console.error('[sharedItemsStorage] REST API error response:', errorDetails)
							// Throw error so outer catch can handle it
							throw new Error(`REST API failed: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`)
						} catch (textErr) {
							if (textErr instanceof Error && textErr.message.includes('REST API failed')) {
								throw textErr // Re-throw our error
							}
							console.error('[sharedItemsStorage] REST API error (could not read body):', response.status, response.statusText)
							throw new Error(`REST API failed: ${response.status} ${response.statusText}`)
						}
					}
				} catch (restApiErr) {
					console.error('[sharedItemsStorage] REST API exception:', restApiErr)
					if (restApiErr instanceof Error) {
						console.error('[sharedItemsStorage] Error message:', restApiErr.message)
						console.error('[sharedItemsStorage] Error stack:', restApiErr.stack)
					}
					// Don't silently fall through - log and continue to fallback
				}
				
				// Try Supabase client as fallback
				try {
					console.log('[sharedItemsStorage] Trying Supabase client as fallback...')
					const queryResult = await supabase
						.from('compositions')
						.select('id, name, chords, tempo, time_signature, created_at, updated_at, user_id, version')
						.eq('is_public', true)
					
					if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
						console.log('[sharedItemsStorage] ✅ Supabase client fallback succeeded! Loaded', queryResult.data.length, 'compositions')
						const sortedData = [...queryResult.data].sort((a: any, b: any) => {
							const dateA = new Date(a.updated_at || a.created_at).getTime()
							const dateB = new Date(b.updated_at || b.created_at).getTime()
							return dateB - dateA
						})
						const sharedCompositions = transformSupabaseCompositions(sortedData)
						
						const localShared = loadLocalSharedCompositions()
						const supabaseIds = new Set(sharedCompositions.map(c => c.id))
						const localOnly = localShared.filter(c => !supabaseIds.has(c.id))
						
						return [...sharedCompositions, ...localOnly]
					} else if (queryResult.error) {
						console.error('[sharedItemsStorage] Supabase client error:', queryResult.error)
					} else {
						console.warn('[sharedItemsStorage] Supabase client returned empty result')
					}
				} catch (clientErr) {
					console.error('[sharedItemsStorage] Supabase client exception:', clientErr)
				}
				
				// Final fallback to localStorage
				console.log('[sharedItemsStorage] Falling back to localStorage')
				const localShared = loadLocalSharedCompositions()
				console.log('[sharedItemsStorage] Found', localShared.length, 'items in localStorage')
				return localShared
			}
			
			// For non-Safari browsers, use retry logic
			// Check if we have a session (for debugging)
			let hasSession = false
			try {
				const { data: sessionData } = await supabase.auth.getSession()
				hasSession = !!sessionData?.session
				console.log('[sharedItemsStorage] Session check:', hasSession ? 'authenticated' : 'anonymous')
			} catch (sessionErr) {
				console.warn('[sharedItemsStorage] Could not check session:', sessionErr)
			}
			
			// Strategy 1: Query with retry and timeout (non-Safari)
			console.log('[sharedItemsStorage] Attempting query with retry logic (anonymous access allowed)...')
			const result = await queryWithRetry(
				async () => {
					try {
						const queryResult = await supabase
							.from('compositions')
							.select('id, name, chords, tempo, time_signature, created_at, updated_at, user_id, version')
							.eq('is_public', true)
						
						console.log('[sharedItemsStorage] Query result:', {
							hasData: !!queryResult.data,
							dataLength: queryResult.data?.length || 0,
							hasError: !!queryResult.error,
							errorCode: queryResult.error?.code,
							errorMessage: queryResult.error?.message
						})
						
						return {
							data: queryResult.data || [],
							error: queryResult.error
						}
					} catch (err) {
						console.error('[sharedItemsStorage] Query exception:', err)
						return {
							data: null,
							error: err
						}
					}
				},
				3, // 3 retries
				10000 // 10 second timeout
			)
			
			// If we got data, use it
			if (result.data && Array.isArray(result.data) && result.data.length > 0) {
				console.log('[sharedItemsStorage] ✅ Successfully loaded', result.data.length, 'public compositions from Supabase')
				
				// Sort manually by updated_at (newest first)
				const sortedData = [...result.data].sort((a: any, b: any) => {
					const dateA = new Date(a.updated_at || a.created_at).getTime()
					const dateB = new Date(b.updated_at || b.created_at).getTime()
					return dateB - dateA
				})
				
				const sharedCompositions = transformSupabaseCompositions(sortedData)
				
				// Also merge with localStorage for backward compatibility
				const localShared = loadLocalSharedCompositions()
				const supabaseIds = new Set(sharedCompositions.map(c => c.id))
				const localOnly = localShared.filter(c => !supabaseIds.has(c.id))
				
				const mergedCompositions = [...sharedCompositions, ...localOnly]
				console.log('[sharedItemsStorage] Returning', mergedCompositions.length, 'total shared compositions (', sharedCompositions.length, 'from Supabase,', localOnly.length, 'from localStorage)')
				return mergedCompositions
			}
			
			// If query returned empty array (not an error, just no data)
			if (result.data && Array.isArray(result.data) && result.data.length === 0) {
				console.warn('[sharedItemsStorage] Query succeeded but returned 0 public compositions')
				console.warn('[sharedItemsStorage] This might mean:')
				console.warn('[sharedItemsStorage]  1. No compositions are marked as is_public=true')
				console.warn('[sharedItemsStorage]  2. RLS policy might be blocking access')
				
				// Still try localStorage as fallback
				const localShared = loadLocalSharedCompositions()
				if (localShared.length > 0) {
					console.log('[sharedItemsStorage] Found', localShared.length, 'compositions in localStorage fallback')
					return localShared
				}
				
				return []
			}
			
			// If error occurred, log details
			if (result.error) {
				console.error('[sharedItemsStorage] ❌ Supabase query failed:', {
					code: result.error.code,
					message: result.error.message,
					hint: result.error.hint,
					details: result.error.details,
					hasSession,
					userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
				})
				
				// If it's an RLS error, provide specific guidance
				if (result.error.code === '42501' || result.error.message?.includes('permission') || result.error.message?.includes('policy')) {
					console.error('[sharedItemsStorage] ⚠️ RLS Policy Error - This might be a Safari-specific issue')
					console.error('[sharedItemsStorage] Try: Check RLS policies allow anonymous SELECT on is_public=true')
				}
			}
			
			// Fallback to localStorage
			console.log('[sharedItemsStorage] Falling back to localStorage...')
			const localShared = loadLocalSharedCompositions()
			console.log('[sharedItemsStorage] Loaded', localShared.length, 'compositions from localStorage fallback')
			return localShared
			
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading shared compositions from Supabase:', error)
			console.error('[sharedItemsStorage] Error stack:', error instanceof Error ? error.stack : 'N/A')
			const localShared = loadLocalSharedCompositions()
			console.log('[sharedItemsStorage] Loaded', localShared.length, 'compositions from localStorage after exception')
			return localShared
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
					console.log('[sharedItemsStorage] Sharing composition:', composition.name, 'originalId:', composition.originalId)
					
					// First, try to save the composition to Supabase if it doesn't exist
					// Check if composition exists in Supabase
					let compositionId = composition.originalId
					let existing = null
					
					try {
						const { data: checkExisting } = await supabase
							.from('compositions')
							.select('id, version')
							.eq('id', composition.originalId)
							.eq('user_id', session.user.id)
							.single()
						
						existing = checkExisting
					} catch {
						// Composition doesn't exist in Supabase yet - that's OK, we'll create it
						console.log('[sharedItemsStorage] Composition not found in Supabase, will create new one')
					}
					
					if (!existing) {
						// Composition doesn't exist in Supabase - save it first
						console.log('[sharedItemsStorage] Saving composition to Supabase first...')
						const { data: inserted, error: insertError } = await supabase
							.from('compositions')
							.insert({
								user_id: session.user.id,
								name: composition.name,
								chords: composition.chords,
								tempo: composition.tempo,
								time_signature: composition.timeSignature,
								is_public: true, // Mark as public immediately
								version: 1
							})
							.select()
							.single()
						
						if (insertError) {
							console.error('[sharedItemsStorage] Error inserting composition:', insertError)
							throw insertError
						}
						
						if (inserted) {
							compositionId = inserted.id
							console.log('[sharedItemsStorage] Composition saved to Supabase with ID:', compositionId)
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
							
							saveLocalSharedComposition(saved)
							return saved
						}
					} else {
						// Composition exists - update it to be public
						console.log('[sharedItemsStorage] Composition exists, updating to public...')
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
						
						if (error) {
							console.error('[sharedItemsStorage] Error updating composition:', error)
							throw error
						}
						
						if (updated) {
							console.log('[sharedItemsStorage] Composition updated to public:', updated.id)
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

