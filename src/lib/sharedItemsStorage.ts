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
 * Load shared progressions from localStorage (fallback)
 */
function loadLocalSharedProgressions(): SharedProgression[] {
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
 * Load all shared progressions from Supabase or localStorage
 */
export async function loadSharedProgressions(): Promise<SharedProgression[]> {
	console.log('[sharedItemsStorage] loadSharedProgressions called')
	console.log('[sharedItemsStorage] isSupabaseConfigured:', isSupabaseConfigured())
	console.log('[sharedItemsStorage] Browser:', isSafari() ? 'Safari/iOS' : 'Other')
	clearLastRestApiError() // Clear previous error
	
	// Transform function
	function transformSupabaseProgressions(items: any[]): SharedProgression[] {
		return items.map(item => ({
			id: item.id,
			originalId: item.id,
			name: item.name,
			chordIds: item.chord_ids,
			sharedBy: item.user_id,
			sharedByUsername: 'Anonymous',
			sharedAt: new Date(item.created_at).getTime(),
			isPublic: true,
			favoriteCount: 0,
			createdAt: new Date(item.created_at).getTime(),
			version: item.version || 1
		}))
	}
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				console.warn('[sharedItemsStorage] Supabase client is null, using localStorage')
				return loadLocalSharedProgressions()
			}
			
			console.log('[sharedItemsStorage] Loading public progressions from Supabase...')
			
			// Try REST API directly via fetch first (works better on Safari/iOS)
			const isIOSDevice = isIOS()
			const useRestApi = isIOSDevice || isSafari() || true // Always use REST API for now
			if (useRestApi) {
				console.log('[sharedItemsStorage] Using REST API fetch approach for progressions (iOS:', isIOSDevice, ', Safari:', isSafari(), ')')
				let restApiSucceeded = false
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'
					
					console.log('[sharedItemsStorage] Progressions REST API config check:', {
						hasUrl: !!supabaseUrl,
						hasKey: !!supabaseKey,
						urlSource: import.meta.env.VITE_SUPABASE_URL ? 'env' : 'hardcoded',
						keySource: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'env' : 'hardcoded'
					})
					
					// Use REST API directly - more reliable on Safari
					// Add cache-busting timestamp to prevent browser caching
					const cacheBuster = Date.now()
					const url = `${supabaseUrl}/rest/v1/progressions?select=id,name,chord_ids,created_at,updated_at,user_id,version&is_public=eq.true&_t=${cacheBuster}`
					
					console.log('[sharedItemsStorage] Full REST API URL for progressions:', url)
					
					const headers: Record<string, string> = {
						'apikey': supabaseKey,
						'Authorization': `Bearer ${supabaseKey}`,
						'Content-Type': 'application/json',
						'Prefer': 'return=representation'
					}
					
					const fetchOptions: RequestInit = {
						method: 'GET',
						headers: headers,
						cache: 'no-cache',
						mode: 'cors',
						credentials: 'omit'
					}
					
					const fetchPromise = fetch(url, fetchOptions)
					
					const timeoutPromise = new Promise<Response>((resolve) => {
						setTimeout(() => {
							console.warn('[sharedItemsStorage] Progressions REST API timeout after 8 seconds')
							resolve(new Response(null, { status: 408, statusText: 'Timeout' }))
						}, 8000)
					})
					
					const startTime = Date.now()
					let response: Response
					try {
						response = await Promise.race([fetchPromise, timeoutPromise])
					} catch (fetchError) {
						console.error('[sharedItemsStorage] Progressions fetch promise rejected:', fetchError)
						if (fetchError instanceof Error) {
							const errorMsg = `Fetch failed: ${fetchError.message}`
							lastRestApiError = errorMsg
							console.error('[sharedItemsStorage]', errorMsg)
						}
						throw fetchError
					}
					const duration = Date.now() - startTime
					
					console.log('[sharedItemsStorage] Progressions REST API response:', {
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
						duration: `${duration}ms`
					})
					
					if (response.ok && response.status !== 408) {
						try {
							const data = await response.json()
							console.log('[sharedItemsStorage] ✅ Progressions REST API succeeded! Loaded', data.length, 'progressions')
							
							if (!Array.isArray(data)) {
								console.error('[sharedItemsStorage] Expected array but got:', typeof data)
								throw new Error('Invalid response format')
							}
							
							if (Array.isArray(data)) {
								if (data.length > 0) {
									const sortedData = [...data].sort((a: any, b: any) => {
										const dateA = new Date(a.updated_at || a.created_at).getTime()
										const dateB = new Date(b.updated_at || b.created_at).getTime()
										return dateB - dateA
									})
									const sharedProgressions = transformSupabaseProgressions(sortedData)
									
									// Deduplicate by ID before returning
									const uniqueProgressions = sharedProgressions.filter((p, index, self) => 
										index === self.findIndex(p2 => p2.id === p.id)
									)
									
									if (sharedProgressions.length !== uniqueProgressions.length) {
										console.warn('[sharedItemsStorage] Found duplicate progressions in REST API response:', sharedProgressions.length, '->', uniqueProgressions.length)
									}
									
									// Use ONLY Supabase items - don't merge with localStorage
									console.log('[sharedItemsStorage] ✅ Successfully loaded progressions via REST API:', uniqueProgressions.length, 'from Supabase')
									restApiSucceeded = true
									return uniqueProgressions
								} else {
									console.warn('[sharedItemsStorage] Progressions REST API returned empty array (successful but no data)')
									const errorMsg = 'REST API query succeeded but returned 0 progressions. Will try Supabase client fallback.'
									lastRestApiError = errorMsg
									// Continue to Supabase client fallback below
								}
							}
						} catch (parseErr) {
							console.error('[sharedItemsStorage] Error parsing progressions JSON response:', parseErr)
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
							console.error('[sharedItemsStorage] Progressions REST API error response:', errorDetails)
							const errorMsg = `REST API ${response.status}: ${response.statusText} - ${errorText.substring(0, 200)}`
							lastRestApiError = errorMsg
							throw new Error(errorMsg)
						} catch (textErr) {
							if (textErr instanceof Error && textErr.message.includes('REST API')) {
								throw textErr
							}
							console.error('[sharedItemsStorage] Progressions REST API error (could not read body):', response.status, response.statusText)
							const errorMsg = `REST API ${response.status}: ${response.statusText}`
							lastRestApiError = errorMsg
							throw new Error(errorMsg)
						}
					}
				} catch (restApiErr) {
					console.error('[sharedItemsStorage] Progressions REST API exception:', restApiErr)
					if (restApiErr instanceof Error) {
						const errorMsg = `REST API failed: ${restApiErr.message}`
						if (!lastRestApiError) {
							lastRestApiError = errorMsg
						}
						console.error('[sharedItemsStorage]', errorMsg)
						console.log('[sharedItemsStorage] Will try Supabase client fallback...')
					}
				}
				
				// Only try Supabase client as fallback if REST API didn't succeed
				if (restApiSucceeded) {
					console.log('[sharedItemsStorage] REST API succeeded, skipping Supabase client fallback to prevent duplicates')
					// This should never be reached because REST API returns above, but just in case
					return []
				}
				
				// Try Supabase client as fallback (only if REST API failed or returned empty)
				try {
					// Check session for debugging
					let sessionInfo = 'no session'
					try {
						const { data: sessionData } = await supabase.auth.getSession()
						if (sessionData?.session) {
							sessionInfo = `authenticated as ${sessionData.session.user.id}`
						} else {
							sessionInfo = 'anonymous'
						}
					} catch {}
					
					console.log('[sharedItemsStorage] Trying Supabase client as fallback for progressions...', sessionInfo)
					const queryResult = await supabase
						.from('progressions')
						.select('id, name, chord_ids, created_at, updated_at, user_id, version')
						.eq('is_public', true)
					
					console.log('[sharedItemsStorage] Supabase client query result:', {
						session: sessionInfo,
						hasData: !!queryResult.data,
						dataLength: queryResult.data?.length || 0,
						hasError: !!queryResult.error,
						errorCode: queryResult.error?.code,
						errorMessage: queryResult.error?.message,
						// Log first few IDs to see what we got
						firstThreeIds: queryResult.data?.slice(0, 3).map((item: any) => ({ id: item.id, name: item.name, user_id: item.user_id })) || []
					})
					
					if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
						console.log('[sharedItemsStorage] ✅ Progressions Supabase client fallback succeeded! Loaded', queryResult.data.length, 'progressions')
						const sortedData = [...queryResult.data].sort((a: any, b: any) => {
							const dateA = new Date(a.updated_at || a.created_at).getTime()
							const dateB = new Date(b.updated_at || b.created_at).getTime()
							return dateB - dateA
						})
						const sharedProgressions = transformSupabaseProgressions(sortedData)
						
						// Use ONLY Supabase items - don't merge with localStorage
						console.log('[sharedItemsStorage] Returning', sharedProgressions.length, 'progressions from Supabase')
						return sharedProgressions
					} else if (queryResult.error) {
						console.error('[sharedItemsStorage] Progressions Supabase client error:', queryResult.error)
						if (!lastRestApiError) {
							lastRestApiError = `Supabase client error: ${queryResult.error.message}`
						}
					} else {
						console.warn('[sharedItemsStorage] Progressions Supabase client returned empty result (no error, but no data)')
					}
				} catch (clientErr) {
					console.error('[sharedItemsStorage] Progressions Supabase client exception:', clientErr)
					if (clientErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `Supabase client exception: ${clientErr.message}`
					}
				}
				
				// Final fallback to localStorage (only if Supabase completely failed)
				console.warn('[sharedItemsStorage] ⚠️ Both REST API and Supabase client failed or returned empty')
				console.warn('[sharedItemsStorage] This should not happen if RLS policies are correct!')
				console.warn('[sharedItemsStorage] NOT falling back to localStorage - returning empty array to prevent device-specific inconsistencies')
				// Don't fall back to localStorage - it causes device-specific counts
				// Return empty array instead
				return []
			}
			
			// For non-Safari browsers, use retry logic
			let hasSession = false
			try {
				const { data: sessionData } = await supabase.auth.getSession()
				hasSession = !!sessionData?.session
				console.log('[sharedItemsStorage] Progressions session check:', hasSession ? 'authenticated' : 'anonymous')
			} catch (sessionErr) {
				console.warn('[sharedItemsStorage] Could not check session:', sessionErr)
			}
			
			// Strategy 1: Query with retry and timeout (non-Safari)
			console.log('[sharedItemsStorage] Attempting progressions query with retry logic...')
			const result = await queryWithRetry(
				async () => {
					try {
						const queryResult = await supabase
							.from('progressions')
							.select('id, name, chord_ids, created_at, updated_at, user_id, version')
							.eq('is_public', true)
						
						console.log('[sharedItemsStorage] Progressions query result:', {
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
						console.error('[sharedItemsStorage] Progressions query exception:', err)
						return {
							data: null,
							error: err
						}
					}
				},
				3,
				10000
			)
			
			// If we got data, use it
			if (result.data && Array.isArray(result.data) && result.data.length > 0) {
				console.log('[sharedItemsStorage] ✅ Successfully loaded', result.data.length, 'public progressions from Supabase')
				
				const sortedData = [...result.data].sort((a: any, b: any) => {
					const dateA = new Date(a.updated_at || a.created_at).getTime()
					const dateB = new Date(b.updated_at || b.created_at).getTime()
					return dateB - dateA
				})
				const sharedProgressions = transformSupabaseProgressions(sortedData)
				
				// Use ONLY Supabase items - don't merge with localStorage
				console.log('[sharedItemsStorage] Returning', sharedProgressions.length, 'progressions from Supabase')
				return sharedProgressions
			}
			
			// If query returned empty array
			if (result.data && Array.isArray(result.data) && result.data.length === 0) {
				console.warn('[sharedItemsStorage] Progressions query succeeded but returned 0 public progressions')
				console.warn('[sharedItemsStorage] NOT falling back to localStorage - returning empty array')
				return []
			}
			
			// If error occurred, log details
			if (result.error) {
				console.error('[sharedItemsStorage] ❌ Progressions query failed:', {
					code: result.error.code,
					message: result.error.message,
					hasSession
				})
			}
			
			// Don't fall back to localStorage - return empty array instead
			console.warn('[sharedItemsStorage] Progressions query failed or returned empty - NOT using localStorage fallback')
			return []
			
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading shared progressions from Supabase:', error)
			console.warn('[sharedItemsStorage] NOT falling back to localStorage after exception')
			return []
		}
	}
	
	console.log('[sharedItemsStorage] Supabase not configured, using localStorage only for progressions')
	const local = loadLocalSharedProgressions()
	console.log('[sharedItemsStorage] Loaded', local.length, 'progressions from localStorage')
	return local
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

