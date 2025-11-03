/**
 * Lessons Service
 * 
 * Abstraction layer for lesson management.
 * Currently uses localStorage, will migrate to database later.
 * 
 * This service provides a consistent interface that can be swapped
 * for database-backed storage without changing consuming code.
 */

import type { Lesson } from './lessonsData'
export type { Lesson }
import { 
	loadLessons as localLoadLessons,
	saveLessons as localSaveLessons,
	updateLesson as localUpdateLesson,
	addLesson as localAddLesson,
	deleteLesson as localDeleteLesson,
	getLessonsWithProgress as localGetLessonsWithProgress
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
 * LocalStorage implementation (current)
 */
class LocalLessonsService implements LessonsService {
	async loadLessons(): Promise<Lesson[]> {
		return localLoadLessons()
	}

	async saveLessons(lessons: Lesson[]): Promise<void> {
		localSaveLessons(lessons)
	}

	async updateLesson(lessonId: string, updates: Partial<Lesson>): Promise<boolean> {
		return localUpdateLesson(lessonId, updates)
	}

	async addLesson(lesson: Omit<Lesson, 'id'>): Promise<Lesson> {
		return localAddLesson(lesson)
	}

	async deleteLesson(lessonId: string): Promise<boolean> {
		return localDeleteLesson(lessonId)
	}

	async getLessonsWithProgress(): Promise<Lesson[]> {
		return localGetLessonsWithProgress()
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
				subtitle: lesson.subtitle || '' // Preserve subtitle
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

