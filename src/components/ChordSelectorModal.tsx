import { useState, useRef } from 'react'
import { ChordCard } from './ChordCard'
import { fingeringToOpenStates, getFingeringForChord } from '../lib/chordMappings'
import { getNotesFromOpenStates } from '../lib/fluteData'
import type { FluteType, TuningFrequency } from '../lib/fluteData'
import { simplePlayer } from '../lib/simpleAudioPlayer'

interface ChordSelectorModalProps {
	fluteType: FluteType
	tuning: TuningFrequency
	onSelect: (chordIds: number[]) => void
	onClose: () => void
	favoriteChordIds?: number[]
	onToggleFavorite?: (chordId: number) => void
}

export function ChordSelectorModal({ fluteType, tuning, onSelect, onClose, favoriteChordIds = [], onToggleFavorite }: ChordSelectorModalProps) {
	const [playingChordId, setPlayingChordId] = useState<number | null>(null)
	const [activeChordId, setActiveChordId] = useState<number | null>(null)
	const [activeTab, setActiveTab] = useState<'finder' | 'favorites'>('finder')
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedChordCounts, setSelectedChordCounts] = useState<Record<number, number>>({}) // Track count per chord
	const activeTimeoutRef = useRef<number | null>(null)

	const handleChordClick = async (chordId: number) => {
		// Play the chord (but don't select it - selection is done via the circle button)
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
			
			const fingering = getFingeringForChord(chordId)
			const openStates = fingeringToOpenStates(fingering)
			const notes = getNotesFromOpenStates(openStates, fluteType)
			
			// Visual feedback - add active class
			setActiveChordId(chordId)
			
			// Clear active state after 2 seconds
			if (activeTimeoutRef.current) {
				clearTimeout(activeTimeoutRef.current)
			}
			activeTimeoutRef.current = window.setTimeout(() => {
				setActiveChordId(null)
			}, 2000)
			
			setPlayingChordId(chordId)
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning)
			setPlayingChordId(null)
		} catch (error) {
			console.error('Error playing chord:', error)
			setActiveChordId(null)
			setPlayingChordId(null)
		}
	}

	const incrementChord = (chordId: number) => {
		setSelectedChordCounts(prev => ({
			...prev,
			[chordId]: (prev[chordId] || 0) + 1
		}))
	}

	const decrementChord = (chordId: number) => {
		setSelectedChordCounts(prev => {
			const current = prev[chordId] || 0
			if (current <= 1) {
				const updated = { ...prev }
				delete updated[chordId]
				return updated
			}
			return {
				...prev,
				[chordId]: current - 1
			}
		})
	}

	const toggleChordSelection = (chordId: number) => {
		setSelectedChordCounts(prev => {
			if (prev[chordId] && prev[chordId] > 0) {
				const updated = { ...prev }
				delete updated[chordId]
				return updated
			} else {
				return {
					...prev,
					[chordId]: 1
				}
			}
		})
	}

	const handleSaveToComposer = () => {
		// Convert counts to array of chord IDs (with duplicates)
		const chordIds: number[] = []
		Object.entries(selectedChordCounts).forEach(([chordId, count]) => {
			for (let i = 0; i < count; i++) {
				chordIds.push(Number(chordId))
			}
		})
		
		if (chordIds.length === 0) {
			alert('Please select at least one chord')
			return
		}
		onSelect(chordIds)
		onClose()
	}

	// Calculate total selected count
	const totalSelectedCount = Object.values(selectedChordCounts).reduce((sum, count) => sum + count, 0)

	// Filter chords based on search query and active tab
	const getFilteredChords = () => {
		const allChords = Array.from({ length: 64 }, (_, i) => i + 1)
		const chordsToFilter = activeTab === 'favorites' ? favoriteChordIds : allChords
		
		if (!searchQuery) return chordsToFilter
		
		const searchLower = searchQuery.toLowerCase()
		return chordsToFilter.filter(chordId => {
			const chordStr = String(chordId)
			if (chordStr.includes(searchLower)) return true
			
			const notes = getNotesFromOpenStates(fingeringToOpenStates(getFingeringForChord(chordId)), fluteType)
			const notesStr = `${notes.left}/${notes.right}/${notes.front}`.toLowerCase()
			return notesStr.includes(searchLower)
		})
	}

	const filteredChords = getFilteredChords()

	return (
		<div className="chord-selector-overlay" onClick={onClose}>
			<div className="chord-selector-modal" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<div className="chord-selector-header">
					<h2 className="chord-selector-title">Select a Chord</h2>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				{/* Instructions */}
				<div className="chord-selector-description">
					<p>Click the + button on a chord to add it, then use +/− to adjust the count. Click "Save to composer" to add your selected chords. You can also click the heart icon to add chords to your favorites.</p>
				</div>

				{/* Tabs */}
				<div style={{ marginBottom: 'var(--space-3)' }}>
					<div className="chord-selector-tabs">
						<button
							className={`chord-selector-tab ${activeTab === 'finder' ? 'is-active' : ''}`}
							onClick={() => {
								setActiveTab('finder')
								setSearchQuery('')
							}}
						>
							Finder
						</button>
						<button
							className={`chord-selector-tab ${activeTab === 'favorites' ? 'is-active' : ''}`}
							onClick={() => {
								setActiveTab('favorites')
								setSearchQuery('')
							}}
						>
							Favorites
						</button>
					</div>
				</div>

				{/* Search Bar and Save Button - Aligned */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
					{/* Search Bar */}
					<div className="chord-selector-search" style={{ flex: 1 }}>
						<svg className="chord-selector-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="11" cy="11" r="8"></circle>
							<path d="m21 21-4.35-4.35"></path>
						</svg>
						<input
							type="text"
							className="chord-selector-search-input"
							placeholder="Search"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{/* Save to Composer Button */}
					<button
						className="chord-selector-btn"
						onClick={handleSaveToComposer}
						disabled={totalSelectedCount === 0}
						style={{ flexShrink: 0 }}
					>
						Save to composer {totalSelectedCount > 0 && `(${totalSelectedCount})`}
					</button>
				</div>

				{/* Chord Grid */}
				<div className="chord-selector-grid">
					{filteredChords.length === 0 ? (
						<div className="chord-selector-empty">
							<p>{activeTab === 'favorites' ? 'No favorites yet. Add chords to favorites in the Library.' : 'No chords found matching your search.'}</p>
						</div>
					) : (
						filteredChords.map(chordId => {
						const fingering = getFingeringForChord(chordId)
						const openStates = fingeringToOpenStates(fingering)
						const isPlaying = playingChordId === chordId
						const chordCount = selectedChordCounts[chordId] || 0
						const isSelected = chordCount > 0
						const isFavorite = favoriteChordIds.includes(chordId)

						return (
							<div key={chordId} className="chord-selector-item">
								{/* Plus/Minus controls (bottom-left) */}
								{isSelected ? (
									<div style={{
										position: 'absolute',
										bottom: '4px',
										left: '4px',
										zIndex: 10,
										display: 'flex',
										alignItems: 'center',
										gap: '4px',
										background: 'var(--color-white)',
										border: '1px solid var(--color-black)',
										borderRadius: '4px',
										padding: '2px'
									}}>
										<button
											style={{
												width: '16px',
												height: '16px',
												background: 'var(--color-black)',
												border: 'none',
												borderRadius: '2px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												cursor: 'pointer',
												padding: 0,
												fontSize: '12px',
												color: 'var(--color-white)',
												lineHeight: 1
											}}
											onClick={(e) => {
												e.stopPropagation()
												decrementChord(chordId)
											}}
											aria-label="Decrease count"
										>
											−
										</button>
										<span style={{
											fontSize: '12px',
											fontWeight: 'bold',
											minWidth: '12px',
											textAlign: 'center',
											color: 'var(--color-black)'
										}}>
											{chordCount}
										</span>
										<button
											style={{
												width: '16px',
												height: '16px',
												background: 'var(--color-black)',
												border: 'none',
												borderRadius: '2px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												cursor: 'pointer',
												padding: 0,
												fontSize: '12px',
												color: 'var(--color-white)',
												lineHeight: 1
											}}
											onClick={(e) => {
												e.stopPropagation()
												incrementChord(chordId)
											}}
											aria-label="Increase count"
										>
											+
										</button>
									</div>
								) : (
									<button
										style={{
											position: 'absolute',
											bottom: '4px',
											left: '4px',
											zIndex: 10,
											width: '24px',
											height: '24px',
											background: 'var(--color-white)',
											border: '1px solid var(--color-black)',
											borderRadius: '4px',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											cursor: 'pointer',
											padding: 0,
											fontSize: '16px',
											color: 'var(--color-black)',
											lineHeight: 1,
											fontWeight: 'bold'
										}}
										onClick={(e) => {
											e.stopPropagation()
											incrementChord(chordId)
										}}
										aria-label="Add chord"
									>
										+
									</button>
								)}
								<button
									style={{
										position: 'absolute',
										top: '2px',
										right: '2px',
										zIndex: 10,
										width: '20px',
										height: '20px',
										background: 'transparent',
										border: 'none',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										cursor: 'pointer',
										padding: 0,
										fontSize: '18px',
										color: isFavorite ? 'var(--color-black)' : 'transparent',
										lineHeight: 1,
										fontWeight: 'bold',
										WebkitTextStroke: isFavorite ? 'none' : '2px var(--color-black)',
										WebkitTextFillColor: isFavorite ? 'var(--color-black)' : 'transparent'
									}}
									onClick={(e) => {
										e.stopPropagation()
										if (onToggleFavorite) {
											onToggleFavorite(chordId)
										}
									}}
									aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
								>
									♥
								</button>

								<div 
									className={`chord-selector-card ${isPlaying ? 'is-playing' : ''} ${activeChordId === chordId ? 'active' : ''}`}
									onClick={() => handleChordClick(chordId)}
								>
									<ChordCard
										value={String(chordId)}
										openStates={openStates}
										fluteType={fluteType}
										onPlay={() => handleChordClick(chordId)}
										hideNotes={false}
										hideChordNumber={false}
										fluid={true}
										pixelSize={80}
									/>
								</div>
							</div>
						)
						})
					)}
				</div>
			</div>
		</div>
	)
}