// Detect iOS devices
function isIOS(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent.toLowerCase()
	return ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')
}

// Detect Safari/iOS - improved detection
function isSafari(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent.toLowerCase()
	
	// iOS devices always use Safari
	if (isIOS()) {
		return true
	}
	
	// Safari on desktop (but not Chrome/Firefox which also include "safari" in UA)
	if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('firefox') && !ua.includes('edge')) {
		return true
	}
	
	return false
}

// Global error collector for UI display
let lastRestApiError: string | null = null

export function getLastRestApiError(): string | null {
	return lastRestApiError
}

export function clearLastRestApiError(): void {
	lastRestApiError = null
}

export async function loadSharedCompositions(): Promise<SharedComposition[]> {
	console.log('[sharedItemsStorage] loadSharedCompositions called')
	console.log('[sharedItemsStorage] isSupabaseConfigured:', isSupabaseConfigured())
	console.log('[sharedItemsStorage] Browser:', isSafari() ? 'Safari/iOS' : 'Other')
	console.log('[sharedItemsStorage] Call stack:', new Error().stack?.split('\n').slice(1, 4).join('\n'))
	clearLastRestApiError() // Clear previous error
	
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
			const isIOSDevice = isIOS()
			const useRestApi = isIOSDevice || isSafari() || true // Always use REST API for now
			if (useRestApi) {
				console.log('[sharedItemsStorage] Using REST API fetch approach (iOS:', isIOSDevice, ', Safari:', isSafari(), ')')
				let restApiSucceeded = false
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'
					
					console.log('[sharedItemsStorage] Supabase config check:', {
						hasUrl: !!supabaseUrl,
						hasKey: !!supabaseKey,
						urlSource: import.meta.env.VITE_SUPABASE_URL ? 'env' : 'hardcoded',
						keySource: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'env' : 'hardcoded'
					})
					
					// Use REST API directly - more reliable on Safari
					// URL encode the filter parameter properly
					// Add cache-busting timestamp to prevent browser caching
					const cacheBuster = Date.now()
					const url = `${supabaseUrl}/rest/v1/compositions?select=id,name,chords,tempo,time_signature,created_at,updated_at,user_id,version&is_public=eq.true&_t=${cacheBuster}`
					
					console.log('[sharedItemsStorage] Full REST API URL:', url)
					
					console.log('[sharedItemsStorage] Safari: Fetching from REST API:', url.substring(0, 80) + '...')
					console.log('[sharedItemsStorage] Safari: User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown')
					
					const headers: Record<string, string> = {
						'apikey': supabaseKey,
						'Authorization': `Bearer ${supabaseKey}`,
						'Content-Type': 'application/json',
						'Prefer': 'return=representation'
					}
					
					const fetchOptions: RequestInit = {
						method: 'GET',
						headers: headers,
						cache: 'no-cache', // Prevent Safari caching issues
						mode: 'cors', // Explicitly allow CORS
						credentials: 'omit' // Don't send cookies (iOS requirement for some CORS scenarios)
					}
					
					console.log('[sharedItemsStorage] Fetch options:', {
						method: fetchOptions.method,
						hasApikey: !!headers['apikey'],
						hasAuth: !!headers['Authorization'],
						mode: fetchOptions.mode,
						credentials: fetchOptions.credentials
					})
					
					const fetchPromise = fetch(url, fetchOptions)
					
					const timeoutPromise = new Promise<Response>((resolve) => {
						setTimeout(() => {
							console.warn('[sharedItemsStorage] Safari REST API timeout after 8 seconds')
							resolve(new Response(null, { status: 408, statusText: 'Timeout' }))
						}, 8000)
					})
					
					const startTime = Date.now()
					let response: Response
					try {
						response = await Promise.race([fetchPromise, timeoutPromise])
					} catch (fetchError) {
						console.error('[sharedItemsStorage] Fetch promise rejected:', fetchError)
						if (fetchError instanceof Error) {
							const errorMsg = `Network error: ${fetchError.message} (CORS or connectivity issue on iOS?)`
							lastRestApiError = errorMsg
							console.error('[sharedItemsStorage]', errorMsg)
							console.error('[sharedItemsStorage] Full error:', fetchError)
							// Don't throw - let it fall through to try Supabase client fallback
							throw fetchError
						}
						throw fetchError
					}
					const duration = Date.now() - startTime
					
					console.log('[sharedItemsStorage] REST API response:', {
						status: response.status,
						statusText: response.statusText,
						ok: response.ok,
						duration: `${duration}ms`,
						headers: Object.fromEntries(response.headers.entries())
					})
					
					if (response.ok && response.status !== 408) {
						try {
							const data = await response.json()
							console.log('[sharedItemsStorage] ✅ Safari REST API succeeded! Loaded', data.length, 'compositions')
							
							if (!Array.isArray(data)) {
								console.error('[sharedItemsStorage] Safari: Expected array but got:', typeof data)
								throw new Error('Invalid response format')
							}
							
							if (Array.isArray(data)) {
								if (data.length > 0) {
									const sortedData = [...data].sort((a: any, b: any) => {
										const dateA = new Date(a.updated_at || a.created_at).getTime()
										const dateB = new Date(b.updated_at || b.created_at).getTime()
										return dateB - dateA
									})
									const sharedCompositions = transformSupabaseCompositions(sortedData)
									
									// Deduplicate by ID before returning
									const uniqueCompositions = sharedCompositions.filter((c, index, self) => 
										index === self.findIndex(c2 => c2.id === c.id)
									)
									
									if (sharedCompositions.length !== uniqueCompositions.length) {
										console.warn('[sharedItemsStorage] Found duplicate compositions in REST API response:', sharedCompositions.length, '->', uniqueCompositions.length)
									}
									
									// Use ONLY Supabase items - don't merge with localStorage
									// localStorage is device-specific and shouldn't be mixed with shared items
									console.log('[sharedItemsStorage] ✅ Successfully loaded compositions via REST API:', uniqueCompositions.length, 'from Supabase')
									restApiSucceeded = true
									return uniqueCompositions
								} else {
									// Empty array - query succeeded but no results
									console.warn('[sharedItemsStorage] REST API returned empty array (successful but no data)')
									console.warn('[sharedItemsStorage] Will try Supabase client fallback...')
									const errorMsg = 'REST API query succeeded but returned 0 compositions. Will try Supabase client fallback.'
									lastRestApiError = errorMsg
									// Continue to Supabase client fallback below
								}
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
							const errorMsg = `REST API ${response.status}: ${response.statusText} - ${errorText.substring(0, 200)}`
							lastRestApiError = errorMsg
							// Throw error so outer catch can handle it
							throw new Error(errorMsg)
						} catch (textErr) {
							if (textErr instanceof Error && textErr.message.includes('REST API')) {
								throw textErr // Re-throw our error
							}
							console.error('[sharedItemsStorage] REST API error (could not read body):', response.status, response.statusText)
							const errorMsg = `REST API ${response.status}: ${response.statusText}`
							lastRestApiError = errorMsg
							throw new Error(errorMsg)
						}
					}
				} catch (restApiErr) {
					console.error('[sharedItemsStorage] REST API exception:', restApiErr)
					if (restApiErr instanceof Error) {
						console.error('[sharedItemsStorage] Error message:', restApiErr.message)
						console.error('[sharedItemsStorage] Error stack:', restApiErr.stack)
						const errorMsg = `REST API failed: ${restApiErr.message}`
						if (!lastRestApiError) {
							lastRestApiError = errorMsg
						}
						console.error('[sharedItemsStorage]', errorMsg)
						console.log('[sharedItemsStorage] Will try Supabase client fallback...')
					}
				}
				
				// Only try Supabase client as fallback if REST API didn't succeed
				if (restApiSucceeded) {
					console.log('[sharedItemsStorage] REST API succeeded, skipping Supabase client fallback to prevent duplicates')
					// This should never be reached because REST API returns above, but just in case
					return []
				}
				
				// Try Supabase client as fallback (only if REST API failed or returned empty)
				try {
					// Check session for debugging
					let sessionInfo = 'no session'
					try {
						const { data: sessionData } = await supabase.auth.getSession()
						if (sessionData?.session) {
							sessionInfo = `authenticated as ${sessionData.session.user.id}`
						} else {
							sessionInfo = 'anonymous'
						}
					} catch {}
					
					console.log('[sharedItemsStorage] Trying Supabase client as fallback for compositions...', sessionInfo)
					const queryResult = await supabase
						.from('compositions')
						.select('id, name, chords, tempo, time_signature, created_at, updated_at, user_id, version')
						.eq('is_public', true)
					
					console.log('[sharedItemsStorage] Supabase client query result:', {
						session: sessionInfo,
						hasData: !!queryResult.data,
						dataLength: queryResult.data?.length || 0,
						hasError: !!queryResult.error,
						errorCode: queryResult.error?.code,
						errorMessage: queryResult.error?.message,
						// Log first few IDs to see what we got
						firstThreeIds: queryResult.data?.slice(0, 3).map((item: any) => ({ id: item.id, name: item.name, user_id: item.user_id })) || []
					})
					
					if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
						console.log('[sharedItemsStorage] ✅ Compositions Supabase client fallback succeeded! Loaded', queryResult.data.length, 'compositions')
						const sortedData = [...queryResult.data].sort((a: any, b: any) => {
							const dateA = new Date(a.updated_at || a.created_at).getTime()
							const dateB = new Date(b.updated_at || b.created_at).getTime()
							return dateB - dateA
						})
						const sharedCompositions = transformSupabaseCompositions(sortedData)
						
						// Deduplicate by ID
						const uniqueCompositions = sharedCompositions.filter((c, index, self) => 
							index === self.findIndex(c2 => c2.id === c.id)
						)
						
						if (sharedCompositions.length !== uniqueCompositions.length) {
							console.warn('[sharedItemsStorage] Found duplicate compositions in Supabase client fallback:', sharedCompositions.length, '->', uniqueCompositions.length)
						}
						
						// Use ONLY Supabase items - don't merge with localStorage
						console.log('[sharedItemsStorage] Returning', uniqueCompositions.length, 'compositions from Supabase')
						return uniqueCompositions
					} else if (queryResult.error) {
						console.error('[sharedItemsStorage] Compositions Supabase client error:', queryResult.error)
						if (!lastRestApiError) {
							lastRestApiError = `Supabase client error: ${queryResult.error.message}`
						}
					} else {
						console.warn('[sharedItemsStorage] Compositions Supabase client returned empty result (no error, but no data)')
					}
				} catch (clientErr) {
					console.error('[sharedItemsStorage] Compositions Supabase client exception:', clientErr)
					if (clientErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `Supabase client exception: ${clientErr.message}`
					}
				}
				
				// Final fallback to localStorage (only if Supabase completely failed)
				console.warn('[sharedItemsStorage] ⚠️ Both REST API and Supabase client failed or returned empty')
				console.warn('[sharedItemsStorage] This should not happen if RLS policies are correct!')
				console.warn('[sharedItemsStorage] NOT falling back to localStorage - returning empty array to prevent device-specific inconsistencies')
				// Don't fall back to localStorage - it causes device-specific counts
				// Return empty array instead
				return []
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
				
				// Deduplicate by ID
				const uniqueCompositions = sharedCompositions.filter((c, index, self) => 
					index === self.findIndex(c2 => c2.id === c.id)
				)
				
				if (sharedCompositions.length !== uniqueCompositions.length) {
					console.warn('[sharedItemsStorage] Found duplicate compositions in non-Safari query:', sharedCompositions.length, '->', uniqueCompositions.length)
				}
				
				// Use ONLY Supabase items - don't merge with localStorage
				console.log('[sharedItemsStorage] Returning', uniqueCompositions.length, 'compositions from Supabase')
				return uniqueCompositions
			}
			
			// If query returned empty array (not an error, just no data)
			if (result.data && Array.isArray(result.data) && result.data.length === 0) {
				console.warn('[sharedItemsStorage] Query succeeded but returned 0 public compositions')
				console.warn('[sharedItemsStorage] This might mean:')
				console.warn('[sharedItemsStorage]  1. No compositions are marked as is_public=true')
				console.warn('[sharedItemsStorage]  2. RLS policy might be blocking access')
				console.warn('[sharedItemsStorage] NOT falling back to localStorage - returning empty array')
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
			
			// Don't fall back to localStorage - return empty array instead
			console.warn('[sharedItemsStorage] Compositions query failed or returned empty - NOT using localStorage fallback')
			return []
			
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading shared compositions from Supabase:', error)
			console.error('[sharedItemsStorage] Error stack:', error instanceof Error ? error.stack : 'N/A')
			console.warn('[sharedItemsStorage] NOT falling back to localStorage after exception')
			return []
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
 * Save shared progression to Supabase and localStorage
 */
export async function saveSharedProgression(
	progression: Omit<SharedProgression, 'id' | 'sharedBy' | 'sharedByUsername' | 'sharedAt' | 'favoriteCount' | 'version'>,
	isUpdate: boolean = false
): Promise<SharedProgression> {
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
					console.log('[sharedItemsStorage] Sharing progression:', progression.name, 'originalId:', progression.originalId)
					
					// First, try to save the progression to Supabase if it doesn't exist
					// Check if progression exists in Supabase
					let progressionId = progression.originalId
					let existing = null
					
					try {
						const { data: checkExisting } = await supabase
							.from('progressions')
							.select('id, version')
							.eq('id', progression.originalId)
							.eq('user_id', session.user.id)
							.single()
						
						existing = checkExisting
					} catch {
						// Progression doesn't exist in Supabase yet - that's OK, we'll create it
						console.log('[sharedItemsStorage] Progression not found in Supabase, will create new one')
					}
					
					if (!existing) {
						// Progression doesn't exist in Supabase - save it first
						console.log('[sharedItemsStorage] Saving progression to Supabase first...')
						const { data: inserted, error: insertError } = await supabase
							.from('progressions')
							.insert({
								user_id: session.user.id,
								name: progression.name,
								chord_ids: progression.chordIds,
								is_public: true, // Mark as public immediately
								version: 1
							})
							.select()
							.single()
						
						if (insertError) {
							console.error('[sharedItemsStorage] Error inserting progression:', insertError)
							throw insertError
						}
						
						if (inserted) {
							progressionId = inserted.id
							console.log('[sharedItemsStorage] Progression saved to Supabase with ID:', progressionId)
							const saved: SharedProgression = {
								id: inserted.id,
								originalId: inserted.id,
								name: inserted.name,
								chordIds: inserted.chord_ids,
								sharedBy: session.user.id,
								sharedByUsername: getCurrentUsername(),
								sharedAt: new Date(inserted.created_at).getTime(),
								isPublic: true,
								favoriteCount: 0,
								createdAt: new Date(inserted.created_at).getTime(),
								version: inserted.version || 1
							}
							
							saveLocalSharedProgression(saved)
							return saved
						}
					} else {
						// Progression exists - update it to be public
						console.log('[sharedItemsStorage] Progression exists, updating to public...')
						const { data: updated, error } = await supabase
							.from('progressions')
							.update({
								name: progression.name,
								chord_ids: progression.chordIds,
								is_public: true,
								version: isUpdate ? (existing.version || 1) + 1 : existing.version || 1
							})
							.eq('id', progression.originalId)
							.eq('user_id', session.user.id)
							.select()
							.single()
						
						if (error) {
							console.error('[sharedItemsStorage] Error updating progression:', error)
							throw error
						}
						
						if (updated) {
							console.log('[sharedItemsStorage] Progression updated to public:', updated.id)
							const saved: SharedProgression = {
								id: updated.id,
								originalId: updated.id,
								name: updated.name,
								chordIds: updated.chord_ids,
								sharedBy: session.user.id,
								sharedByUsername: getCurrentUsername(),
								sharedAt: new Date(updated.created_at).getTime(),
								isPublic: true,
								favoriteCount: 0,
								createdAt: new Date(updated.created_at).getTime(),
								version: updated.version || 1
							}
							
							saveLocalSharedProgression(saved)
							return saved
						}
					}
				}
			}
		} catch (error) {
			console.warn('[sharedItemsStorage] Error saving progression to Supabase, falling back to localStorage:', error)
		}
	}
	
	// Fallback to localStorage only
	const shared = loadLocalSharedProgressions()
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
 * Save shared progression to localStorage (helper)
 */
