import { useState, useRef, useEffect } from 'react'
import { ChordCard } from './ChordCard'
import { getNotesFromOpenStates } from '../lib/fluteData'
import type { FluteType, TuningFrequency } from '../lib/fluteData'
import type { Lesson } from '../lib/lessonsData'
import { saveLessonProgress } from '../lib/lessonsData'
import { simplePlayer } from '../lib/simpleAudioPlayer'
import { getComposition } from '../lib/compositionService'
import type { SavedComposition } from '../lib/compositionStorage'

interface LessonModalProps {
	lesson: Lesson
	fluteType: FluteType
	tuning: TuningFrequency
	onClose: () => void
	onComplete: (completedLessonId: string) => void
}

export function LessonModal({ lesson, fluteType, tuning, onClose, onComplete }: LessonModalProps) {
	const [composition, setComposition] = useState<SavedComposition | null>(null)
	const [selectedChordIndex, setSelectedChordIndex] = useState(0)
	const [isPlaying, setIsPlaying] = useState(false)
	const [playingChordIndex, setPlayingChordIndex] = useState<number | null>(null)
	const [playingDotIndex, setPlayingDotIndex] = useState<number | null>(null)
	const isPlayingRef = useRef(false)
	const sequenceContainerRef = useRef<HTMLDivElement | null>(null)

	// Extract lesson number from ID (e.g., "lesson-1" -> 1)
	const getLessonNumber = (id: string): number => {
		const match = id.match(/lesson-(\d+)/)
		return match ? parseInt(match[1], 10) : 0
	}

	// Load composition when modal opens
	useEffect(() => {
		const loadComp = async () => {
			if (lesson.compositionId) {
				const comp = await getComposition(lesson.compositionId)
				setComposition(comp || null)
				if (comp && comp.chords.length > 0) {
					setSelectedChordIndex(0)
				}
			}
		}
		loadComp()
	}, [lesson.compositionId])

	if (!lesson.compositionId || !composition) {
		return (
			<div className="lesson-modal-overlay" onClick={onClose}>
				<div className="lesson-modal" onClick={(e) => e.stopPropagation()}>
					<div className="lesson-modal-header">
						<div>
							<h2 className="lesson-modal-title">{lesson.title}</h2>
						</div>
						<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>
					<p className="lesson-modal-description">
						No composition assigned to this lesson yet. Please create a composition in the composer first.
					</p>
				</div>
			</div>
		)
	}

	const chords = composition.chords
	const selectedChord = chords[selectedChordIndex]
	const selectedChordOpenStates = selectedChord ? selectedChord.openStates : []

	const handleChordCardClick = async (chordIndex?: number) => {
		const chordToPlay = chordIndex !== undefined ? chords[chordIndex] : selectedChord
		if (!chordToPlay || chordToPlay.chordId === null) return
		try {
			// Initialize audio - on iOS this must be called directly from the click handler
			await simplePlayer.initAudio()
			
			// Ensure audio context is resumed (critical for iOS)
			const audioContext = simplePlayer.getAudioContext()
			if (audioContext && audioContext.state === 'suspended') {
				// On iOS, resume() must be called synchronously in the event handler
				await audioContext.resume()
				// Sometimes iOS needs a second resume call
				if (audioContext.state === 'suspended') {
					await audioContext.resume()
				}
			}
			
			const notes = getNotesFromOpenStates(chordToPlay.openStates, fluteType)
			// Normal duration when clicking manually (not extended like in playback)
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, 2.0)
		} catch (error) {
			console.error('Error playing chord:', error)
		}
	}

	const handlePlayComposition = async () => {
		if (isPlaying) {
			setIsPlaying(false)
			isPlayingRef.current = false
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
			return
		}

		if (chords.length === 0) return

		setIsPlaying(true)
		isPlayingRef.current = true

		try {
			await simplePlayer.initAudio()
			
			const beatDurationMs = (60 / composition.tempo) * 1000 // One beat in milliseconds
			const beatDurationSeconds = 60 / composition.tempo // One beat in seconds
			
			for (let i = 0; i < chords.length; i++) {
				if (!isPlayingRef.current) break

				const chord = chords[i]
				const isLastChord = i === chords.length - 1
				setSelectedChordIndex(i)
				setPlayingChordIndex(i)

				// Scroll to the active card to keep it visible
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.lesson-timeline-item')
					if (cardElements[i]) {
						cardElements[i].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}

				if (chord.chordId !== null) {
					// Play each beat separately to show progress
					for (let beat = 0; beat < chord.beats; beat++) {
						if (!isPlayingRef.current) break
						
						setPlayingDotIndex(beat)
						
						// Play the chord with the correct duration
						// Add extra duration to the last chord (1 extra beat) - only for automatic playback
						let chordDuration = beatDurationSeconds * chord.beats
						if (isLastChord && beat === chord.beats - 1) {
							chordDuration += beatDurationSeconds // Add one extra beat for the last note
						}
						
						const notes = getNotesFromOpenStates(chord.openStates, fluteType)
						simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, chordDuration)
						
						// Wait for one beat duration (except for last beat of last chord - it plays longer)
						if (!(isLastChord && beat === chord.beats - 1)) {
							await new Promise(resolve => setTimeout(resolve, beatDurationMs))
						} else {
							// For last beat of last chord, wait for the extra duration
							await new Promise(resolve => setTimeout(resolve, beatDurationMs + beatDurationMs))
						}
					}
				} else {
					// For rests, wait for all beats
					for (let beat = 0; beat < chord.beats; beat++) {
						if (!isPlayingRef.current) break
						setPlayingDotIndex(beat)
						await new Promise(resolve => setTimeout(resolve, beatDurationMs))
					}
				}

				// Keep the last chord highlighted longer
				if (isLastChord) {
					// Wait a bit longer before clearing the animation for the last chord
					await new Promise(resolve => setTimeout(resolve, beatDurationMs))
				}
				
				setPlayingDotIndex(null)
				
				// Clear playing animation after a short delay (except for last chord which stays longer)
				if (!isLastChord) {
					setPlayingChordIndex(null)
				}
			}
			
			// Clear the last chord animation after the extra duration
			setTimeout(() => {
				setPlayingChordIndex(null)
			}, beatDurationMs)

			setIsPlaying(false)
			isPlayingRef.current = false
			setSelectedChordIndex(0)
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
		} catch (error) {
			console.error('Error playing composition:', error)
			setIsPlaying(false)
			isPlayingRef.current = false
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
		}
	}

	const handlePrevious = async () => {
		if (selectedChordIndex > 0) {
			const newIndex = selectedChordIndex - 1
			setSelectedChordIndex(newIndex)
			
			// Scroll to the card in timeline
			setTimeout(() => {
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
					if (cardElements[newIndex]) {
						cardElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}
			}, 50)
			
			// Play the chord and show animation
			const chord = chords[newIndex]
			if (chord && chord.chordId !== null) {
				setPlayingChordIndex(newIndex)
				try {
					await simplePlayer.initAudio()
					const notes = getNotesFromOpenStates(chord.openStates, fluteType)
					// Normal duration when clicking manually (not extended)
					await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, 2.0)
				} catch (error) {
					console.error('Error playing chord:', error)
				}
				// Clear animation after the chord duration
				setTimeout(() => {
					setPlayingChordIndex(null)
				}, 2000)
			} else {
				// For rests, just clear immediately
				setPlayingChordIndex(null)
			}
		}
	}

	const handleNext = async () => {
		if (selectedChordIndex < chords.length - 1) {
			const newIndex = selectedChordIndex + 1
			setSelectedChordIndex(newIndex)
			
			// Scroll to the card in timeline
			setTimeout(() => {
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
					if (cardElements[newIndex]) {
						cardElements[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}
			}, 50)
			
			// Play the chord and show animation
			const chord = chords[newIndex]
			if (chord && chord.chordId !== null) {
				setPlayingChordIndex(newIndex)
				try {
					await simplePlayer.initAudio()
					const notes = getNotesFromOpenStates(chord.openStates, fluteType)
					// Normal duration when clicking manually (not extended)
					await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, 2.0)
				} catch (error) {
					console.error('Error playing chord:', error)
				}
				// Clear animation after the chord duration
				setTimeout(() => {
					setPlayingChordIndex(null)
				}, 2000)
			} else {
				// For rests, just clear immediately
				setPlayingChordIndex(null)
			}
		}
	}

	const handleMarkComplete = () => {
		const newCompletedState = !lesson.completed
		saveLessonProgress(lesson.id, newCompletedState)
		onComplete(lesson.id)
	}

	return (
		<div className="lesson-modal-overlay" onClick={onClose}>
			<div className="lesson-modal" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="lesson-modal-header">
					<div>
						<h2 className="lesson-modal-title">
							{(() => {
								const lessonNumber = getLessonNumber(lesson.id)
								// Remove any existing "Lesson X -" or "Lesson X-" prefix from title
								const cleanTitle = lesson.title.replace(/^Lesson \d+[-\s:]+/i, '').trim()
								// Lesson number and title
								return `Lesson ${lessonNumber} - ${cleanTitle}`
							})()}
						</h2>
						<div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-normal)', color: 'var(--color-black)', opacity: 0.7, marginTop: 'var(--space-1)' }}>
							{composition.tempo} BPM • {composition.timeSignature} • {chords.length} {chords.length === 1 ? 'chord' : 'chords'}
						</div>
					</div>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				{/* Description - Only show if not the default "Practice this composition" */}
				{lesson.description && lesson.description !== 'Practice this composition' && (
					<p className="lesson-modal-description">{lesson.description}</p>
				)}

				{/* Main Large Card with Rhythm Dots Above */}
				{selectedChord && (
					<div className="composer-main-card-container" style={{ marginBottom: 'var(--space-4)' }}>
						{/* Rhythm Dots Above Main Card */}
						<div className="composer-main-rhythm-dots">
							{Array.from({ length: selectedChord.beats }).map((_, dotIndex) => {
								const isActive = playingChordIndex === selectedChordIndex && playingDotIndex === dotIndex
								return (
									<span 
										key={dotIndex} 
										className={`composer-rhythm-dot ${isActive ? 'is-active' : ''}`}
									></span>
								)
							})}
						</div>

						{/* Main Large Chord Card - Square */}
						<div className={`composer-main-card ${playingChordIndex === selectedChordIndex ? 'is-playing' : ''}`}>
							{selectedChord.chordId === null ? (
								<div className="composer-main-rest-symbol">
									<svg 
										viewBox="0 0 120 120" 
										width="180" 
										height="180"
										style={{ pointerEvents: 'none' }}
									>
										<circle 
											cx="60" 
											cy="60" 
											r="15"
											fill="none"
											stroke="var(--color-black)"
											strokeWidth="2"
										/>
									</svg>
								</div>
							) : (
								<ChordCard
									value={String(selectedChord.chordId)}
									openStates={selectedChordOpenStates}
									fluteType={fluteType}
									onClick={() => handleChordCardClick(selectedChordIndex)}
									hideNotes={false}
									hideChordNumber={false}
									fluid={true}
									pixelSize={180}
								/>
							)}
						</div>
					</div>
				)}

				{/* Timeline with Small Cards Below */}
				<div className="composer-timeline-container">
					<div className="composer-timeline" ref={sequenceContainerRef}>
						{chords.map((chord, index) => (
							<div
								key={chord.id}
								className={`composer-timeline-item lesson-timeline-item ${selectedChordIndex === index ? 'is-selected' : ''} ${playingChordIndex === index ? 'is-playing' : ''}`}
								onClick={() => {
									setSelectedChordIndex(index)
									if (chord.chordId !== null) {
										handleChordCardClick(index)
									}
								}}
								style={{ cursor: 'pointer' }}
							>
								{/* Rhythm Dots */}
								<div className="composer-timeline-rhythm-dots">
									{Array.from({ length: chord.beats }).map((_, dotIndex) => {
										const isActive = playingChordIndex === index && playingDotIndex === dotIndex
										return (
											<span 
												key={dotIndex} 
												className={`composer-rhythm-dot ${isActive ? 'is-active' : ''}`}
											></span>
										)
									})}
								</div>

								{/* Small Chord Card or Rest - Larger size matching composer/selector */}
								<div className={`composer-timeline-chord ${chord.chordId === null ? 'is-rest' : ''}`}>
									{chord.chordId === null ? (
										<div className="composer-timeline-rest">
											<svg 
												viewBox="0 0 120 120" 
												width="103" 
												height="103"
												style={{ pointerEvents: 'none' }}
											>
												<circle 
													cx="60" 
													cy="60" 
													r="15"
													fill="none"
													stroke="var(--color-black)"
													strokeWidth="2"
												/>
											</svg>
										</div>
									) : (
										<ChordCard
											value={String(chord.chordId)}
											openStates={chord.openStates}
											fluteType={fluteType}
											onClick={() => handleChordCardClick(index)}
											hideNotes={false}
											hideChordNumber={false}
											fluid={true}
											pixelSize={103}
										/>
									)}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Controls */}
				<div style={{ 
					display: 'flex', 
					justifyContent: 'center', 
					alignItems: 'center', 
					gap: 'var(--space-2)',
					marginTop: 'var(--space-4)',
					marginBottom: 'var(--space-4)',
					flexWrap: 'wrap'
				}}>
						<button 
							className="btn-sm" 
							onClick={handlePrevious} 
							disabled={selectedChordIndex === 0 || isPlaying}
							title="Previous"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
								<polyline points="11 17 6 12 11 7"></polyline>
								<polyline points="18 17 13 12 18 7"></polyline>
							</svg>
						</button>
						<button 
							className={`btn-sm ${isPlaying ? 'is-active' : ''}`} 
							onClick={handlePlayComposition}
							style={{ minWidth: '100px' }}
						>
							{isPlaying ? (
								<>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
										<rect x="6" y="4" width="4" height="16"></rect>
										<rect x="14" y="4" width="4" height="16"></rect>
									</svg>
									Stop
								</>
							) : (
								<>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }}>
										<polygon points="5 3 19 12 5 21 5 3"></polygon>
									</svg>
									Play
								</>
							)}
						</button>
						<button 
							className="btn-sm" 
							onClick={handleNext} 
							disabled={selectedChordIndex === chords.length - 1 || isPlaying}
							title="Next"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
								<polyline points="13 17 18 12 13 7"></polyline>
								<polyline points="6 17 11 12 6 7"></polyline>
							</svg>
						</button>
				</div>

				{/* Complete Button */}
				<button className="lesson-complete-btn" onClick={handleMarkComplete}>
					{lesson.completed ? '✗ Mark as Incomplete' : '✓ Mark as Complete'}
				</button>

				{/* Footer */}
				<div className="lesson-modal-footer">www.stonewhistle.com</div>
			</div>
		</div>
	)
}

