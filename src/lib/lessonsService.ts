/**
 * Lessons Service
 * 
 * Unified service for lesson storage with Supabase + localStorage fallback.
 * Automatically uses Supabase if configured, falls back to localStorage otherwise.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser } from './authService'
import type { Lesson } from './lessonsData'
export type { Lesson }
import { 
	loadLessons as localLoadLessons,
	saveLessons as localSaveLessons,
	updateLesson as localUpdateLesson,
	deleteLesson as localDeleteLesson,
	loadLessonProgress
} from './lessonsData'

/**
 * Service interface for lesson operations
 * This allows us to swap implementations (localStorage -> database) without changing consuming code
 */
export interface LessonsService {
	loadLessons(): Promise<Lesson[]>
	saveLessons(lessons: Lesson[]): Promise<void>
	updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<boolean>
	addLesson(lesson: Omit<Lesson, 'id'>): Promise<Lesson>
	deleteLesson(lessonId: string): Promise<boolean>
	getLessonsWithProgress(): Promise<Lesson[]>
	reorderLessons(lessonIds: string[]): Promise<boolean>
}

/**
 * Sync local lessons to Supabase (migrates localStorage → Supabase)
 * Only admins can sync lessons (lessons are global)
 * Can be called manually by admins to migrate local lessons to Supabase
 */
export async function syncLocalLessonsToSupabase(): Promise<number> {
	if (!isSupabaseConfigured()) return 0
	
	try {
		const supabase = getSupabaseClient()
		if (!supabase) return 0
		
		const user = getCurrentUser()
		if (!user) return 0
		
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.user?.id) return 0
		
		// Only admins can sync lessons
		const { isAdmin } = await import('./authService')
		if (!isAdmin(user)) {
			console.warn('[lessonsService] Non-admin attempted to sync lessons')
			return 0
		}
		
		// Get all local lessons
		const localLessons = localLoadLessons()
		if (localLessons.length === 0) return 0
		
		// Filter out dummy lessons (those without compositionId) before syncing
		const validLocalLessons = localLessons.filter(lesson => lesson.compositionId !== null)
		if (validLocalLessons.length === 0) {
			console.log('[lessonsService] No valid lessons to sync (all are dummy lessons without compositionId)')
			return 0
		}
		
		if (validLocalLessons.length !== localLessons.length) {
			console.log(`[lessonsService] Filtered out ${localLessons.length - validLocalLessons.length} dummy lessons before syncing`)
		}
		
		// Get existing Supabase lessons (by custom_id to avoid duplicates)
		// Lessons are global, so don't filter by created_by
		const { data: existingData, error: existingError } = await supabase
			.from('lessons')
			.select('custom_id')
		
		if (existingError) {
			console.warn('[lessonsService] Error checking existing lessons:', existingError)
			// Continue anyway - might be RLS issue, but we'll try to insert
		}
		
		const existingCustomIds = new Set((existingData || []).map(l => l.custom_id).filter(Boolean))
		console.log(`[lessonsService] Found ${existingCustomIds.size} existing lessons in Supabase, ${localLessons.length} local lessons to check`)
		
		// Upload local lessons that don't exist in Supabase
		let syncedCount = 0
		for (const local of validLocalLessons) {
			if (existingCustomIds.has(local.id)) {
				continue // Already exists
			}
			
			// Extract lesson number from id like "lesson-1" -> 1
			const match = local.id.match(/lesson-(\d+)/)
			const lessonNumber = match ? parseInt(match[1], 10) : validLocalLessons.indexOf(local) + 1
			
			try {
				const { error } = await supabase
					.from('lessons')
					.insert({
						created_by: session.user.id, // Admin who created it
						composition_id: local.compositionId || null,
						lesson_number: lessonNumber,
						title: local.title,
						description: local.description || null, // Make sure description is synced
						difficulty: local.category, // Map category to difficulty (beginner/intermediate/advanced)
						category: null, // Don't use category field - use topic instead
						subtitle: local.subtitle || null, // Make sure subtitle is synced
						topic: (local as any).topic || null, // Make sure topic is synced (Progressions, Melodies, etc.)
						custom_id: local.id // Store the custom ID like "lesson-1"
					})
				
				if (!error) {
					syncedCount++
					console.log(`[lessonsService] Synced lesson "${local.title}" (${local.id}) to Supabase`)
				} else {
					console.warn(`[lessonsService] Error syncing lesson ${local.id}:`, error)
				}
			} catch (err) {
				console.warn(`[lessonsService] Failed to sync lesson ${local.id}:`, err)
			}
		}
		
		if (syncedCount > 0) {
			console.log(`[lessonsService] Synced ${syncedCount} local lessons to Supabase`)
		}
		
		return syncedCount
	} catch (error) {
		console.error('[lessonsService] Error syncing to Supabase:', error)
		return 0
	}
}