function saveLocalSharedProgression(saved: SharedProgression): void {
	const shared = loadLocalSharedProgressions()
	const existingIndex = shared.findIndex(s => s.id === saved.id)
	if (existingIndex >= 0) {
		shared[existingIndex] = saved
	} else {
		shared.push(saved)
	}
	localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(shared))
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
		const shared = loadLocalSharedProgressions()
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
		const shared = loadLocalSharedProgressions()
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
	const progressions = await loadSharedProgressions()
	const compositions = await loadSharedCompositions()
	
	// Deduplicate by ID (in case same item appears multiple times)
	const uniqueProgressions = progressions.filter((p, index, self) => 
		index === self.findIndex(p2 => p2.id === p.id)
	)
	const uniqueCompositions = compositions.filter((c, index, self) => 
		index === self.findIndex(c2 => c2.id === c.id)
	)
	
	if (progressions.length !== uniqueProgressions.length) {
		console.warn('[sharedItemsStorage] Found duplicate progressions:', progressions.length, '->', uniqueProgressions.length)
	}
	if (compositions.length !== uniqueCompositions.length) {
		console.warn('[sharedItemsStorage] Found duplicate compositions:', compositions.length, '->', uniqueCompositions.length)
		console.warn('[sharedItemsStorage] Duplicate IDs:', compositions.map(c => c.id).filter((id, index, self) => self.indexOf(id) !== index))
	}
	
	console.log('[sharedItemsStorage] getRankedSharedItems - loaded:', {
		progressions: uniqueProgressions.length,
		compositions: uniqueCompositions.length,
		total: uniqueProgressions.length + uniqueCompositions.length,
		// Log composition IDs to debug duplicates
		compositionIds: uniqueCompositions.map(c => ({ id: c.id, name: c.name }))
	})
	
	// Sort by favorite count (descending), then by share date (newest first)
	const rankedProgressions = [...uniqueProgressions]
		.filter(p => p.isPublic)
		.sort((a, b) => {
			if (b.favoriteCount !== a.favoriteCount) {
				return b.favoriteCount - a.favoriteCount
			}
			return b.sharedAt - a.sharedAt
		})
	
	const rankedCompositions = [...uniqueCompositions]
		.filter(c => c.isPublic)
		.sort((a, b) => {
			if (b.favoriteCount !== a.favoriteCount) {
				return b.favoriteCount - a.favoriteCount
			}
			return b.sharedAt - a.sharedAt
		})
	
	console.log('[sharedItemsStorage] getRankedSharedItems - ranked:', {
		progressions: rankedProgressions.length,
		compositions: rankedCompositions.length,
		total: rankedProgressions.length + rankedCompositions.length
	})
	
	return {
		progressions: rankedProgressions,
		compositions: rankedCompositions
	}
}

