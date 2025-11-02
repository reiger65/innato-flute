import { useState, useEffect } from 'react'
import { addLesson } from '../lib/lessonsService'

interface AddToLessonsModalProps {
	isOpen: boolean
	compositionId: string
	compositionName: string
	onClose: () => void
	onSuccess: () => void
}

export function AddToLessonsModal({ isOpen, compositionId, compositionName, onClose, onSuccess }: AddToLessonsModalProps) {
	const [title, setTitle] = useState(compositionName)
	const [description, setDescription] = useState('Practice this composition')
	const [category, setCategory] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	if (!isOpen) return null

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!title.trim()) {
			setError('Title is required')
			setLoading(false)
			return
		}

		try {
			await addLesson({
				title: title.trim(),
				description: description.trim() || 'Practice this composition',
				category,
				compositionId,
				unlocked: false,
				completed: false
			})
			
			onSuccess()
			onClose()
		} catch (err) {
			console.error('Error adding lesson:', err)
			setError('Failed to add lesson. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const handleCancel = () => {
		setTitle(compositionName)
		setDescription('Practice this composition')
		setCategory('beginner')
		setError('')
		onClose()
	}

	// Handle Escape key to close modal
	useEffect(() => {
		if (!isOpen) return

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleCancel()
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isOpen, handleCancel])

	return (
		<div className="modal-overlay" onClick={handleCancel}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">Add to Lessons</h2>
					<button className="icon-btn-sm" onClick={handleCancel} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<form onSubmit={handleSubmit}>
					<div className="modal-body">
						{error && (
							<div style={{ 
								padding: 'var(--space-2)', 
								background: 'rgba(255, 0, 0, 0.1)', 
								border: '1px solid rgba(255, 0, 0, 0.3)',
								borderRadius: 'var(--radius-2)',
								color: 'var(--color-black)',
								marginBottom: 'var(--space-3)'
							}}>
								{error}
							</div>
						)}

						<div style={{ marginBottom: 'var(--space-3)' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: 'var(--space-1)', 
								fontSize: 'var(--font-size-sm)', 
								fontWeight: 'var(--font-weight-semibold)' 
							}}>
								Lesson Title *
							</label>
							<input
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="modal-input"
								required
								autoFocus
								placeholder="Enter lesson title"
							/>
						</div>

						<div style={{ marginBottom: 'var(--space-3)' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: 'var(--space-1)', 
								fontSize: 'var(--font-size-sm)', 
								fontWeight: 'var(--font-weight-semibold)' 
							}}>
								Description
							</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="modal-input"
								rows={3}
								placeholder="Enter lesson description"
								style={{
									resize: 'vertical',
									minHeight: '60px'
								}}
							/>
						</div>

						<div style={{ marginBottom: 'var(--space-3)' }}>
							<label style={{ 
								display: 'block', 
								marginBottom: 'var(--space-1)', 
								fontSize: 'var(--font-size-sm)', 
								fontWeight: 'var(--font-weight-semibold)' 
							}}>
								Difficulty Level
							</label>
							<select
								value={category}
								onChange={(e) => setCategory(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
								className="modal-input"
								style={{ width: '100%' }}
							>
								<option value="beginner">Beginner</option>
								<option value="intermediate">Intermediate</option>
								<option value="advanced">Advanced</option>
							</select>
						</div>

						<div style={{ 
							fontSize: 'var(--font-size-xs)', 
							color: 'rgba(0, 0, 0, 0.6)',
							padding: 'var(--space-2)',
							background: 'rgba(0, 0, 0, 0.05)',
							borderRadius: 'var(--radius-2)'
						}}>
							<strong>Composition:</strong> {compositionName}
						</div>
					</div>

					<div className="modal-footer">
						<button 
							type="button" 
							className="btn-sm" 
							onClick={handleCancel}
							disabled={loading}
						>
							Cancel
						</button>
						<button 
							type="submit" 
							className="btn-sm is-active" 
							disabled={loading || !title.trim()}
						>
							{loading ? 'Adding...' : 'Add to Lessons'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