/**
 * LocalStorage implementation with Supabase sync
 */
class LocalLessonsService implements LessonsService {
	async loadLessons(): Promise<Lesson[]> {
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) return localLoadLessons()
				
				// Lessons are global - no authentication required to view them
				// Load ALL lessons from Supabase (not filtered by user)
				// This works even when logged out due to RLS policy "Anyone can read lessons"
				
				// Get deleted lesson IDs from localStorage (similar to compositions)
				const deletedIdsKey = 'deleted-lesson-ids'
				const deletedIds = new Set<string>(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
				
				const { data, error } = await supabase
					.from('lessons')
					.select('*')
					.order('lesson_number', { ascending: true })
				
				if (error) {
					console.warn('[lessonsService] Supabase error loading lessons, falling back to localStorage:', error)
					return localLoadLessons()
				}
				
				// Transform Supabase data to Lesson format
				const supabaseLessons = (data || [])
					.filter(item => {
						// Filter out deleted lessons
						const customId = item.custom_id || `lesson-${item.lesson_number}`
						return !deletedIds.has(customId)
					})
					.map(item => {
						// Extract lesson number from custom_id or lesson_number
						const customId = item.custom_id || `lesson-${item.lesson_number}`
						const lessonNum = customId.match(/lesson-(\d+)/)?.[1] ? parseInt(customId.match(/lesson-(\d+)/)![1], 10) : item.lesson_number
						
						const lesson: Lesson = {
							id: customId,
							title: `Lesson ${lessonNum}`, // Always generate title from custom_id number, ignore Supabase title
							subtitle: item.subtitle || '',
							topic: item.topic || '', // Only use topic field, don't fallback to category
							description: item.description || '', // Preserve description
							category: (item.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
							compositionId: item.composition_id,
							unlocked: false, // Will be calculated
							completed: false // Will be loaded from progress
						}
						
						// Debug log for each lesson to verify fields
						console.log(`[lessonsService] Loaded lesson "${lesson.title}" (${lesson.id}):`, {
							subtitle: item.subtitle || '(empty)',
							description: item.description || '(empty)',
							topic: item.topic || '(empty)',
							category: item.category || '(empty)',
							difficulty: item.difficulty || '(empty)',
							compositionId: lesson.compositionId
						})
						
						return lesson
					})
				
				// Don't filter out lessons - show all lessons from Supabase
				// Only filter dummy lessons when they're created locally, not when loading from Supabase
				console.log(`[lessonsService] Loaded ${supabaseLessons.length} lessons from Supabase`)
				
				// Only clean up localStorage dummy lessons if Supabase has valid lessons
				if (supabaseLessons.length > 0) {
					const localLessonsCheck = localLoadLessons()
					const localDummyCount = localLessonsCheck.filter(l => !l.compositionId).length
					if (localDummyCount > 0) {
						console.log(`[lessonsService] Found ${localDummyCount} dummy lessons in localStorage, cleaning up...`)
						const validLocalLessons = localLessonsCheck.filter(l => l.compositionId !== null)
						localSaveLessons(validLocalLessons)
					}
				}
				
				// If admin is logged in and Supabase has lessons, check if local lessons need syncing
				const user = getCurrentUser()
				if (user) {
					const { isAdmin } = await import('./authService')
					if (isAdmin(user) && supabaseLessons.length > 0) {
						// Check if there are local lessons not in Supabase
						const localLessonsForSync = localLoadLessons()
						const supabaseCustomIds = new Set(supabaseLessons.map(l => l.id))
						const localOnly = localLessonsForSync.filter(l => !supabaseCustomIds.has(l.id) && l.compositionId !== null)
						
						// Auto-sync local lessons that aren't in Supabase (one-time per session)
						if (localOnly.length > 0) {
							const syncKey = `lesson-auto-sync-${user.id}`
							if (!sessionStorage.getItem(syncKey)) {
								try {
									const synced = await syncLocalLessonsToSupabase()
									if (synced > 0) {
										console.log(`[lessonsService] Auto-synced ${synced} local lessons to Supabase`)
										// Reload from Supabase after sync
										const { data: reloadData } = await supabase
											.from('lessons')
											.select('*')
											.order('lesson_number', { ascending: true })
										
										if (reloadData) {
											sessionStorage.setItem(syncKey, 'true')
											
											// Get deleted lesson IDs from localStorage
											const deletedIdsKey = 'deleted-lesson-ids'
											const deletedIds = new Set<string>(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
											
											const reloadedLessons = (reloadData || [])
												.filter(item => {
													// Filter out deleted lessons
													const customId = item.custom_id || `lesson-${item.lesson_number}`
													return !deletedIds.has(customId)
												})
												.map(item => {
													const customId = item.custom_id || `lesson-${item.lesson_number}`
													const lessonNum = customId.match(/lesson-(\d+)/)?.[1] ? parseInt(customId.match(/lesson-(\d+)/)![1], 10) : item.lesson_number
													return {
														id: customId,
														title: `Lesson ${lessonNum}`, // Always generate title from custom_id number
														subtitle: item.subtitle || '',
														topic: item.topic || '', // Only use topic field, don't fallback to category
														description: item.description || '',
														category: (item.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
														compositionId: item.composition_id,
														unlocked: false,
														completed: false
													} as Lesson
												})
												.filter(lesson => lesson.compositionId !== null)
											return reloadedLessons
										}
									}
								} catch (syncError) {
									console.error('[lessonsService] Error auto-syncing lessons:', syncError)
								}
							}
						}
					}
				}
				
				// If we have Supabase lessons, use them (they're global)
				if (supabaseLessons.length > 0) {
					console.log(`[lessonsService] Loaded ${supabaseLessons.length} lessons from Supabase`)
					return supabaseLessons
				}
				
				// Fallback to local if Supabase is empty
				const localLessonsFallback = localLoadLessons()
				// Only filter dummy lessons from localStorage fallback, not from Supabase
				const validLocalLessonsFallback = localLessonsFallback.filter(l => l.compositionId !== null)
				console.log(`[lessonsService] Supabase empty, loaded ${validLocalLessonsFallback.length} lessons from localStorage`)
				return validLocalLessonsFallback
			} catch (error) {
				console.error('[lessonsService] Error loading from Supabase:', error)
				// Always fallback to localStorage on error
				const localLessons = localLoadLessons()
				return localLessons.filter(l => l.compositionId !== null)
			}
		}
		
		const localLessons = localLoadLessons()
		return localLessons.filter(l => l.compositionId !== null)
	}

	async saveLessons(lessons: Lesson[]): Promise<void> {
		// Only admins can save lessons (lessons are global)
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) {
					localSaveLessons(lessons)
					return
				}
				
				const user = getCurrentUser()
				if (!user) {
					localSaveLessons(lessons)
					return
				}
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) {
					localSaveLessons(lessons)
					return
				}
				
