import { useState, useRef, useEffect } from 'react'
import { ChordCard } from './ChordCard'
import { fingeringToOpenStates, getFingeringForChord } from '../lib/chordMappings'
import type { FluteType, TuningFrequency } from '../lib/fluteData'
import { getNotesFromOpenStates } from '../lib/fluteData'
import type { SharedProgression, SharedComposition } from '../lib/sharedItemsStorage'
import { simplePlayer } from '../lib/simpleAudioPlayer'

interface CommunityPlayerModalProps {
	item: SharedProgression | SharedComposition
	fluteType: FluteType
	tuning: TuningFrequency
	onClose: () => void
	onSave: () => void
	onOpen: () => void
}

export function CommunityPlayerModal({ item, fluteType, tuning, onClose, onSave, onOpen }: CommunityPlayerModalProps) {
	const isProgression = 'chordIds' in item
	const [isPlaying, setIsPlaying] = useState(false)
	const [playingChordIndex, setPlayingChordIndex] = useState<number | null>(null)
	const [playingDotIndex, setPlayingDotIndex] = useState<number | null>(null)
	const isPlayingRef = useRef(false)
	const sequenceContainerRef = useRef<HTMLDivElement | null>(null)

	// Get chords/progression data
	const getChords = () => {
		if (isProgression) {
			const progression = item as SharedProgression
			return progression.chordIds.map(chordId => {
				const fingering = getFingeringForChord(chordId)
				const openStates = fingeringToOpenStates(fingering)
				return {
					chordId,
					openStates,
					beats: 2 // Default 2 beats for progressions
				}
			})
		} else {
			const composition = item as SharedComposition
			return composition.chords.map(chord => ({
				chordId: chord.chordId,
				openStates: chord.openStates,
				beats: chord.beats
			}))
		}
	}

	const chords = getChords()
	const composition = isProgression ? null : (item as SharedComposition)
	const tempo = composition?.tempo || 70
	const timeSignature = composition?.timeSignature || '4/4'

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			isPlayingRef.current = false
			setIsPlaying(false)
		}
	}, [])

	const handlePlay = async () => {
		if (isPlaying) {
			// Stop
			setIsPlaying(false)
			isPlayingRef.current = false
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
			return
		}

		// Start playing
		setIsPlaying(true)
		isPlayingRef.current = true

		try {
			await simplePlayer.initAudio()
			
			const beatDurationMs = (60 / tempo) * 1000
			const beatDurationSeconds = 60 / tempo

			for (let i = 0; i < chords.length; i++) {
				if (!isPlayingRef.current) break

				const chord = chords[i]
				const isLastChord = i === chords.length - 1
				setPlayingChordIndex(i)

				// Scroll to active card
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.community-preview-timeline-item')
					if (cardElements[i]) {
						cardElements[i].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}

				if (chord.chordId !== null) {
					// Play each beat separately
					for (let beat = 0; beat < chord.beats; beat++) {
						if (!isPlayingRef.current) break
						
						setPlayingDotIndex(beat)
						
						// Add extra duration to last beat of last chord
						let chordDuration = beatDurationSeconds * chord.beats
						if (isLastChord && beat === chord.beats - 1) {
							chordDuration += beatDurationSeconds
						}
						
						const notes = getNotesFromOpenStates(chord.openStates, fluteType)
						simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, chordDuration)
						
						// Wait for beat duration
						if (!(isLastChord && beat === chord.beats - 1)) {
							await new Promise(resolve => setTimeout(resolve, beatDurationMs))
						} else {
							await new Promise(resolve => setTimeout(resolve, beatDurationMs + beatDurationMs))
						}
					}
				} else {
					// Rest
					for (let beat = 0; beat < chord.beats; beat++) {
						if (!isPlayingRef.current) break
						setPlayingDotIndex(beat)
						await new Promise(resolve => setTimeout(resolve, beatDurationMs))
					}
				}
				
				setPlayingDotIndex(null)
			}

			setIsPlaying(false)
			isPlayingRef.current = false
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
		} catch (error) {
			console.error('Error playing:', error)
			setIsPlaying(false)
			isPlayingRef.current = false
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
		}
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="community-player-modal" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="community-player-modal-header">
					<div style={{ flex: 1 }}>
						<h2 className="community-player-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
							{/* Icon */}
							<span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
								{isProgression ? (
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
										<line x1="3" y1="8" x2="21" y2="8"></line>
										<line x1="3" y1="12" x2="21" y2="12"></line>
										<line x1="3" y1="16" x2="21" y2="16"></line>
									</svg>
								) : (
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
										<path d="M9 18V5l12-2v13"></path>
										<circle cx="6" cy="18" r="3"></circle>
										<circle cx="18" cy="16" r="3"></circle>
										<line x1="12" y1="5" x2="12" y2="19"></line>
									</svg>
								)}
							</span>
							<span>{item.name}</span>
						</h2>
						<div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.6)', marginTop: '4px' }}>
							By {item.sharedByUsername}
							{item.version > 1 && <span style={{ opacity: 0.7 }}> • v{item.version}</span>}
							{!isProgression && composition && (
								<span> • {composition.tempo} BPM • {composition.timeSignature}</span>
							)}
						</div>
					</div>
					<button
						className="icon-btn-sm"
						onClick={onClose}
						aria-label="Close"
						style={{ flexShrink: 0 }}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				{/* Main Content */}
				<div className="community-player-modal-content">
					{/* Main Card Display */}
					<div className="community-player-main-card-container">
						{/* Rhythm Dots */}
						{!isProgression && composition && (() => {
							const currentChord = playingChordIndex !== null ? chords[playingChordIndex] : chords[0]
							const beatsToShow = currentChord ? currentChord.beats : parseInt(timeSignature.split('/')[0])
							return (
								<div className="community-player-rhythm-dots">
									{Array.from({ length: beatsToShow }).map((_, index) => (
										<div
											key={index}
											className={`composer-rhythm-dot ${playingChordIndex !== null && playingDotIndex === index ? 'is-active' : ''}`}
										/>
									))}
								</div>
							)
						})()}

						{/* Main Card */}
						<div className="community-player-main-card">
							{(() => {
								const currentChord = playingChordIndex !== null ? chords[playingChordIndex] : chords[0]
								if (!currentChord) return null
								return (
									<div style={{ width: '100%', height: '100%' }}>
										{currentChord.chordId !== null ? (
											<ChordCard
												value={String(currentChord.chordId || '')}
												openStates={currentChord.openStates}
												fluteType={fluteType}
												onClick={() => {}}
												hideNotes={false}
												hideChordNumber={false}
												fluid={true}
											/>
										) : (
											<div className="composer-main-rest-symbol">○</div>
										)}
									</div>
								)
							})()}
						</div>

						{/* Timeline */}
						<div className="community-player-timeline-container" ref={sequenceContainerRef}>
							<div className="community-player-timeline">
								{chords.map((chord, index) => (
									<div
										key={index}
										className={`community-preview-timeline-item ${playingChordIndex === index ? 'is-playing' : ''}`}
									>
										{/* Timeline Rhythm Dots */}
										{!isProgression && composition && (
											<div className="composer-timeline-rhythm-dots">
												{Array.from({ length: chord.beats }).map((_, dotIndex) => (
													<div
														key={dotIndex}
														className={`composer-rhythm-dot ${playingChordIndex === index && playingDotIndex === dotIndex ? 'is-active' : ''}`}
													/>
												))}
											</div>
										)}

										{/* Timeline Chord Card */}
										<div className="composer-timeline-chord">
											{chord.chordId !== null ? (
												<ChordCard
													value={String(chord.chordId || '')}
													openStates={chord.openStates}
													fluteType={fluteType}
													onClick={() => {}}
													hideNotes={true}
													hideChordNumber={!isProgression}
													fluid={true}
												/>
											) : (
												<div className="composer-timeline-rest">○</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="community-player-modal-actions">
					<button
						className={`btn ${isPlaying ? 'is-active' : ''}`}
						onClick={handlePlay}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px', flexShrink: 0 }}>
							{isPlaying ? (
								<>
									<rect x="6" y="4" width="4" height="16"></rect>
									<rect x="14" y="4" width="4" height="16"></rect>
								</>
							) : (
								<polygon points="5 3 19 12 5 21 5 3"></polygon>
							)}
						</svg>
						{isPlaying ? 'Pause' : 'Play'}
					</button>
					<button
						className="btn"
						onClick={onSave}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px', flexShrink: 0 }}>
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
							<polyline points="17 21 17 13 7 13 7 21"></polyline>
							<polyline points="7 3 7 8 15 8"></polyline>
						</svg>
						Save
					</button>
					<button
						className="btn is-active"
						onClick={onOpen}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px', flexShrink: 0 }}>
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
						Edit
					</button>
				</div>
			</div>
		</div>
	)
}

