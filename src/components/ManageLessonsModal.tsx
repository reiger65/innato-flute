import { useState, useEffect } from 'react'
import { loadLessons, updateLesson, deleteLesson, reorderLessons, syncLocalLessonsToSupabase, type Lesson } from '../lib/lessonsService'
import { getCurrentUser, isAdmin } from '../lib/authService'
import { loadLessons as localLoadLessons } from '../lib/lessonsData'
import { getSupabaseClient } from '../lib/supabaseClient'
import { loadCategories, addCategory } from '../lib/categoriesService'

interface ManageLessonsModalProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
	onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void
}

export function ManageLessonsModal({ isOpen, onClose, onSuccess, onShowToast }: ManageLessonsModalProps) {
	const [lessons, setLessons] = useState<Lesson[]>([])
	const [loading, setLoading] = useState(false)
	const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
	const [editTitle, setEditTitle] = useState('')
	const [editSubtitle, setEditSubtitle] = useState('')
	const [editTopic, setEditTopic] = useState('')
	const [showCustomTopicInput, setShowCustomTopicInput] = useState(false)
	const [customTopic, setCustomTopic] = useState('')
	const [categorySuggestions, setCategorySuggestions] = useState<string[]>([])
	const [editDescription, setEditDescription] = useState('')
	const [editCategory, setEditCategory] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
	const currentUser = getCurrentUser()

	useEffect(() => {
		if (isOpen) {
			loadLessonsData()
			
			// Load category suggestions and initialize defaults if empty
			let suggestions = loadCategories()
			if (suggestions.length === 0) {
				const defaults = ['Introduction', 'Progressions', 'Melodies', 'Compositions']
				defaults.forEach(cat => addCategory(cat))
				suggestions = defaults
			}
			setCategorySuggestions(suggestions)
		}
	}, [isOpen])

	// Handle Escape key to close modal
	useEffect(() => {
		if (!isOpen) return

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose()
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isOpen, onClose])

	const loadLessonsData = async () => {
		setLoading(true)
		try {
			// If admin is logged in, sync local lessons to Supabase first
			const currentUser = getCurrentUser()
			if (currentUser && isAdmin(currentUser)) {
				// Always try to sync (don't use sessionStorage check here - we want to sync every time modal opens)
				try {
					const synced = await syncLocalLessonsToSupabase()
					if (synced > 0) {
						console.log(`[ManageLessonsModal] Synced ${synced} local lessons to Supabase`)
						onShowToast?.(`Synced ${synced} local lesson(s) to Supabase`, 'success')
						// Wait a bit for Supabase to update, then reload
						await new Promise(resolve => setTimeout(resolve, 500))
					}
				} catch (error) {
					console.error('Error syncing lessons:', error)
					onShowToast?.('Error syncing lessons to Supabase. Check console for details.', 'error')
				}
			}
			
			const loadedLessons = await loadLessons()
			console.log(`[ManageLessonsModal] Loaded ${loadedLessons.length} lessons:`, loadedLessons.map(l => ({ id: l.id, title: l.title, hasComposition: !!l.compositionId })))
			
			// Deduplicate lessons by ID (keep first occurrence)
			const uniqueLessons = loadedLessons.filter((lesson, index, self) => 
				index === self.findIndex(l => l.id === lesson.id)
			)
			if (uniqueLessons.length !== loadedLessons.length) {
				console.log(`[ManageLessonsModal] Removed ${loadedLessons.length - uniqueLessons.length} duplicate lesson(s)`)
			}
			
			// Only filter dummy lessons if they're from localStorage, not from Supabase
			// Supabase lessons should all be shown (they're already validated)
			const validLessons = uniqueLessons.filter(lesson => lesson.compositionId !== null)
			if (validLessons.length !== uniqueLessons.length) {
				console.log(`[ManageLessonsModal] Filtered out ${uniqueLessons.length - validLessons.length} dummy lessons (no compositionId)`)
			}
			
			// Sort lessons by lesson number (lesson-1, lesson-2, etc.) so newest is last
			const getLessonNumber = (id: string): number => {
				const match = id.match(/lesson-(\d+)/)
				return match ? parseInt(match[1], 10) : 0
			}
			const sortedLessons = [...validLessons].sort((a, b) => {
				return getLessonNumber(a.id) - getLessonNumber(b.id)
			})
			setLessons(sortedLessons)
		} catch (error) {
			console.error('Error loading lessons:', error)
			onShowToast?.('Failed to load lessons. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleEdit = (lesson: Lesson) => {
		setEditingLesson(lesson)
		setEditTitle(lesson.title)
		setEditSubtitle(lesson.subtitle || '')
		setEditTopic((lesson as any).topic || '')
		setShowCustomTopicInput(false)
		setCustomTopic('')
		setEditDescription(lesson.description)
		setEditCategory(lesson.category)
	}

	const handleSaveEdit = async () => {
		if (!editingLesson) return

		// Use custom topic if "Add new..." was selected, otherwise use selected topic
		const finalTopic = showCustomTopicInput ? customTopic.trim() : editTopic.trim()

		setLoading(true)
		try {
			// Title is auto-generated based on position, so we don't update it
			// Find the current index of this lesson to generate the correct title
			const currentIndex = lessons.findIndex(l => l.id === editingLesson.id)
			const autoTitle = `Lesson ${currentIndex + 1}`
			
			await updateLesson(editingLesson.id, {
				title: autoTitle, // Always use auto-generated title
				subtitle: editSubtitle.trim(),
				topic: finalTopic,
				description: editDescription.trim(),
				category: editCategory
			})
			
			// Persist new category if provided
			if (finalTopic) {
				addCategory(finalTopic)
			}
			
			await loadLessonsData()
			setEditingLesson(null)
			onSuccess()
		} catch (error) {
			console.error('Error updating lesson:', error)
			onShowToast?.('Failed to update lesson. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleCancelEdit = () => {
		setEditingLesson(null)
		setEditTitle('')
		setEditSubtitle('')
		setEditTopic('')
		setShowCustomTopicInput(false)
		setCustomTopic('')
		setEditDescription('')
		setEditCategory('beginner')
	}

	const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const value = e.target.value
		if (value === '__add_new__') {
			setShowCustomTopicInput(true)
			setEditTopic('')
		} else {
			setShowCustomTopicInput(false)
			setEditTopic(value)
			setCustomTopic('')
		}
	}

	const handleDelete = async (lessonId: string, lessonTitle: string) => {
		if (!window.confirm(`Delete lesson "${lessonTitle}"? This action cannot be undone.`)) {
			return
		}

		setLoading(true)
		try {
			await deleteLesson(lessonId)
			await loadLessonsData()
			onSuccess()
			onShowToast?.(`Lesson "${lessonTitle}" deleted successfully.`, 'success')
		} catch (error) {
			console.error('Error deleting lesson:', error)
			onShowToast?.('Failed to delete lesson. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteAllLessons = async () => {
		if (!window.confirm(`⚠️ WARNING: Delete ALL ${lessons.length} lesson(s)? This action cannot be undone!\n\nAfter deletion, you can re-add lessons from the Composer with correct fields.`)) {
			return
		}

		setLoading(true)
		try {
			// Delete all lessons one by one
			for (const lesson of lessons) {
				await deleteLesson(lesson.id)
			}
			
			// Clear the deleted IDs list since all lessons are gone
			localStorage.removeItem('deleted-lesson-ids')
			
			await loadLessonsData()
			onSuccess()
			onShowToast?.(`Deleted all ${lessons.length} lesson(s). You can now re-add them from the Composer.`, 'success')
		} catch (error) {
			console.error('Error deleting all lessons:', error)
			onShowToast?.('Failed to delete all lessons. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleCleanupDummyLessons = async () => {
		const dummyCount = lessons.filter(l => !l.compositionId).length
		if (dummyCount === 0) {
			onShowToast?.('No dummy lessons to clean up.', 'info')
			return
		}
		
		if (!window.confirm(`Delete ${dummyCount} dummy lesson(s) without compositions? This action cannot be undone.`)) {
			return
		}

		setLoading(true)
		try {
			// Delete all dummy lessons
			for (const lesson of lessons) {
				if (!lesson.compositionId) {
					await deleteLesson(lesson.id)
				}
			}
			await loadLessonsData()
			onSuccess()
			onShowToast?.(`Deleted ${dummyCount} dummy lesson(s).`, 'success')
		} catch (error) {
			console.error('Error cleaning up dummy lessons:', error)
			onShowToast?.('Failed to clean up dummy lessons. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleFixAllLessonsData = async () => {
		const currentUser = getCurrentUser()
		if (!currentUser || !isAdmin(currentUser)) {
			onShowToast?.('Only admins can fix lesson data.', 'error')
			return
		}

		if (!window.confirm('This will update all lessons in Supabase with correct field mapping from localStorage. Continue?')) {
			return
		}

		setLoading(true)
		try {
			const supabase = getSupabaseClient()
			if (!supabase) {
				onShowToast?.('Supabase not available.', 'error')
				setLoading(false)
				return
			}

			// Load lessons from localStorage (should have correct values)
			const localLessons = localLoadLessons()
			console.log(`[FixLessons] Found ${localLessons.length} lessons in localStorage`)
			
			// Log what's in localStorage for debugging
			localLessons.forEach((lesson, idx) => {
				console.log(`[FixLessons] Local lesson ${idx + 1} (${lesson.id}):`, {
					title: lesson.title,
					subtitle: lesson.subtitle || '(empty)',
					description: lesson.description || '(empty)',
					topic: (lesson as any).topic || '(empty)',
					category: lesson.category || '(empty)'
				})
			})

			if (localLessons.length === 0) {
				onShowToast?.('No lessons found in localStorage to fix.', 'info')
				setLoading(false)
				return
			}

			// Get all lessons from Supabase with all fields to see what's wrong
			const { data: supabaseLessons, error: fetchError } = await supabase
				.from('lessons')
				.select('custom_id, id, title, subtitle, description, topic, category, difficulty')

			if (fetchError) {
				console.error('Error fetching Supabase lessons:', fetchError)
				onShowToast?.('Failed to fetch lessons from Supabase.', 'error')
				setLoading(false)
				return
			}

			console.log(`[FixLessons] Found ${supabaseLessons?.length || 0} lessons in Supabase`)
			
			// Log what's in Supabase for debugging
			supabaseLessons?.forEach((lesson, idx) => {
				console.log(`[FixLessons] Supabase lesson ${idx + 1} (${lesson.custom_id || lesson.id}):`, {
					title: lesson.title || '(empty)',
					subtitle: lesson.subtitle || '(empty)',
					description: lesson.description || '(empty)',
					topic: lesson.topic || '(empty)',
					category: lesson.category || '(empty)',
					difficulty: lesson.difficulty || '(empty)'
				})
			})

			// Create a map of local lessons by ID
			const localLessonsById = new Map(localLessons.map(l => [l.id, l]))

			// Update each Supabase lesson with correct data from localStorage
			let fixedCount = 0
			let skippedCount = 0
			let errorCount = 0

			for (const supabaseLesson of (supabaseLessons || [])) {
				const customId = supabaseLesson.custom_id || supabaseLesson.id
				const localLesson = localLessonsById.get(customId)

				if (!localLesson) {
					console.log(`[FixLessons] Skipping lesson ${customId} - not found in localStorage`)
					skippedCount++
					continue
				}

				// Extract lesson number from custom_id
				const match = customId.match(/lesson-(\d+)/)
				const lessonNumber = match ? parseInt(match[1], 10) : 1

				// Prepare update data with correct field mapping
				const updateData = {
					title: localLesson.title,
					subtitle: localLesson.subtitle || null,
					description: localLesson.description || null,
					topic: (localLesson as any).topic || null, // Topic goes to topic field
					category: null, // Don't use category field - use topic instead
					difficulty: localLesson.category || 'beginner', // Category maps to difficulty
					lesson_number: lessonNumber
				}

				console.log(`[FixLessons] Updating lesson ${customId}:`, {
					from: {
						subtitle: supabaseLesson.subtitle || '(empty)',
						description: supabaseLesson.description || '(empty)',
						topic: supabaseLesson.topic || '(empty)',
						difficulty: supabaseLesson.difficulty || '(empty)'
					},
					to: {
						subtitle: updateData.subtitle || '(empty)',
						description: updateData.description || '(empty)',
						topic: updateData.topic || '(empty)',
						difficulty: updateData.difficulty
					}
				})

				// Update in Supabase using custom_id
				const { error: updateError, data: updateResult } = await supabase
					.from('lessons')
					.update(updateData)
					.eq('custom_id', customId)

				if (updateError) {
					console.error(`[FixLessons] Error updating lesson ${customId}:`, updateError)
					errorCount++
				} else {
					fixedCount++
					console.log(`[FixLessons] ✅ Fixed lesson ${customId}`, updateResult)
				}
			}

			// Wait a bit for Supabase to update
			await new Promise(resolve => setTimeout(resolve, 500))

			// Reload lessons
			await loadLessonsData()
			onSuccess()

			if (errorCount > 0) {
				onShowToast?.(`Fixed ${fixedCount} lesson(s). ${errorCount} failed. ${skippedCount > 0 ? `${skippedCount} skipped.` : ''} Check console for details.`, 'error')
			} else {
				onShowToast?.(`Fixed ${fixedCount} lesson(s). ${skippedCount > 0 ? `${skippedCount} skipped.` : ''}`, 'success')
			}
		} catch (error) {
			console.error('Error fixing lessons data:', error)
			onShowToast?.('Failed to fix lessons data. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleDragStart = (index: number) => {
		setDraggedIndex(index)
	}

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
	}

	const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault()
		
		if (draggedIndex === null || draggedIndex === dropIndex) {
			setDraggedIndex(null)
			return
		}

		const newLessons = [...lessons]
		const draggedLesson = newLessons[draggedIndex]
		newLessons.splice(draggedIndex, 1)
		newLessons.splice(dropIndex, 0, draggedLesson)

		// Get the IDs in the new order
		const reorderedIds = newLessons.map(lesson => lesson.id)
		
		setLoading(true)
		try {
			await reorderLessons(reorderedIds)
			await loadLessonsData()
			onSuccess()
			onShowToast?.('Lessons reordered successfully.', 'success')
		} catch (error) {
			console.error('Error reordering lessons:', error)
			onShowToast?.('Failed to reorder lessons. Please try again.', 'error')
		} finally {
			setLoading(false)
			setDraggedIndex(null)
		}
	}

	const handleMoveUp = async (index: number) => {
		if (index === 0) return

		const newLessons = [...lessons]
		const temp = newLessons[index]
		newLessons[index] = newLessons[index - 1]
		newLessons[index - 1] = temp

		const reorderedIds = newLessons.map(lesson => lesson.id)
		
		setLoading(true)
		try {
			await reorderLessons(reorderedIds)
			await loadLessonsData()
			onSuccess()
			onShowToast?.('Lesson moved up successfully.', 'success')
		} catch (error) {
			console.error('Error moving lesson up:', error)
			onShowToast?.('Failed to reorder lesson. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleMoveDown = async (index: number) => {
		if (index === lessons.length - 1) return

		const newLessons = [...lessons]
		const temp = newLessons[index]
		newLessons[index] = newLessons[index + 1]
		newLessons[index + 1] = temp

		const reorderedIds = newLessons.map(lesson => lesson.id)
		
		setLoading(true)
		try {
			await reorderLessons(reorderedIds)
			await loadLessonsData()
			onSuccess()
			onShowToast?.('Lesson moved down successfully.', 'success')
		} catch (error) {
			console.error('Error moving lesson down:', error)
			onShowToast?.('Failed to reorder lesson. Please try again.', 'error')
		} finally {
			setLoading(false)
		}
	}

	if (!isOpen) return null

	const getLessonNumber = (id: string): number => {
		const match = id.match(/lesson-(\d+)/)
		return match ? parseInt(match[1], 10) : 0
	}

	const getCategoryBadgeColor = (category: string) => {
		switch (category) {
			case 'beginner': return 'rgba(0, 128, 0, 0.2)'
			case 'intermediate': return 'rgba(255, 165, 0, 0.2)'
			case 'advanced': return 'rgba(255, 0, 0, 0.2)'
			default: return 'rgba(0, 0, 0, 0.1)'
		}
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Manage Lessons</h2>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<div className="modal-body" style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
					{loading && lessons.length === 0 ? (
						<div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
							<p>Loading lessons...</p>
						</div>
					) : lessons.length === 0 ? (
						<div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'rgba(0, 0, 0, 0.6)' }}>
							<p>No lessons yet. Add lessons from the Composer.</p>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
							{lessons.map((lesson, index) => (
								<div
									key={lesson.id}
									draggable={!editingLesson}
									onDragStart={() => handleDragStart(index)}
									onDragOver={handleDragOver}
									onDrop={(e) => handleDrop(e, index)}
									style={{
										border: 'var(--border-2) solid var(--color-black)',
										borderRadius: 'var(--radius-2)',
										padding: 'var(--space-3)',
										background: 'var(--color-white)',
										cursor: editingLesson ? 'default' : 'move',
										opacity: draggedIndex === index ? 0.5 : 1,
										transition: 'all 0.2s ease'
									}}
								>
									{editingLesson?.id === lesson.id ? (
										// Edit mode
										<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Title (Auto-generated)
												</label>
												<input
													type="text"
													value={editTitle}
													readOnly
													className="modal-input"
													style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', cursor: 'not-allowed' }}
													disabled
												/>
												<p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.5)', marginTop: 'var(--space-1)' }}>
													Lesson titles are automatically generated based on their position in the list.
												</p>
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Subtitle
												</label>
												<input
													type="text"
													value={editSubtitle}
													onChange={(e) => setEditSubtitle(e.target.value)}
													className="modal-input"
													placeholder="e.g., Major Scales, Basic Progressions"
												/>
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Category (topic)
												</label>
												{!showCustomTopicInput ? (
													<select
														value={editTopic}
														onChange={handleTopicChange}
														className="modal-input"
														style={{ width: '100%' }}
													>
														<option value="">Select a category...</option>
														{categorySuggestions.map((c) => (
															<option key={c} value={c}>{c}</option>
														))}
														<option value="__add_new__">➕ Add new category...</option>
													</select>
												) : (
													<div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
														<input
															type="text"
															value={customTopic}
															onChange={(e) => setCustomTopic(e.target.value)}
															className="modal-input"
															placeholder="Enter new category name"
															autoFocus
															style={{ flex: 1 }}
														/>
														<button
															type="button"
															className="btn-sm"
															onClick={() => {
																setShowCustomTopicInput(false)
																setCustomTopic('')
																setEditTopic('')
															}}
															style={{ flexShrink: 0 }}
														>
															Cancel
														</button>
													</div>
												)}
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Description
												</label>
												<textarea
													value={editDescription}
													onChange={(e) => setEditDescription(e.target.value)}
													className="modal-input"
													rows={3}
													placeholder="Enter lesson description"
													style={{ 
														resize: 'vertical', 
														minHeight: '60px',
														width: '100%'
													}}
												/>
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Difficulty Level
												</label>
												<select
													value={editCategory}
													onChange={(e) => setEditCategory(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
													className="modal-input"
													style={{ width: '100%' }}
												>
													<option value="beginner">Beginner</option>
													<option value="intermediate">Intermediate</option>
													<option value="advanced">Advanced</option>
												</select>
											</div>
											<div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
												<button
													className="btn-sm"
													onClick={handleSaveEdit}
													disabled={loading}
												>
													Save
												</button>
												<button
													className="btn-sm"
													onClick={handleCancelEdit}
													disabled={loading}
												>
													Cancel
												</button>
											</div>
										</div>
									) : (
										// View mode
										<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
											{/* Order controls */}
											<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flexShrink: 0 }}>
												<button
													className="icon-btn-sm"
													onClick={() => handleMoveUp(index)}
													disabled={loading || index === 0}
													title="Move up"
													style={{ padding: '4px', opacity: index === 0 ? 0.3 : 1 }}
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
														<polyline points="18 15 12 9 6 15"></polyline>
													</svg>
												</button>
												<span style={{ fontSize: 'var(--font-size-xs)', textAlign: 'center', fontWeight: 'var(--font-weight-semibold)' }}>
													{getLessonNumber(lesson.id)}
												</span>
												<button
													className="icon-btn-sm"
													onClick={() => handleMoveDown(index)}
													disabled={loading || index === lessons.length - 1}
													title="Move down"
													style={{ padding: '4px', opacity: index === lessons.length - 1 ? 0.3 : 1 }}
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
														<polyline points="6 9 12 15 18 9"></polyline>
													</svg>
												</button>
											</div>

											{/* Lesson info */}
											<div style={{ flex: 1, minWidth: 0 }}>
												<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
													<div style={{ flex: 1, minWidth: 0 }}>
														<h3 style={{ 
															margin: 0, 
															fontSize: 'var(--font-size-base)', 
															fontWeight: 'var(--font-weight-semibold)',
														}}>
															{lesson.title}
														</h3>
														{lesson.subtitle && (
															<p style={{ 
																margin: '4px 0 0 0',
																fontSize: 'var(--font-size-sm)', 
																color: 'rgba(0, 0, 0, 0.7)',
																fontWeight: 'var(--font-weight-bold)'
															}}>
																{lesson.subtitle}
															</p>
														)}
							{(lesson as any).topic && (
								<p style={{ 
									margin: '2px 0 0 0',
									fontSize: 'var(--font-size-xs)', 
									color: 'rgba(0, 0, 0, 0.8)',
									fontWeight: 'var(--font-weight-semibold)'
								}}>
									{(lesson as any).topic}
								</p>
							)}
													</div>
													<span style={{
														padding: '2px 8px',
														borderRadius: 'var(--radius-2)',
														fontSize: 'var(--font-size-xs)',
														fontWeight: 'var(--font-weight-semibold)',
														background: getCategoryBadgeColor(lesson.category),
														textTransform: 'capitalize',
														flexShrink: 0
													}}>
														{lesson.category}
													</span>
												</div>
												<p style={{ 
													margin: 0, 
													fontSize: 'var(--font-size-sm)', 
													color: 'rgba(0, 0, 0, 0.6)',
													marginBottom: 'var(--space-1)'
												}}>
													{lesson.description}
												</p>
											</div>

											{/* Action buttons */}
											<div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
												<button
													className="icon-btn-sm"
													onClick={() => handleEdit(lesson)}
													disabled={loading || editingLesson !== null}
													title="Edit lesson"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
													</svg>
												</button>
												<button
													className="icon-btn-sm"
													onClick={() => handleDelete(lesson.id, lesson.title)}
													disabled={loading || editingLesson !== null}
													title="Delete lesson"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
														<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
													</svg>
												</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				<div className="modal-footer">
					<div style={{ display: 'flex', gap: 'var(--space-2)', marginRight: 'auto', flexWrap: 'wrap' }}>
						{currentUser && isAdmin(currentUser) && lessons.length > 0 && (
							<button 
								className="btn-sm" 
								onClick={handleDeleteAllLessons} 
								disabled={loading}
								style={{ 
									background: 'transparent',
									border: '2px solid #dc2626',
									color: '#dc2626',
									fontWeight: 'bold'
								}}
								title="Delete all lessons (you can re-add them from Composer)"
							>
								🗑️ Delete All Lessons ({lessons.length})
							</button>
						)}
						{currentUser && isAdmin(currentUser) && (
							<button 
								className="btn-sm" 
								onClick={handleFixAllLessonsData} 
								disabled={loading}
								style={{ 
									background: 'transparent',
									border: '2px solid #dc2626',
									color: '#dc2626'
								}}
								title="Fix field mapping for all lessons (uses localStorage data)"
							>
								Fix All Lessons Data
							</button>
						)}
						{lessons.filter(l => !l.compositionId).length > 0 && (
							<button 
								className="btn-sm" 
								onClick={handleCleanupDummyLessons} 
								disabled={loading}
								style={{ 
									background: 'transparent',
									border: '2px solid #dc2626',
									color: '#dc2626'
								}}
							>
								Delete {lessons.filter(l => !l.compositionId).length} Dummy Lesson(s)
							</button>
						)}
					</div>
					<button className="btn-sm" onClick={onClose} disabled={loading}>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}