				// Admin check - only admins can save global lessons
				const { isAdmin } = await import('./authService')
				if (!isAdmin(user)) {
					console.warn('[lessonsService] Non-admin user attempted to save lessons')
					localSaveLessons(lessons)
					return
				}
				
				// Delete all existing lessons, then insert new ones
				// Lessons are global, so we delete all (admin-only operation)
				await supabase
					.from('lessons')
					.delete()
					.neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible UUID)
				
				// Insert all lessons
				const insertData = lessons.map(lesson => {
					const match = lesson.id.match(/lesson-(\d+)/)
					const lessonNumber = match ? parseInt(match[1], 10) : lessons.indexOf(lesson) + 1
					
				return {
					created_by: session.user.id,
					composition_id: lesson.compositionId || null,
					lesson_number: lessonNumber,
					title: lesson.title,
					description: lesson.description || null,
					difficulty: lesson.category, // beginner/intermediate/advanced
					category: null, // Don't use category field - use topic instead
					subtitle: lesson.subtitle || null,
					topic: (lesson as any).topic || null, // Topic/category like "Progressions", "Melodies", etc.
					custom_id: lesson.id
				}
				})
				
				if (insertData.length > 0) {
					const { error } = await supabase
						.from('lessons')
						.insert(insertData)
					
					if (error) {
						// If custom_id column doesn't exist (error code PGRST204), silently fall back to localStorage
						// This happens when the migration hasn't been run yet
						if (error.code === 'PGRST204' && error.message?.includes('custom_id')) {
							localSaveLessons(lessons)
							return
						}
						console.warn('[lessonsService] Supabase error saving lessons, falling back to localStorage:', error)
						localSaveLessons(lessons)
						return
					}
				}
				
				// Also save to local storage as backup
				localSaveLessons(lessons)
				return
			} catch (error) {
				console.error('[lessonsService] Error saving lessons to Supabase:', error)
				localSaveLessons(lessons)
				return
			}
		}
		
		localSaveLessons(lessons)
	}

	async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<boolean> {
		// Only admins can update lessons (lessons are global)
		// Update local first
		const localResult = localUpdateLesson(lessonId, updates)
		
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) return localResult
				
				const user = getCurrentUser()
				if (!user) return localResult
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) return localResult
				
				// Admin check - only admins can update global lessons
				const { isAdmin } = await import('./authService')
				if (!isAdmin(user)) {
					console.warn('[lessonsService] Non-admin user attempted to update lesson')
					return localResult
				}
				
				// Update in Supabase using custom_id (lessons are global, no user filter needed)
				const updateData: any = {}
				if (updates.title !== undefined) updateData.title = updates.title
				if (updates.subtitle !== undefined) {
					updateData.subtitle = updates.subtitle || null // Allow empty strings, convert to null for Supabase
				}
				if ((updates as any).topic !== undefined) {
					updateData.topic = (updates as any).topic || null
					updateData.category = null // Don't use category field - use topic instead
				}
				if (updates.description !== undefined) {
					updateData.description = updates.description || null
				}
				if (updates.category !== undefined) updateData.difficulty = updates.category // category maps to difficulty
				if (updates.compositionId !== undefined) updateData.composition_id = updates.compositionId
				
				// Only update lesson_number if title actually changed (indicating a position change)
				// Don't update lesson_number if we're just updating other fields like subtitle/description
				// Get the current lesson to compare
				const { data: currentLesson } = await supabase
					.from('lessons')
					.select('title, lesson_number')
					.eq('custom_id', lessonId)
					.single()
				
				if (currentLesson && updates.title && updates.title !== currentLesson.title) {
					// Title changed, so update lesson_number based on new position
					const match = updates.title.match(/Lesson (\d+)/)
					if (match) {
						const newLessonNumber = parseInt(match[1], 10)
						// Only update if it's different from current
						if (newLessonNumber !== currentLesson.lesson_number) {
							updateData.lesson_number = newLessonNumber
						}
					}
				}
				
				console.log(`[lessonsService] Updating lesson ${lessonId} with:`, updateData)
				
				const { error, data } = await supabase
					.from('lessons')
					.update(updateData)
					.eq('custom_id', lessonId) // Lessons are global, no user filter
					.select()
				
				if (error) {
					console.warn('[lessonsService] Supabase error updating lesson, using local result:', error)
				} else {
					console.log(`[lessonsService] Successfully updated lesson ${lessonId}. Rows updated: ${data?.length || 0}`)
					if (data && data.length > 0) {
						console.log(`[lessonsService] Updated lesson data:`, {
							subtitle: data[0].subtitle,
							description: data[0].description,
							topic: data[0].topic
						})
					}
				}
			} catch (error) {
				console.error('[lessonsService] Error updating lesson in Supabase:', error)
			}
		}
		
		return localResult
	}

	async addLesson(lesson: Omit<Lesson, 'id'>): Promise<Lesson> {
		// Only admins can add lessons (lessons are global)
		
		// Check Supabase for existing lessons BEFORE creating local lesson
		// This ensures we use the correct next lesson number
		let maxLessonNumber = 0
		
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (supabase) {
					const user = getCurrentUser()
					if (user) {
						const { data: { session } } = await supabase.auth.getSession()
						if (session?.user?.id) {
							// Admin check - only admins can add global lessons
							const { isAdmin } = await import('./authService')
							if (isAdmin(user)) {
								// Check existing lessons in Supabase to determine next lesson number
								const { data: existingLessons } = await supabase
									.from('lessons')
									.select('custom_id')
									.order('lesson_number', { ascending: true })
								
								// Find the highest lesson number from Supabase
								const getLessonNumber = (id: string | null | undefined): number => {
									if (!id) return 0
									const match = id.match(/lesson-(\d+)/)
									return match ? parseInt(match[1], 10) : 0
								}
								
								const maxFromSupabase = (existingLessons || []).reduce((max, l) => {
									const num = getLessonNumber(l.custom_id)
									return num > max ? num : max
								}, 0)
								
								maxLessonNumber = maxFromSupabase
							}
						}
					}
				}
			} catch (error) {
				console.warn('[lessonsService] Error checking Supabase lessons, using localStorage:', error)
			}
		}
		
		// Also check localStorage for any lessons not yet synced
		const localLessons = localLoadLessons()
		const getLessonNumber = (id: string): number => {
			const match = id.match(/lesson-(\d+)/)
			return match ? parseInt(match[1], 10) : 0
		}
		
		const maxFromLocal = localLessons.reduce((max, l) => {
			const num = getLessonNumber(l.id)
			return num > max ? num : max
		}, 0)
		
		// Use the maximum of both Supabase and localStorage
		maxLessonNumber = Math.max(maxLessonNumber, maxFromLocal)
		
		// Create lesson with correct number (override localAddLesson's number)
		const nextLessonNumber = maxLessonNumber + 1
		const newLesson: Lesson = {
			...lesson,
			id: `lesson-${nextLessonNumber}`,
			title: `Lesson ${nextLessonNumber}`,
			subtitle: lesson.subtitle || '',
			topic: (lesson as any).topic || ''
		}
		
		// Add to localStorage
		const updatedLocalLessons = [...localLessons, newLesson]
		localSaveLessons(updatedLocalLessons)
		
		// Add to Supabase if configured
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) return newLesson
				
				const user = getCurrentUser()
				if (!user) return newLesson
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) return newLesson
				
				// Admin check - only admins can add global lessons
				const { isAdmin } = await import('./authService')
				if (!isAdmin(user)) {
					console.warn('[lessonsService] Non-admin user attempted to add lesson')
					return newLesson
				}
				
				// Extract lesson number from id like "lesson-1" -> 1
				const lessonNumber = nextLessonNumber
				
				const { error } = await supabase
					.from('lessons')
					.insert({
						created_by: session.user.id, // Admin who created it
						composition_id: lesson.compositionId || null,
						lesson_number: lessonNumber,
						title: newLesson.title,
						description: lesson.description || null,
						difficulty: lesson.category, // beginner/intermediate/advanced
						category: null, // Don't use category field - use topic instead
						subtitle: lesson.subtitle || null,
						topic: (lesson as any).topic || null, // Topic/category like "Progressions", "Melodies", etc.
						custom_id: newLesson.id
					})
				
				if (error) {
					console.warn('[lessonsService] Supabase error adding lesson, using local result:', error)
				}
			} catch (error) {
				console.error('[lessonsService] Error adding lesson to Supabase:', error)
			}
		}
		
		return newLesson
	}

	async deleteLesson(lessonId: string): Promise<boolean> {
		// Only admins can delete lessons (lessons are global)
		// Delete from local first
		const localResult = localDeleteLesson(lessonId)
		
		// Track deleted lesson ID in localStorage (similar to compositions)
		const deletedIdsKey = 'deleted-lesson-ids'
		const deletedIds = new Set<string>(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
		deletedIds.add(lessonId)
		localStorage.setItem(deletedIdsKey, JSON.stringify(Array.from(deletedIds)))
		
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) return localResult
				
				const user = getCurrentUser()
				if (!user) return localResult
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) return localResult
				
				// Admin check - only admins can delete global lessons
				const { isAdmin } = await import('./authService')
				if (!isAdmin(user)) {
					console.warn('[lessonsService] Non-admin user attempted to delete lesson')
					return localResult
				}
				
				// Delete from Supabase using custom_id (lessons are global, no user filter)
				const { error, data } = await supabase
					.from('lessons')
					.delete()
					.eq('custom_id', lessonId)
					.select()
				
				if (error) {
					console.warn('[lessonsService] Supabase error deleting lesson, using local result:', error)
					// Even if Supabase deletion fails, we've tracked it in localStorage, so it won't show up
				} else {
					console.log(`[lessonsService] Deleted lesson ${lessonId} from Supabase. Rows deleted: ${data?.length || 0}`)
					// If Supabase deletion succeeded, we can keep the ID in the deleted list as a safety measure
				}
			} catch (error) {
				console.error('[lessonsService] Error deleting lesson from Supabase:', error)
				// Even if Supabase deletion fails, we've tracked it in localStorage, so it won't show up
			}
		}
		
		return localResult
	}

	async getLessonsWithProgress(): Promise<Lesson[]> {
		// Load lessons (from Supabase if available - global, no auth required)
		let lessons = await this.loadLessons()
		
		// Only filter dummy lessons when they're created locally, not when loading from Supabase
		// This ensures we don't accidentally filter out valid lessons from the database
		// Filter only applies to localStorage fallback
		if (lessons.length > 0) {
			// Check if any lessons are from localStorage (they might be dummy)
			const hasLocalDummy = lessons.some(l => !l.compositionId)
			if (hasLocalDummy) {
				// Only filter if we're using localStorage fallback
				lessons = lessons.filter(lesson => lesson.compositionId !== null)
			}
		}
		
		// Load progress (user-specific, requires auth, falls back to localStorage)
		const { loadLessonProgress } = await import('./lessonProgressService')
		const progress = await loadLessonProgress()
		
		// Lessons from Supabase are already sorted by lesson_number ascending
		// But we should sort by custom_id to ensure consistent ordering
		// Always sort by custom_id number extracted from ID (lesson-1, lesson-2, etc.)
		let sortedLessons = lessons
		if (lessons.length > 0) {
			const getLessonNumber = (id: string): number => {
				const match = id.match(/lesson-(\d+)/)
				return match ? parseInt(match[1], 10) : Infinity
			}
			// Always sort by custom_id number to ensure correct order
			sortedLessons = [...lessons].sort((a, b) => {
				return getLessonNumber(a.id) - getLessonNumber(b.id)
			})
			
			// Update titles based on custom_id number, not array position
			// This ensures titles match the actual lesson number from custom_id
			const updatedLessons = sortedLessons.map((lesson) => {
				const lessonNum = getLessonNumber(lesson.id)
				const expectedTitle = `Lesson ${lessonNum}`
				
				return {
					...lesson,
					title: expectedTitle, // Use custom_id number, not array index
					subtitle: lesson.subtitle || '',
					topic: (lesson as any).topic || '',
					description: lesson.description || '' // Preserve description
				}
			})
			
			// Only save if titles changed (this will sync to Supabase via saveLessons)
			const titlesChanged = sortedLessons.some((lesson) => {
				const lessonNum = getLessonNumber(lesson.id)
				return lesson.title !== `Lesson ${lessonNum}`
			})
			if (titlesChanged) {
				await this.saveLessons(updatedLessons)
			}
			
			// Use updated lessons for progress calculation
			sortedLessons = updatedLessons
		}
		
		return sortedLessons.map((lesson, index) => {
			const completed = progress[lesson.id] === true
			// Unlock if it's the first lesson, or if previous lesson is completed
			const unlocked = index === 0 || (index > 0 && progress[sortedLessons[index - 1].id] === true)
			
			return {
				...lesson,
				completed,
				unlocked
			}
		})
	}

	async reorderLessons(lessonIds: string[]): Promise<boolean> {
		try {
			const lessons = await this.loadLessons()
			const lessonMap = new Map(lessons.map(l => [l.id, l]))
			
			// Reorder based on provided IDs
			const reorderedLessons = lessonIds
				.map(id => lessonMap.get(id))
				.filter((lesson): lesson is Lesson => lesson !== undefined)
			
			// Renumber sequential IDs and auto-generate titles
			const renumberedLessons = reorderedLessons.map((lesson, index) => ({
				...lesson,
				id: `lesson-${index + 1}`,
				title: `Lesson ${index + 1}`, // Auto-generate title based on position
				subtitle: lesson.subtitle || '', // Preserve subtitle
				topic: (lesson as any).topic || '' // Preserve topic
			}))
			
			await this.saveLessons(renumberedLessons)
			return true
		} catch (error) {
			console.error('Error reordering lessons:', error)
			return false
		}
	}
}

// Export singleton instance (can be swapped for database implementation later)
export const lessonsService: LessonsService = new LocalLessonsService()

/**
 * Convenience functions that delegate to the service
 * These maintain backward compatibility while allowing future migration
 */
export async function loadLessons(): Promise<Lesson[]> {
	return lessonsService.loadLessons()
}

export async function saveLessons(lessons: Lesson[]): Promise<void> {
	return lessonsService.saveLessons(lessons)
}

export async function updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<boolean> {
	return lessonsService.updateLesson(lessonId, updates)
}

export async function addLesson(lesson: Omit<Lesson, 'id'>): Promise<Lesson> {
	return lessonsService.addLesson(lesson)
}

export async function deleteLesson(lessonId: string): Promise<boolean> {
	return lessonsService.deleteLesson(lessonId)
}

export async function getLessonsWithProgress(): Promise<Lesson[]> {
	return lessonsService.getLessonsWithProgress()
}

/**
 * Get completed lesson count
 */
export function getCompletedLessonCount(): number {
	const progress = loadLessonProgress()
	return Object.values(progress).filter(Boolean).length
}

export async function reorderLessons(lessonIds: string[]): Promise<boolean> {
	return lessonsService.reorderLessons(lessonIds)
}

