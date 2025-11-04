/**
 * Lesson Progress Service
 * 
 * Manages user progress for lessons in Supabase + localStorage fallback.
 * Progress is user-specific and requires authentication.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { getCurrentUser } from './authService'
import { loadLessonProgress as localLoadProgress, saveLessonProgress as localSaveProgress } from './lessonsData'

/**
 * Load lesson progress for current user
 * Returns a map of lessonId -> completed (boolean)
 */
export async function loadLessonProgress(): Promise<Record<string, boolean>> {
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return localLoadProgress()
			
			const user = getCurrentUser()
			if (!user) return localLoadProgress() // Not logged in, use local
			
			const { data: { session } } = await supabase.auth.getSession()
			if (!session?.user?.id) return localLoadProgress()
			
			// Load progress from Supabase
			// We need to join with lessons to get custom_id, since user_progress uses UUID lesson_id
			const { data, error } = await supabase
				.from('user_progress')
				.select(`
					lesson_id,
					lessons!inner(custom_id)
				`)
				.eq('user_id', session.user.id)
			
			if (error) {
				// If custom_id column doesn't exist (error code 42703 or PGRST204), silently fall back to localStorage
				// This happens when the migration hasn't been run yet
				if ((error.code === '42703' || error.code === 'PGRST204') && 
				    (error.message?.includes('custom_id') || error.message?.includes('Could not find'))) {
					return localLoadProgress()
				}
				console.warn('[lessonProgressService] Supabase error, falling back to localStorage:', error)
				return localLoadProgress()
			}
			
			// Transform to Record<string, boolean> using custom_id
			const progress: Record<string, boolean> = {}
			if (data) {
				for (const item of data) {
					const lesson = (item as any).lessons
					if (lesson?.custom_id) {
						progress[lesson.custom_id] = true
					}
				}
			}
			
			// Merge with local progress (for lessons not yet synced)
			const localProgress = localLoadProgress()
			for (const [lessonId, completed] of Object.entries(localProgress)) {
				if (!progress[lessonId] && completed) {
					progress[lessonId] = completed
					// Try to sync this to Supabase
					await saveLessonProgress(lessonId, completed)
				}
			}
			
			return progress
		} catch (error) {
			console.error('[lessonProgressService] Error loading progress from Supabase:', error)
			return localLoadProgress()
		}
	}
	
	return localLoadProgress()
}

/**
 * Save lesson progress for current user
 */
export async function saveLessonProgress(lessonId: string, completed: boolean): Promise<void> {
	// Always save to localStorage first (as backup)
	localSaveProgress(lessonId, completed)
	
	if (isSupabaseConfigured()) {
		try {
			const supabase = getSupabaseClient()
			if (!supabase) return
			
			const user = getCurrentUser()
			if (!user) return // Not logged in, only save locally
			
			const { data: { session } = {} } = await supabase.auth.getSession()
			if (!session?.user?.id) return
			
			// Find the lesson UUID by custom_id
			const { data: lessonData, error: lessonError } = await supabase
				.from('lessons')
				.select('id')
				.eq('custom_id', lessonId)
				.single()
			
			if (lessonError || !lessonData) {
				// If custom_id column doesn't exist (error code 42703 or PGRST204), silently skip Supabase save
				// This happens when the migration hasn't been run yet
				if ((lessonError?.code === '42703' || lessonError?.code === 'PGRST204') && 
				    (lessonError.message?.includes('custom_id') || lessonError.message?.includes('Could not find'))) {
					return
				}
				console.warn(`[lessonProgressService] Could not find lesson ${lessonId} in Supabase:`, lessonError)
				return
			}
			
			if (completed) {
				// Upsert progress (insert or update)
				const { error } = await supabase
					.from('user_progress')
					.upsert({
						user_id: session.user.id,
						lesson_id: lessonData.id,
						completed_at: new Date().toISOString(),
						progress_data: { completed: true }
					}, {
						onConflict: 'user_id,lesson_id'
					})
				
				if (error) {
					console.warn('[lessonProgressService] Supabase error saving progress:', error)
				}
			} else {
				// Delete progress if marking as incomplete
				const { error } = await supabase
					.from('user_progress')
					.delete()
					.eq('user_id', session.user.id)
					.eq('lesson_id', lessonData.id)
				
				if (error) {
					console.warn('[lessonProgressService] Supabase error deleting progress:', error)
				}
			}
		} catch (error) {
			console.error('[lessonProgressService] Error saving progress to Supabase:', error)
		}
	}
}

