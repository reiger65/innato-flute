import { useState, useEffect } from 'react'
import { loadLessons, updateLesson, deleteLesson, reorderLessons, type Lesson } from '../lib/lessonsService'
import { getComposition } from '../lib/compositionService'

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
	const [editDescription, setEditDescription] = useState('')
	const [editCategory, setEditCategory] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

	useEffect(() => {
		if (isOpen) {
			loadLessonsData()
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
			const loadedLessons = await loadLessons()
			setLessons(loadedLessons)
		} catch (error) {
			console.error('Error loading lessons:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleEdit = (lesson: Lesson) => {
		setEditingLesson(lesson)
		setEditTitle(lesson.title)
		setEditDescription(lesson.description)
		setEditCategory(lesson.category)
	}

	const handleSaveEdit = async () => {
		if (!editingLesson) return

		setLoading(true)
		try {
			await updateLesson(editingLesson.id, {
				title: editTitle.trim(),
				description: editDescription.trim(),
				category: editCategory
			})
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
		setEditDescription('')
		setEditCategory('beginner')
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

		// Update lesson IDs to be sequential
		const reorderedIds = newLessons.map((_, index) => `lesson-${index + 1}`)
		
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

		const reorderedIds = newLessons.map((_, i) => `lesson-${i + 1}`)
		
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

		const reorderedIds = newLessons.map((_, i) => `lesson-${i + 1}`)
		
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

	const [compositionNames, setCompositionNames] = useState<Map<string, string>>(new Map())

	// Load composition names
	useEffect(() => {
		const loadNames = async () => {
			const names = new Map<string, string>()
			for (const lesson of lessons) {
				if (lesson.compositionId && !names.has(lesson.compositionId)) {
					const comp = await getComposition(lesson.compositionId)
					names.set(lesson.compositionId, comp ? comp.name : 'Composition not found')
				}
			}
			setCompositionNames(names)
		}
		loadNames()
	}, [lessons])

	const getCompositionName = (compositionId: string | null): string => {
		if (!compositionId) return 'No composition'
		return compositionNames.get(compositionId) || 'Loading...'
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
													Title *
												</label>
												<input
													type="text"
													value={editTitle}
													onChange={(e) => setEditTitle(e.target.value)}
													className="modal-input"
													required
													autoFocus
												/>
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Description
												</label>
												<textarea
													value={editDescription}
													onChange={(e) => setEditDescription(e.target.value)}
													className="modal-input"
													rows={2}
													style={{ resize: 'vertical', minHeight: '50px' }}
												/>
											</div>
											<div>
												<label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
													Difficulty
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
													disabled={loading || !editTitle.trim()}
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
													<h3 style={{ 
														margin: 0, 
														fontSize: 'var(--font-size-base)', 
														fontWeight: 'var(--font-weight-semibold)',
														flex: 1,
														minWidth: 0
													}}>
														{lesson.title}
													</h3>
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
												<div style={{ 
													fontSize: 'var(--font-size-xs)', 
													color: 'rgba(0, 0, 0, 0.5)'
												}}>
													Composition: {getCompositionName(lesson.compositionId)}
												</div>
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
					<button className="btn-sm" onClick={onClose} disabled={loading}>
						Close
					</button>
				</div>
			</div>
		</div>
	)
}