/**
 * Delete shared item from Supabase (set is_public=false or delete)
 * Admins can delete any item, regular users can only delete their own items
 */
export async function deleteSharedItem(itemId: string, itemType: 'progression' | 'composition', isAdmin: boolean = false): Promise<boolean> {
	const currentUserId = getCurrentUserId()
	
	if (!isSupabaseConfigured()) {
		// Fallback to localStorage deletion
		return deleteSharedItemLocal(itemId, itemType, currentUserId)
	}
	
	try {
		const supabase = getSupabaseClient()
		if (!supabase) {
			console.warn('[sharedItemsStorage] Supabase client is null, falling back to localStorage')
			return deleteSharedItemLocal(itemId, itemType, currentUserId)
		}
		
		const tableName = itemType === 'progression' ? 'progressions' : 'compositions'
		
		// For admins, delete without user_id check
		// For regular users, only delete if they own it
		let query = supabase.from(tableName).delete().eq('id', itemId)
		
		if (!isAdmin) {
			// Regular users can only delete their own items
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) {
				console.error('[sharedItemsStorage] No session found for delete operation')
				return false
			}
			query = query.eq('user_id', session.user.id)
		}
		
		const { error } = await query
		
		if (error) {
			console.error(`[sharedItemsStorage] Error deleting ${itemType} from Supabase:`, error)
			
			// Try alternative: set is_public=false instead of deleting
			console.log(`[sharedItemsStorage] Trying alternative: set is_public=false for ${itemId}`)
			let updateQuery = supabase.from(tableName).update({ is_public: false }).eq('id', itemId)
			
			if (!isAdmin) {
				const { data: { session } } = await supabase.auth.getSession()
				if (session?.user?.id) {
					updateQuery = updateQuery.eq('user_id', session.user.id)
				}
			}
			
			const { error: updateError } = await updateQuery
			
			if (updateError) {
				console.error(`[sharedItemsStorage] Error setting is_public=false:`, updateError)
				return false
			}
			
			console.log(`[sharedItemsStorage] Successfully set is_public=false for ${itemId}`)
			return true
		}
		
		console.log(`[sharedItemsStorage] Successfully deleted ${itemType} ${itemId} from Supabase`)
		
		// Also remove from localStorage favorites
		deleteSharedItemLocal(itemId, itemType, currentUserId)
		
		return true
	} catch (error) {
		console.error(`[sharedItemsStorage] Exception deleting ${itemType} from Supabase:`, error)
		return deleteSharedItemLocal(itemId, itemType, currentUserId)
	}
}

