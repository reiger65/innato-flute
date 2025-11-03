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
	addLesson as localAddLesson,
	deleteLesson as localDeleteLesson
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
		for (const local of localLessons) {
			if (existingCustomIds.has(local.id)) {
				continue // Already exists
			}
			
			// Extract lesson number from id like "lesson-1" -> 1
			const match = local.id.match(/lesson-(\d+)/)
			const lessonNumber = match ? parseInt(match[1], 10) : localLessons.indexOf(local) + 1
			
			try {
				const { error } = await supabase
					.from('lessons')
					.insert({
						created_by: session.user.id, // Admin who created it
						composition_id: local.compositionId || null,
						lesson_number: lessonNumber,
						title: local.title,
						description: local.description || null, // Make sure description is synced
						difficulty: local.category, // Map category to difficulty
						category: (local as any).topic || null, // Map topic to category field
						subtitle: local.subtitle || null, // Make sure subtitle is synced
						topic: (local as any).topic || null, // Make sure topic is synced
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
				const { data, error } = await supabase
					.from('lessons')
					.select('*')
					.order('lesson_number', { ascending: true })
				
				if (error) {
					console.warn('[lessonsService] Supabase error loading lessons, falling back to localStorage:', error)
					return localLoadLessons()
				}
				
				// Transform Supabase data to Lesson format
				const supabaseLessons = (data || []).map(item => {
					// Extract lesson number from custom_id or lesson_number
					const customId = item.custom_id || `lesson-${item.lesson_number}`
					
					return {
						id: customId,
						title: item.title,
						subtitle: item.subtitle || '',
						topic: item.topic || item.category || '', // Use topic field, fallback to category
						description: item.description || '', // Preserve description
						category: (item.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
						compositionId: item.composition_id,
						unlocked: false, // Will be calculated
						completed: false // Will be loaded from progress
					} as Lesson
				})
				
				// If admin is logged in and Supabase has lessons, check if local lessons need syncing
				const user = getCurrentUser()
				if (user) {
					const { isAdmin } = await import('./authService')
					if (isAdmin(user) && supabaseLessons.length > 0) {
						// Check if there are local lessons not in Supabase
						const localLessons = localLoadLessons()
						const supabaseCustomIds = new Set(supabaseLessons.map(l => l.id))
						const localOnly = localLessons.filter(l => !supabaseCustomIds.has(l.id))
						
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
											return (reloadData || []).map(item => {
												const customId = item.custom_id || `lesson-${item.lesson_number}`
												return {
													id: customId,
													title: item.title,
													subtitle: item.subtitle || '',
													topic: item.topic || item.category || '',
													description: item.description || '',
													category: (item.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
													compositionId: item.composition_id,
													unlocked: false,
													completed: false
												} as Lesson
											})
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
				const localLessons = localLoadLessons()
				console.log(`[lessonsService] Supabase empty, loaded ${localLessons.length} lessons from localStorage`)
				return localLessons
			} catch (error) {
				console.error('[lessonsService] Error loading from Supabase:', error)
				// Always fallback to localStorage on error
				return localLoadLessons()
			}
		}
		
		return localLoadLessons()
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
						difficulty: lesson.category,
						category: (lesson as any).topic || null,
						subtitle: lesson.subtitle || null,
						topic: (lesson as any).topic || null,
						custom_id: lesson.id
					}
				})
				
				if (insertData.length > 0) {
					const { error } = await supabase
						.from('lessons')
						.insert(insertData)
					
					if (error) {
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
				if (updates.subtitle !== undefined) updateData.subtitle = updates.subtitle
				if ((updates as any).topic !== undefined) {
					updateData.topic = (updates as any).topic
					updateData.category = (updates as any).topic // Also update category field
				}
				if (updates.description !== undefined) updateData.description = updates.description
				if (updates.category !== undefined) updateData.difficulty = updates.category
				if (updates.compositionId !== undefined) updateData.composition_id = updates.compositionId
				
				// If title changed, update lesson_number based on new position
				if (updates.title) {
					const match = updates.title.match(/Lesson (\d+)/)
					if (match) {
						updateData.lesson_number = parseInt(match[1], 10)
					}
				}
				
				const { error } = await supabase
					.from('lessons')
					.update(updateData)
					.eq('custom_id', lessonId) // Lessons are global, no user filter
				
				if (error) {
					console.warn('[lessonsService] Supabase error updating lesson, using local result:', error)
				}
			} catch (error) {
				console.error('[lessonsService] Error updating lesson in Supabase:', error)
			}
		}
		
		return localResult
	}

	async addLesson(lesson: Omit<Lesson, 'id'>): Promise<Lesson> {
		// Only admins can add lessons (lessons are global)
		// Add to local first
		const localLesson = localAddLesson(lesson)
		
		if (isSupabaseConfigured()) {
			try {
				const supabase = getSupabaseClient()
				if (!supabase) return localLesson
				
				const user = getCurrentUser()
				if (!user) return localLesson
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) return localLesson
				
				// Admin check - only admins can add global lessons
				const { isAdmin } = await import('./authService')
				if (!isAdmin(user)) {
					console.warn('[lessonsService] Non-admin user attempted to add lesson')
					return localLesson
				}
				
				// Extract lesson number from id like "lesson-1" -> 1
				const match = localLesson.id.match(/lesson-(\d+)/)
				const lessonNumber = match ? parseInt(match[1], 10) : 1
				
				const { error } = await supabase
					.from('lessons')
					.insert({
						created_by: session.user.id, // Admin who created it
						composition_id: lesson.compositionId || null,
						lesson_number: lessonNumber,
						title: localLesson.title,
						description: lesson.description || null,
						difficulty: lesson.category,
						category: (lesson as any).topic || null,
						subtitle: lesson.subtitle || null,
						topic: (lesson as any).topic || null,
						custom_id: localLesson.id
					})
				
				if (error) {
					console.warn('[lessonsService] Supabase error adding lesson, using local result:', error)
				}
			} catch (error) {
				console.error('[lessonsService] Error adding lesson to Supabase:', error)
			}
		}
		
		return localLesson
	}

	async deleteLesson(lessonId: string): Promise<boolean> {
		// Only admins can delete lessons (lessons are global)
		// Delete from local first
		const localResult = localDeleteLesson(lessonId)
		
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
				const { error } = await supabase
					.from('lessons')
					.delete()
					.eq('custom_id', lessonId)
				
				if (error) {
					console.warn('[lessonsService] Supabase error deleting lesson, using local result:', error)
				}
			} catch (error) {
				console.error('[lessonsService] Error deleting lesson from Supabase:', error)
			}
		}
		
		return localResult
	}

	async getLessonsWithProgress(): Promise<Lesson[]> {
		// Load lessons (from Supabase if available - global, no auth required)
		let lessons = await this.loadLessons()
		
		// Extra safety: filter out any dummy lessons that might still exist
		lessons = lessons.filter(lesson => lesson.compositionId !== null)
		
		// Load progress (user-specific, requires auth, falls back to localStorage)
		const { loadLessonProgress } = await import('./lessonProgressService')
		const progress = await loadLessonProgress()
		
		// Sort lessons by their lesson number
		const sortedLessons = [...lessons].sort((a, b) => {
			const getLessonNumber = (id: string): number => {
				const match = id.match(/lesson-(\d+)/)
				return match ? parseInt(match[1], 10) : Infinity
			}
			return getLessonNumber(a.id) - getLessonNumber(b.id)
		})
		
		// Update all lesson titles to match their position, then save
		const updatedLessons = sortedLessons.map((lesson, index) => ({
			...lesson,
			title: `Lesson ${index + 1}`, // Auto-generate title based on position
			subtitle: lesson.subtitle || '',
			topic: (lesson as any).topic || ''
		}))
		
		// Save updated titles if any changed (this will sync to Supabase via saveLessons)
		const titlesChanged = sortedLessons.some((lesson, index) => lesson.title !== `Lesson ${index + 1}`)
		if (titlesChanged) {
			await this.saveLessons(updatedLessons)
		}
		
		return updatedLessons.map((lesson, index) => {
			const completed = progress[lesson.id] === true
			// Unlock if it's the first lesson, or if previous lesson is completed
			const unlocked = index === 0 || (index > 0 && progress[updatedLessons[index - 1].id] === true)
			
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

export async function reorderLessons(lessonIds: string[]): Promise<boolean> {
	return lessonsService.reorderLessons(lessonIds)
}

