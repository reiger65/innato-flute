/**
 * Lessons Data
 * 
 * Defines the lesson structure and data for the INNATO flute learning journey.
 * Lessons are stored in localStorage and can be manually managed.
 */

import { loadCompositions } from './compositionService'

export interface Lesson {
	id: string
	title: string
	description: string
	category: 'beginner' | 'intermediate' | 'advanced'
	compositionId: string | null // ID of the saved composition to use for this lesson
	unlocked: boolean // Whether this lesson is unlocked (not persisted - calculated from progress)
	completed: boolean // Whether this lesson has been completed (not persisted - loaded from progress)
}

const STORAGE_KEY = 'innato-lessons'

/**
 * Load lessons from localStorage
 * Does NOT initialize with default lessons - lessons come from compositions
 * @deprecated Use lessonsService.loadLessons() for future-proof code
 */
export function loadLessons(): Lesson[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY)
		if (data) {
			const lessons = JSON.parse(data)
			// Force migration by checking and fixing IDs
			const needsMigration = lessons.some((lesson: Lesson) => {
				const match = lesson.id.match(/^lesson-(\d+)$/)
				if (match) {
					const num = parseInt(match[1], 10)
					return num > 1000000
				}
				return false
			})
			if (needsMigration) {
				// Trigger migration immediately
				return lessons
			}
			return lessons
		}
		// If no lessons stored, return empty array - lessons will be created from compositions
		return []
	} catch (error) {
		console.error('Error loading lessons:', error)
		return []
	}
}

/**
 * Save lessons to localStorage
 * Only call this manually when you want to update lessons
 * @deprecated Use lessonsService.saveLessons() for future-proof code
 */
export function saveLessons(lessons: Lesson[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons))
	} catch (error) {
		console.error('Error saving lessons:', error)
	}
}

/**
 * Update a single lesson
 */
export function updateLesson(lessonId: string, updates: Partial<Lesson>): boolean {
	try {
		const lessons = loadLessons()
		const index = lessons.findIndex(l => l.id === lessonId)
		
		if (index === -1) return false
		
		lessons[index] = {
			...lessons[index],
			...updates,
			id: lessonId // Ensure ID doesn't change
		}
		
		saveLessons(lessons)
		return true
	} catch (error) {
		console.error('Error updating lesson:', error)
		return false
	}
}

/**
 * Add a new lesson
 */
export function addLesson(lesson: Omit<Lesson, 'id'>): Lesson {
	const lessons = loadLessons()
	
	// Find the highest lesson number to assign the next sequential ID
	const getLessonNumber = (id: string): number => {
		const match = id.match(/lesson-(\d+)/)
		return match ? parseInt(match[1], 10) : 0
	}
	
	const maxLessonNumber = lessons.reduce((max, l) => {
		const num = getLessonNumber(l.id)
		return num > max ? num : max
	}, 0)
	
	const nextLessonNumber = maxLessonNumber + 1
	const newLesson: Lesson = {
		...lesson,
		id: `lesson-${nextLessonNumber}`
	}
	lessons.push(newLesson)
	saveLessons(lessons)
	return newLesson
}

/**
 * Delete a lesson
 */
export function deleteLesson(lessonId: string): boolean {
	try {
		const lessons = loadLessons()
		const filtered = lessons.filter(l => l.id !== lessonId)
		saveLessons(filtered)
		return filtered.length < lessons.length
	} catch (error) {
		console.error('Error deleting lesson:', error)
		return false
	}
}

// Export lessons (will be loaded from localStorage or use defaults)
export const lessons: Lesson[] = loadLessons()

/**
 * Load lesson progress from localStorage
 */
export function loadLessonProgress(): Record<string, boolean> {
	try {
		const data = localStorage.getItem('innato-lesson-progress')
		return data ? JSON.parse(data) : {}
	} catch (error) {
		console.error('Error loading lesson progress:', error)
		return {}
	}
}

/**
 * Save lesson progress to localStorage
 */
export function saveLessonProgress(lessonId: string, completed: boolean): void {
	try {
		const progress = loadLessonProgress()
		progress[lessonId] = completed
		localStorage.setItem('innato-lesson-progress', JSON.stringify(progress))
	} catch (error) {
		console.error('Error saving lesson progress:', error)
	}
}

/**
 * Migrate old timestamp-based lesson IDs to sequential numbers
 */
