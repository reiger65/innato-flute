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
	const [selectedChordIds, setSelectedChordIds] = useState<number[]>([])
	const activeTimeoutRef = useRef<number | null>(null)

	const handleChordClick = async (chordId: number) => {
		// Play the chord (but don't select it - selection is done via the circle button)
		try {
			await simplePlayer.initAudio()
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

	const toggleChordSelection = (chordId: number) => {
		setSelectedChordIds(prev => {
			if (prev.includes(chordId)) {
				return prev.filter(id => id !== chordId)
			} else {
				return [...prev, chordId]
			}
		})
	}

	const handleSaveToComposer = () => {
		if (selectedChordIds.length === 0) {
			alert('Please select at least one chord')
			return
		}
		onSelect(selectedChordIds)
		onClose()
	}

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
					<p>Click the circle icon on a chord to select it, then click "Save to composer" to add your selected chords. You can also click the heart icon to add chords to your favorites.</p>
				</div>

				{/* Tabs and Search Bar */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
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

					{/* Search Bar */}
					<div className="chord-selector-search" style={{ flex: '0 0 auto', width: 'auto', minWidth: '120px' }}>
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
				</div>

				{/* Save to Composer Button */}
				<div style={{ padding: '0 var(--space-3)', marginBottom: 'var(--space-2)' }}>
					<button
						className="chord-selector-btn"
						onClick={handleSaveToComposer}
						disabled={selectedChordIds.length === 0}
						style={{ width: '100%' }}
					>
						Save to composer {selectedChordIds.length > 0 && `(${selectedChordIds.length})`}
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
						const isSelected = selectedChordIds.includes(chordId)
						const isFavorite = favoriteChordIds.includes(chordId)

						return (
							<div key={chordId} className="chord-selector-item">
								{/* Selection circle icon (top-left) */}
								<button
									style={{
										position: 'absolute',
										top: '4px',
										left: '4px',
										zIndex: 10,
										width: '16px',
										height: '16px',
										background: isSelected ? 'var(--color-black)' : 'transparent',
										border: isSelected ? 'none' : '2px solid var(--color-black)',
										borderRadius: '50%',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										cursor: 'pointer',
										padding: 0,
										fontSize: '14px',
										color: isSelected ? 'var(--color-white)' : 'transparent',
										lineHeight: 1
									}}
									onClick={(e) => {
										e.stopPropagation()
										toggleChordSelection(chordId)
									}}
									aria-label={isSelected ? 'Deselect chord' : 'Select chord'}
								>
									{isSelected ? '✓' : '○'}
								</button>

								{/* Favorite heart icon (top-right) */}
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

