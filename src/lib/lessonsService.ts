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
 */
async function syncLocalLessonsToSupabase(): Promise<number> {
	if (!isSupabaseConfigured()) return 0
	
	try {
		const supabase = getSupabaseClient()
		if (!supabase) return 0
		
		const { data: { session } } = await supabase.auth.getSession()
		if (!session?.user?.id) return 0
		
		// Get all local lessons
		const localLessons = localLoadLessons()
		if (localLessons.length === 0) return 0
		
		// Get existing Supabase lessons (by custom_id to avoid duplicates)
		const { data: existingData } = await supabase
			.from('lessons')
			.select('custom_id, composition_id')
			.eq('created_by', session.user.id)
		
		const existingCustomIds = new Set((existingData || []).map(l => l.custom_id).filter(Boolean))
		
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
						created_by: session.user.id,
						composition_id: local.compositionId || null,
						lesson_number: lessonNumber,
						title: local.title,
						description: local.description || null,
						difficulty: local.category, // Map category to difficulty
						category: (local as any).topic || null, // Map topic to category field
						subtitle: local.subtitle || null,
						topic: (local as any).topic || null,
						custom_id: local.id // Store the custom ID like "lesson-1"
					})
				
				if (!error) {
					syncedCount++
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
				
				const user = getCurrentUser()
				if (!user) return localLoadLessons() // Not logged in, use local
				
				const { data: { session } } = await supabase.auth.getSession()
				if (!session?.user?.id) return localLoadLessons()
				
				// Sync local lessons to Supabase (only once per session)
				const syncKey = `lesson-sync-${session.user.id}`
				if (!sessionStorage.getItem(syncKey)) {
					const synced = await syncLocalLessonsToSupabase()
					sessionStorage.setItem(syncKey, 'true')
					if (synced > 0) {
						console.log(`[lessonsService] Synced ${synced} lessons to Supabase`)
					}
				}
				
				// Load from Supabase
				const { data, error } = await supabase
					.from('lessons')
					.select('*')
					.eq('created_by', session.user.id)
					.order('lesson_number', { ascending: true })
				
				if (error) {
					console.warn('[lessonsService] Supabase error, falling back to localStorage:', error)
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
						description: item.description || '',
						category: (item.difficulty || 'beginner') as 'beginner' | 'intermediate' | 'advanced',
						compositionId: item.composition_id,
						unlocked: false, // Will be calculated
						completed: false // Will be loaded from progress
					} as Lesson
				})
				
				// Also load local lessons as backup/merge
				const localLessons = localLoadLessons()
				const supabaseCustomIds = new Set(supabaseLessons.map(l => l.id))
				
				// Merge: use Supabase as primary, but include any local that don't exist in Supabase
				const localOnly = localLessons.filter(l => !supabaseCustomIds.has(l.id))
				
				if (localOnly.length > 0) {
					console.log(`[lessonsService] Found ${localOnly.length} local lessons not in Supabase, merging...`)
					// Try to sync these again
					for (const local of localOnly) {
						try {
							const match = local.id.match(/lesson-(\d+)/)
							const lessonNumber = match ? parseInt(match[1], 10) : 999
							
							const { error: insertError } = await supabase
								.from('lessons')
								.insert({
									created_by: session.user.id,
									composition_id: local.compositionId || null,
									lesson_number: lessonNumber,
									title: local.title,
									description: local.description || null,
									difficulty: local.category,
									category: (local as any).topic || null,
									subtitle: local.subtitle || null,
									topic: (local as any).topic || null,
									custom_id: local.id
								})
							if (!insertError) {
								console.log(`[lessonsService] Synced "${local.title}" to Supabase`)
							}
						} catch (err) {
							console.warn(`[lessonsService] Failed to sync "${local.title}":`, err)
						}
					}
					// Reload from Supabase after sync
					const { data: reloadData } = await supabase
						.from('lessons')
						.select('*')
						.eq('created_by', session.user.id)
						.order('lesson_number', { ascending: true })
					
					if (reloadData) {
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
				
				return supabaseLessons
			} catch (error) {
				console.error('[lessonsService] Error loading from Supabase:', error)
				return localLoadLessons()
			}
		}
		
		return localLoadLessons()
	}

	async saveLessons(lessons: Lesson[]): Promise<void> {
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
				
				// Delete all existing lessons for this user, then insert new ones
				// This is simpler than trying to match and update individually
				await supabase
					.from('lessons')
					.delete()
					.eq('created_by', session.user.id)
				
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
				
				// Update in Supabase using custom_id
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
					.eq('custom_id', lessonId)
					.eq('created_by', session.user.id)
				
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
				
				// Extract lesson number from id like "lesson-1" -> 1
				const match = localLesson.id.match(/lesson-(\d+)/)
				const lessonNumber = match ? parseInt(match[1], 10) : 1
				
				const { error } = await supabase
					.from('lessons')
					.insert({
						created_by: session.user.id,
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
				
				// Delete from Supabase using custom_id
				const { error } = await supabase
					.from('lessons')
					.delete()
					.eq('custom_id', lessonId)
					.eq('created_by', session.user.id)
				
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
		// Load lessons (from Supabase if available)
		let lessons = await this.loadLessons()
		
		// Extra safety: filter out any dummy lessons that might still exist
		lessons = lessons.filter(lesson => lesson.compositionId !== null)
		
		// Add progress and unlock status (progress is still stored in localStorage)
		const progress = loadLessonProgress()
		
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