function migrateLessonIds(): void {
	let lessons = loadLessons()
	if (lessons.length === 0) {
		return
	}
	
	let needsMigration = false
	
	// Check if any lessons have timestamp-based IDs (long numbers > 1000)
	// Also check if they're not already sequentially numbered
	const hasOldIds = lessons.some((lesson, index) => {
		const match = lesson.id.match(/^lesson-(\d+)$/)
		if (match) {
			const num = parseInt(match[1], 10)
			const expectedNum = index + 1
			// If the number doesn't match the expected sequential number, it needs migration
			// Or if it's a timestamp (very large number > 1000)
			return num !== expectedNum || num > 1000
		}
		// If ID doesn't match pattern, needs migration
		return true
	})
	
	if (!hasOldIds) {
		return // No migration needed
	}
	
	// Migrate: renumber all lessons sequentially
	const progress = loadLessonProgress()
	const oldIdToNewId: Record<string, string> = {}
	
	// Sort lessons first to ensure consistent ordering
	lessons.sort((a, b) => {
		// Try to extract numbers from IDs for sorting
		const getNum = (id: string): number => {
			const match = id.match(/lesson-(\d+)/)
			return match ? parseInt(match[1], 10) : 0
		}
		return getNum(a.id) - getNum(b.id)
	})
	
	lessons = lessons.map((lesson, index) => {
		const newId = `lesson-${index + 1}`
		if (lesson.id !== newId) {
			needsMigration = true
			oldIdToNewId[lesson.id] = newId
		}
		return {
			...lesson,
			id: newId
		}
	})
	
	// Migrate progress data if needed
	if (needsMigration && Object.keys(oldIdToNewId).length > 0) {
		const newProgress: Record<string, boolean> = {}
		Object.keys(progress).forEach(oldId => {
			const newId = oldIdToNewId[oldId] || oldId
			newProgress[newId] = progress[oldId]
		})
		localStorage.setItem('innato-lesson-progress', JSON.stringify(newProgress))
	}
	
	if (needsMigration) {
		saveLessons(lessons)
	}
}

/**
 * Get lessons with updated progress and unlock status
 * Loads lessons from localStorage and adds progress/unlock status
 * Sorts lessons by their sequential number
 * Automatically migrates old timestamp-based IDs to sequential numbers
 */
export function getLessonsWithProgress(): Lesson[] {
	// Migrate old IDs first
	migrateLessonIds()
	
	// Auto-assign compositions to lessons - this ensures lessons are created from compositions
	// This will also remove dummy lessons (those without compositionId)
	// Note: This is called asynchronously from App.tsx, but here we just load existing lessons
	// The assignment happens in App.tsx when switching to lessons view
	
	const progress = loadLessonProgress()
	let lessons = loadLessons() // Load lessons from localStorage
	
	// Extra safety: filter out any dummy lessons that might still exist
	lessons = lessons.filter(lesson => lesson.compositionId !== null)
	
	// Sort lessons by their lesson number (extract number from ID like "lesson-1" -> 1)
	lessons.sort((a, b) => {
		const getLessonNumber = (id: string): number => {
			const match = id.match(/lesson-(\d+)/)
			return match ? parseInt(match[1], 10) : Infinity
		}
		return getLessonNumber(a.id) - getLessonNumber(b.id)
	})
	
	return lessons.map((lesson, index) => {
		const completed = progress[lesson.id] === true
		// Unlock if it's the first lesson, or if previous lesson is completed
		const unlocked = index === 0 || (index > 0 && progress[lessons[index - 1].id] === true)
		
		return {
			...lesson,
			completed,
			unlocked
		}
	})
}

/**
 * Get completed lesson count
 */
export function getCompletedLessonCount(): number {
	const progress = loadLessonProgress()
	return Object.values(progress).filter(v => v === true).length
}

/**
 * Auto-assign compositions to lessons
 * This will assign available compositions to lessons that don't have one yet
 * and update lesson titles from composition names
 * Also creates new lessons for extra compositions
 * If no lessons exist, creates lessons from all compositions
 */
export async function assignCompositionsToLessons(): Promise<void> {
	const compositions = await loadCompositions()
	const progress = loadLessonProgress()
	
	console.log('[assignCompositionsToLessons] Found compositions:', compositions.length, compositions.map(c => c.name))
	
	// Load existing lessons to preserve progress
	const existingLessons = loadLessons()
	const existingLessonsByCompositionId = new Map<string, Lesson>()
	
	console.log('[assignCompositionsToLessons] Existing lessons:', existingLessons.length)
	
	// Build a map of existing lessons by compositionId, filtering out dummy lessons (those without compositionId)
	existingLessons
		.filter(lesson => lesson.compositionId !== null)
		.forEach(lesson => {
			if (lesson.compositionId) {
				existingLessonsByCompositionId.set(lesson.compositionId, lesson)
			}
		})
	
	// If we have compositions, create lessons from ALL compositions
	if (compositions.length > 0) {
		// Create lessons from ALL compositions, preserving progress for existing ones
		const lessons = compositions.map((composition, index) => {
			const existingLesson = existingLessonsByCompositionId.get(composition.id)
			
			if (existingLesson) {
				// Update title if composition name changed, preserve progress and ID
				const wasCompleted = progress[existingLesson.id] === true
				return {
					...existingLesson,
					title: composition.name,
					completed: wasCompleted
				}
			}
			
			// Create new lesson for this composition
			const lessonId = `lesson-${index + 1}`
			const wasCompleted = progress[lessonId] === true
			const isUnlocked = index === 0 || (index > 0 && progress[`lesson-${index}`] === true)
			
			return {
				id: lessonId,
				title: composition.name,
				description: 'Practice this composition',
				category: 'beginner' as const,
				compositionId: composition.id,
				unlocked: Boolean(isUnlocked),
				completed: wasCompleted
			}
		})
		
		console.log('[assignCompositionsToLessons] Created lessons:', lessons.length, lessons.map(l => l.title))
		
		// Save lessons - this will replace all lessons including dummy ones
		saveLessons(lessons)
	} else {
		console.log('[assignCompositionsToLessons] No compositions found, clearing all lessons')
		// No compositions, remove all lessons (including dummy ones)
		saveLessons([])
	}
}


