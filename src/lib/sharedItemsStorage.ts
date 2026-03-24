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
 * Get current username (fallback to email or "Anonymous")
 */
function getCurrentUsername(): string {
	// Try to get from Supabase session first
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (supabase) {
				// Try to get from cached session
				const user = getCurrentUser()
				if (user) {
					if (user.username) {
						return user.username
					}
					if (user.email) {
						// Use email prefix as username
						return user.email.split('@')[0]
					}
				}
			}
		} catch {
			// ignore
		}
	}
	
	// Fallback to localStorage session
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
	clearLastRestApiError()
	
	// Transform function
	function transformSupabaseProgressions(items: any[]): SharedProgression[] {
		const currentUser = getCurrentUser()
		return items.map(item => {
			// Try to get username - if current user matches, use their username
			let username = 'Anonymous'
			if (currentUser && currentUser.id === item.user_id) {
				username = currentUser.username || currentUser.email?.split('@')[0] || 'Anonymous'
			} else {
				// Check localStorage for saved username
				const localShared = loadLocalSharedProgressions()
				const localItem = localShared.find(l => l.id === item.id || l.originalId === item.id)
				if (localItem?.sharedByUsername && localItem.sharedByUsername !== 'Anonymous') {
					username = localItem.sharedByUsername
				}
			}
			return {
				id: item.id,
				originalId: item.id,
				name: item.name,
				chordIds: item.chord_ids,
				sharedBy: item.user_id,
				sharedByUsername: username,
				sharedAt: new Date(item.created_at).getTime(),
				isPublic: true,
				favoriteCount: 0,
				createdAt: new Date(item.created_at).getTime(),
				version: item.version || 1
			}
		})
	}
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				return loadLocalSharedProgressions()
			}
			
			// Try REST API directly via fetch (works better on Safari/iOS)
			const isIOSDevice = isIOS()
			const useRestApi = isIOSDevice || isSafari() || true
			if (useRestApi) {
				let restApiSucceeded = false
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'
					
					const url = `${supabaseUrl}/rest/v1/progressions?select=id,name,chord_ids,created_at,updated_at,user_id,version&is_public=eq.true`
					
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
							resolve(new Response(null, { status: 408, statusText: 'Timeout' }))
						}, 8000)
					})
					
					const response = await Promise.race([fetchPromise, timeoutPromise])
					
					if (response.ok && response.status !== 408) {
						try {
							const data = await response.json()
							
							if (!Array.isArray(data)) {
								throw new Error('Invalid response format')
							}
							
							if (data.length > 0) {
								const sortedData = [...data].sort((a: any, b: any) => {
									const dateA = new Date(a.updated_at || a.created_at).getTime()
									const dateB = new Date(b.updated_at || b.created_at).getTime()
									return dateB - dateA
								})
								const sharedProgressions = transformSupabaseProgressions(sortedData)
								
								// Deduplicate by ID
								const uniqueProgressions = sharedProgressions.filter((p, index, self) => 
									index === self.findIndex(p2 => p2.id === p.id)
								)
								
								restApiSucceeded = true
								return uniqueProgressions
							} else {
								const errorMsg = 'REST API query succeeded but returned 0 progressions. Will try Supabase client fallback.'
								lastRestApiError = errorMsg
							}
						} catch (parseErr) {
							console.error('[sharedItemsStorage] Error parsing progressions JSON:', parseErr)
							throw parseErr
						}
					} else {
						const errorMsg = `REST API ${response.status}: ${response.statusText}`
						lastRestApiError = errorMsg
						throw new Error(errorMsg)
					}
				} catch (restApiErr) {
					console.error('[sharedItemsStorage] REST API error:', restApiErr)
					if (restApiErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `REST API failed: ${restApiErr.message}`
					}
				}
				
				// Skip Supabase client fallback if REST API succeeded
				if (restApiSucceeded) {
					return []
				}
				
				// Try Supabase client as fallback (only if REST API failed or returned empty)
				try {
					const queryResult = await supabase
						.from('progressions')
						.select('id, name, chord_ids, created_at, updated_at, user_id, version')
						.eq('is_public', true)
					
					if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
						const sortedData = [...queryResult.data].sort((a: any, b: any) => {
							const dateA = new Date(a.updated_at || a.created_at).getTime()
							const dateB = new Date(b.updated_at || b.created_at).getTime()
							return dateB - dateA
						})
						const sharedProgressions = transformSupabaseProgressions(sortedData)
						
						// Deduplicate by ID
						const uniqueProgressions = sharedProgressions.filter((p, index, self) => 
							index === self.findIndex(p2 => p2.id === p.id)
						)
						
						return uniqueProgressions
					} else if (queryResult.error) {
						console.error('[sharedItemsStorage] Supabase client error:', queryResult.error)
						if (!lastRestApiError) {
							lastRestApiError = `Supabase client error: ${queryResult.error.message}`
						}
					}
				} catch (clientErr) {
					console.error('[sharedItemsStorage] Supabase client exception:', clientErr)
					if (clientErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `Supabase client exception: ${clientErr.message}`
					}
				}
				
				// Return empty array if both REST API and Supabase client failed
				return []
			}
			
			// For non-Safari browsers, use retry logic
			const result = await queryWithRetry(
				async () => {
					try {
						const queryResult = await supabase
							.from('progressions')
							.select('id, name, chord_ids, created_at, updated_at, user_id, version')
							.eq('is_public', true)
						
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
				3,
				10000
			)
			
			if (result.data && Array.isArray(result.data) && result.data.length > 0) {
				const sortedData = [...result.data].sort((a: any, b: any) => {
					const dateA = new Date(a.updated_at || a.created_at).getTime()
					const dateB = new Date(b.updated_at || b.created_at).getTime()
					return dateB - dateA
				})
				const sharedProgressions = transformSupabaseProgressions(sortedData)
				
				// Deduplicate by ID
				const uniqueProgressions = sharedProgressions.filter((p, index, self) => 
					index === self.findIndex(p2 => p2.id === p.id)
				)
				
				return uniqueProgressions
			}
			
			if (result.error) {
				console.error('[sharedItemsStorage] Query failed:', result.error)
				if (!lastRestApiError) {
					lastRestApiError = result.error.message || 'Query failed'
				}
			}
			
			return []
			
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading progressions:', error)
			return []
		}
	}
	
	return loadLocalSharedProgressions()
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
	clearLastRestApiError()
	
	// Transform function (reusable)
	function transformSupabaseCompositions(items: any[]): SharedComposition[] {
		const currentUser = getCurrentUser()
		return items.map(item => {
			// Try to get username - if current user matches, use their username
			let username = 'Anonymous'
			if (currentUser && currentUser.id === item.user_id) {
				username = currentUser.username || currentUser.email?.split('@')[0] || 'Anonymous'
			} else {
				// Check localStorage for saved username
				const localShared = loadLocalSharedCompositions()
				const localItem = localShared.find(l => l.id === item.id || l.originalId === item.id)
				if (localItem?.sharedByUsername && localItem.sharedByUsername !== 'Anonymous') {
					username = localItem.sharedByUsername
				}
			}
			return {
				id: item.id,
				originalId: item.id,
				name: item.name,
				chords: item.chords as SharedComposition['chords'],
				tempo: item.tempo,
				timeSignature: item.time_signature as '3/4' | '4/4',
				fluteType: 'innato',
				tuning: '440',
				sharedBy: item.user_id,
				sharedByUsername: username,
				sharedAt: new Date(item.created_at).getTime(),
				isPublic: true,
				favoriteCount: 0,
				isReadOnly: true,
				createdAt: new Date(item.created_at).getTime(),
				updatedAt: new Date(item.updated_at).getTime(),
				version: item.version || 1
			}
		})
	}
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				return loadLocalSharedCompositions()
			}
			
			// Try REST API directly via fetch (works better on Safari/iOS)
			const isIOSDevice = isIOS()
			const useRestApi = isIOSDevice || isSafari() || true
			if (useRestApi) {
				let restApiSucceeded = false
				try {
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'
					
					const url = `${supabaseUrl}/rest/v1/compositions?select=id,name,chords,tempo,time_signature,created_at,updated_at,user_id,version&is_public=eq.true`
					
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
							resolve(new Response(null, { status: 408, statusText: 'Timeout' }))
						}, 8000)
					})
					
					const response = await Promise.race([fetchPromise, timeoutPromise])
					
					if (response.ok && response.status !== 408) {
						try {
							const data = await response.json()
							
							if (!Array.isArray(data)) {
								throw new Error('Invalid response format')
							}
							
							if (data.length > 0) {
								const sortedData = [...data].sort((a: any, b: any) => {
									const dateA = new Date(a.updated_at || a.created_at).getTime()
									const dateB = new Date(b.updated_at || b.created_at).getTime()
									return dateB - dateA
								})
								const sharedCompositions = transformSupabaseCompositions(sortedData)
								
								// Deduplicate by ID
								const uniqueCompositions = sharedCompositions.filter((c, index, self) => 
									index === self.findIndex(c2 => c2.id === c.id)
								)
								
								restApiSucceeded = true
								return uniqueCompositions
							} else {
								const errorMsg = 'REST API query succeeded but returned 0 compositions. Will try Supabase client fallback.'
								lastRestApiError = errorMsg
							}
						} catch (parseErr) {
							console.error('[sharedItemsStorage] Error parsing compositions JSON:', parseErr)
							throw parseErr
						}
					} else {
						const errorMsg = `REST API ${response.status}: ${response.statusText}`
						lastRestApiError = errorMsg
						throw new Error(errorMsg)
					}
				} catch (restApiErr) {
					console.error('[sharedItemsStorage] REST API error:', restApiErr)
					if (restApiErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `REST API failed: ${restApiErr.message}`
					}
				}
				
				// Skip Supabase client fallback if REST API succeeded
				if (restApiSucceeded) {
					return []
				}
				
				// Try Supabase client as fallback (only if REST API failed or returned empty)
				try {
					const queryResult = await supabase
						.from('compositions')
						.select('id, name, chords, tempo, time_signature, created_at, updated_at, user_id, version')
						.eq('is_public', true)
					
					if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
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
						
						return uniqueCompositions
					} else if (queryResult.error) {
						console.error('[sharedItemsStorage] Supabase client error:', queryResult.error)
						if (!lastRestApiError) {
							lastRestApiError = `Supabase client error: ${queryResult.error.message}`
						}
					}
				} catch (clientErr) {
					console.error('[sharedItemsStorage] Supabase client exception:', clientErr)
					if (clientErr instanceof Error && !lastRestApiError) {
						lastRestApiError = `Supabase client exception: ${clientErr.message}`
					}
				}
				
				return []
			}
			
			// For non-Safari browsers, use retry logic
			const result = await queryWithRetry(
				async () => {
					try {
						const queryResult = await supabase
							.from('compositions')
							.select('id, name, chords, tempo, time_signature, created_at, updated_at, user_id, version')
							.eq('is_public', true)
						
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
				3,
				10000
			)
			
			if (result.data && Array.isArray(result.data) && result.data.length > 0) {
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
				
				return uniqueCompositions
			}
			
			if (result.error) {
				console.error('[sharedItemsStorage] Query failed:', result.error)
				if (!lastRestApiError) {
					lastRestApiError = result.error.message || 'Query failed'
				}
			}
			
			return []
			
		} catch (error) {
			console.error('[sharedItemsStorage] Exception loading compositions:', error)
			return []
		}
	}
	
	return loadLocalSharedCompositions()
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