/**
 * Clear all localStorage shared items (useful for debugging/cleanup)
 */
export function clearLocalSharedItems(): void {
	try {
		localStorage.removeItem(STORAGE_KEY_PROGRESSIONS)
		localStorage.removeItem(STORAGE_KEY_COMPOSITIONS)
		localStorage.removeItem(STORAGE_KEY_FAVORITES)
		console.log('[sharedItemsStorage] Cleared all localStorage shared items')
	} catch (error) {
		console.error('[sharedItemsStorage] Error clearing localStorage:', error)
	}
}

/**
 * Delete shared item from localStorage (fallback)
 */
function deleteSharedItemLocal(itemId: string, itemType: 'progression' | 'composition', currentUserId: string | null): boolean {
	if (itemType === 'progression') {
		const shared = loadLocalSharedProgressions()
		const item = shared.find(s => s.id === itemId)
		if (!item || (currentUserId && item.sharedBy !== currentUserId)) return false
		
		const filtered = shared.filter(s => s.id !== itemId)
		localStorage.setItem(STORAGE_KEY_PROGRESSIONS, JSON.stringify(filtered))
		
		// Remove all favorites for this item
		const favorites = loadSharedFavorites()
		const filteredFavorites = favorites.filter(f => !(f.itemId === itemId && f.itemType === 'progression'))
		localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filteredFavorites))
	} else {
		const shared = loadLocalSharedCompositions()
		const item = shared.find(s => s.id === itemId)
		if (!item || (currentUserId && item.sharedBy !== currentUserId)) return false
		
		const filtered = shared.filter(s => s.id !== itemId)
		localStorage.setItem(STORAGE_KEY_COMPOSITIONS, JSON.stringify(filtered))
		
		// Remove all favorites for this item
		const favorites = loadSharedFavorites()
		const filteredFavorites = favorites.filter(f => !(f.itemId === itemId && f.itemType === 'composition'))
		localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(filteredFavorites))
	}
	
	return true
}

