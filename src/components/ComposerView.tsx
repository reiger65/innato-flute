import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { ChordCard } from './ChordCard'
import { ChordSelectorModal } from './ChordSelectorModal'
import { fingeringToOpenStates, getFingeringForChord } from '../lib/chordMappings'
import { getNotesFromOpenStates } from '../lib/fluteData'
import type { FluteType, TuningFrequency } from '../lib/fluteData'
import { simplePlayer } from '../lib/simpleAudioPlayer'
import { saveComposition, loadCompositions, deleteComposition, updateComposition, deleteAllCompositions, type SavedComposition } from '../lib/compositionService'
import { loadProgressions, deleteProgression, type SavedProgression } from '../lib/progressionService'
import { saveSharedComposition, loadSharedCompositions, saveSharedProgression, loadSharedProgressions } from '../lib/sharedItemsStorage'
import { getCurrentUser, isAdmin, type User } from '../lib/authService'
import { AddToLessonsModal } from './AddToLessonsModal'

export interface ComposerChord {
	id: string
	chordId: number | null // null for rest
	openStates: boolean[]
	beats: number // Number of rhythm dots (beats) for this chord
}

interface ComposerViewProps {
	fluteType: FluteType
	tuning: TuningFrequency
	onClose?: () => void
	favoriteChordIds?: number[]
	onToggleFavorite?: (chordId: number) => void
	onShowInfo?: () => void
	onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void
}

export interface ComposerViewRef {
	addChord: (chordIds: number | number[]) => void
	loadComposition: (composition: SavedComposition) => void
}

export const ComposerView = forwardRef<ComposerViewRef, ComposerViewProps>(({ fluteType, tuning, favoriteChordIds = [], onToggleFavorite, onShowInfo, onShowToast }, ref) => {
	const [chords, setChords] = useState<ComposerChord[]>([])
	const [isPlaying, setIsPlaying] = useState(false)
	const [isPaused, setIsPaused] = useState(false)
	const [isLooping, setIsLooping] = useState(false)
	const [tempo, setTempo] = useState(70)
	const [timeSignature, setTimeSignature] = useState<'3/4' | '4/4'>('4/4')
	const [metronomeEnabled, setMetronomeEnabled] = useState(false)
	const [selectedChordIndex, setSelectedChordIndex] = useState<number | null>(null)
	const [showChordSelector, setShowChordSelector] = useState(false)
	const [playingChordIndex, setPlayingChordIndex] = useState<number | null>(null)
	const [playingDotIndex, setPlayingDotIndex] = useState<number | null>(null)
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
	const [pausedChordIndex, setPausedChordIndex] = useState<number | null>(null)
	const [pausedDotIndex, setPausedDotIndex] = useState<number | null>(null)
	const [showSaveModal, setShowSaveModal] = useState(false)
	const [showOpenModal, setShowOpenModal] = useState(false)
	const [showAddProgressionModal, setShowAddProgressionModal] = useState(false)
	const [showRenameModal, setShowRenameModal] = useState(false)
	const [renameCompositionId, setRenameCompositionId] = useState<string | null>(null)
	const [renameCompositionName, setRenameCompositionName] = useState('')
	const [saveModalName, setSaveModalName] = useState('')
	const [loadedCompositionId, setLoadedCompositionId] = useState<string | null>(null) // Track currently loaded composition
	const [loadedCompositionName, setLoadedCompositionName] = useState<string | null>(null) // Track currently loaded composition name
	const [openModalRefresh, setOpenModalRefresh] = useState(0) // Used to force re-render of open modal
	const [progressionModalRefresh, setProgressionModalRefresh] = useState(0) // Used to force re-render of progression modal
	const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser())
	const [showAddToLessonsModal, setShowAddToLessonsModal] = useState(false)
	// State for compositions and progressions
	const [savedCompositions, setSavedCompositions] = useState<SavedComposition[]>([])
	const [savedProgressions, setSavedProgressions] = useState<SavedProgression[]>([])
	// State for selected compositions for deletion
	const [selectedCompositionIds, setSelectedCompositionIds] = useState<Set<string>>(new Set())
	const [compositionSortOrder, setCompositionSortOrder] = useState<'newest' | 'oldest'>('newest') // Sort order: newest first or oldest first
	const isPlayingRef = useRef(false)
	const isPausedRef = useRef(false)
	const isLoopingRef = useRef(false)
	const pausedChordIndexRef = useRef<number | null>(null)
	const pausedDotIndexRef = useRef<number | null>(null)
	const metronomeIntervalRef = useRef<number | null>(null)
	const isPlayingMetronomeRef = useRef(false)
	const sequenceContainerRef = useRef<HTMLDivElement | null>(null)
	const DRAFT_STORAGE_KEY = 'innato-composer-draft'
	const isInitialMountRef = useRef(true) // Track if this is the initial mount

	// Load draft composition on mount (if no composition was explicitly loaded)
	useEffect(() => {
		if (isInitialMountRef.current) {
			isInitialMountRef.current = false
			
			// Only load draft if no composition was explicitly loaded
			if (loadedCompositionId === null && chords.length === 0) {
				try {
					const draftData = localStorage.getItem(DRAFT_STORAGE_KEY)
					if (draftData) {
						const draft = JSON.parse(draftData)
						if (draft.chords && draft.chords.length > 0) {
							setChords(draft.chords)
							setTempo(draft.tempo || 70)
							setTimeSignature(draft.timeSignature || '4/4')
							console.log('[ComposerView] Restored draft composition from localStorage')
						}
					}
				} catch (error) {
					console.error('[ComposerView] Error loading draft:', error)
				}
			}
		}
	}, [])

	// Auto-save draft to localStorage whenever composition changes
	useEffect(() => {
		// Don't save draft if a saved composition is loaded (only save drafts for unsaved work)
		if (loadedCompositionId === null && chords.length > 0) {
			try {
				const draft = {
					chords,
					tempo,
					timeSignature
				}
				localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
			} catch (error) {
				console.error('[ComposerView] Error saving draft:', error)
			}
		} else if (loadedCompositionId === null && chords.length === 0) {
			// Clear draft if composition is empty
			localStorage.removeItem(DRAFT_STORAGE_KEY)
		}
	}, [chords, tempo, timeSignature, loadedCompositionId])

	// Load compositions and progressions on mount and when refresh triggers
	useEffect(() => {
		const loadData = async () => {
			try {
				const [comps, progs] = await Promise.all([
					loadCompositions(),
					loadProgressions()
				])
				
				// Filter out deleted compositions using the deleted IDs list
				const deletedIdsKey = 'deleted-composition-ids'
				const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
				const filteredComps = comps.filter(c => !deletedIds.has(c.id))
				
				console.log(`[ComposerView] Loaded ${comps.length} compositions, filtered to ${filteredComps.length} (deleted: ${deletedIds.size})`)
				
				setSavedCompositions(filteredComps)
				setSavedProgressions(progs)
			} catch (error) {
				console.error('Error loading data:', error)
			}
		}
		loadData()
	}, [openModalRefresh, progressionModalRefresh])

	/**
	 * Add chord(s) to the composition (public method that can be called from parent)
	 */
	const handleAddChord = useRef((chordIds: number | number[]) => {
		const ids = Array.isArray(chordIds) ? chordIds : [chordIds]
		setChords(prevChords => {
			return [...prevChords, ...ids.map(chordId => ({
				id: `chord-${Date.now()}-${Math.random()}-${ids.indexOf(chordId)}`,
				chordId,
				openStates: fingeringToOpenStates(getFingeringForChord(chordId)),
				beats: 1 // Default to 1 beat
			}))]
		})
	})

	// Expose handleAddChord via ref
	const handleLoadComposition = useRef((composition: SavedComposition) => {
		// Convert SavedComposition to ComposerChord[]
		const newChords: ComposerChord[] = composition.chords.map(chord => ({
			id: chord.id,
			chordId: chord.chordId,
			openStates: chord.openStates,
			beats: chord.beats
		}))
		
		setChords(newChords)
		setTempo(composition.tempo)
		setTimeSignature(composition.timeSignature)
		setLoadedCompositionId(composition.id)
		setLoadedCompositionName(composition.name)
		setSaveModalName(composition.name)
		
		// Select first chord if available
		if (newChords.length > 0 && newChords[0].chordId !== null) {
			setSelectedChordIndex(0)
		} else {
			setSelectedChordIndex(null)
		}
	})

	useImperativeHandle(ref, () => ({
		addChord: handleAddChord.current,
		loadComposition: handleLoadComposition.current
	}), [])

	/**
	 * Add a rest (pause) to the composition
	 */
	const handleAddRest = () => {
		const newRest: ComposerChord = {
			id: `rest-${Date.now()}-${Math.random()}`,
			chordId: null,
			openStates: [],
			beats: 1 // Default to 1 beat
		}
		setChords([...chords, newRest])
	}

	/**
	 * Remove a chord/rest from the composition
	 */
	const handleRemoveChord = (index: number) => {
		const newChords = chords.filter((_, i) => i !== index)
		setChords(newChords)
	}

	/**
	 * Duplicate a chord/rest in the composition
	 */
	const handleDuplicateChord = (index: number) => {
		const chordToDuplicate = chords[index]
		const duplicatedChord = {
			...chordToDuplicate,
			id: `chord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		}
		const newChords = [...chords]
		newChords.splice(index + 1, 0, duplicatedChord)
		setChords(newChords)
	}

	/**
	 * Update beats for a chord
	 */
	const handleUpdateBeats = (index: number, beats: number) => {
		const newChords = [...chords]
		const maxBeats = timeSignature === '3/4' ? 3 : 4 // Maximum beats based on time signature
		newChords[index].beats = Math.max(1, Math.min(maxBeats, beats)) // Between 1 and maxBeats
		setChords(newChords)
	}

	/**
	 * Handle drag start
	 */
	const handleDragStart = (e: React.DragEvent, index: number) => {
		if (isPlaying) return // Don't allow dragging while playing
		setDraggedIndex(index)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/html', String(index))
	}

	/**
	 * Handle drag over
	 */
	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault()
		e.stopPropagation()
		e.dataTransfer.dropEffect = 'move'
		if (draggedIndex !== null && draggedIndex !== index) {
			setDragOverIndex(index)
		}
	}

	/**
	 * Handle drag leave
	 */
	const handleDragLeave = () => {
		setDragOverIndex(null)
	}

	/**
	 * Handle drop
	 */
	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault()
		e.stopPropagation()
		
		if (draggedIndex === null || draggedIndex === dropIndex) {
			setDraggedIndex(null)
			setDragOverIndex(null)
			return
		}

		const newChords = [...chords]
		const draggedChord = newChords[draggedIndex]
		
		// Calculate the correct insertion index
		// If dragging forward, we need to adjust because we're removing from the array first
		let insertIndex = dropIndex
		if (draggedIndex < dropIndex) {
			insertIndex = dropIndex - 1
		}
		
		// Remove the dragged item
		newChords.splice(draggedIndex, 1)
		
		// Insert at new position
		newChords.splice(insertIndex, 0, draggedChord)
		
		setChords(newChords)
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	/**
	 * Handle drag end
	 */
	const handleDragEnd = () => {
		setDraggedIndex(null)
		setDragOverIndex(null)
	}

	/**
	 * Handle save composition
	 */
	const handleSaveComposition = async () => {
		if (!saveModalName.trim()) {
			onShowToast?.('Please enter a name for your composition', 'warning')
			return
		}

		if (chords.length === 0) {
			onShowToast?.('Your composition is empty. Add chords first.', 'warning')
			return
		}

		try {
			if (loadedCompositionId) {
				// Update existing composition
				const success = await updateComposition(loadedCompositionId, {
				name: saveModalName.trim(),
				chords: chords.map(chord => ({
					id: chord.id,
					chordId: chord.chordId,
					openStates: chord.openStates,
					beats: chord.beats
				})),
				tempo,
				timeSignature,
				fluteType,
				tuning
			})

				if (success) {
					setLoadedCompositionName(saveModalName.trim()) // Update the displayed name
			setShowSaveModal(false)
					setOpenModalRefresh(prev => prev + 1) // Refresh compositions list
					// Clear draft since this is now a saved composition
					localStorage.removeItem(DRAFT_STORAGE_KEY)
					onShowToast?.(`Composition "${saveModalName.trim()}" updated successfully!`, 'success')
				} else {
					onShowToast?.('Error updating composition. Please try again.', 'error')
				}
			} else {
				// Create new composition
				const saved = await saveComposition({
					name: saveModalName.trim(),
					chords: chords.map(chord => ({
						id: chord.id,
						chordId: chord.chordId,
						openStates: chord.openStates,
						beats: chord.beats
					})),
					tempo,
					timeSignature,
					fluteType,
					tuning
				})

				setLoadedCompositionId(saved.id) // Track the newly saved composition
				setLoadedCompositionName(saved.name) // Track the saved composition name for display
				setShowSaveModal(false)
				setOpenModalRefresh(prev => prev + 1) // Refresh compositions list
				// Clear draft since this is now a saved composition
				localStorage.removeItem(DRAFT_STORAGE_KEY)
				onShowToast?.(`Composition "${saved.name}" saved successfully!`, 'success')
			}
		} catch (error) {
			console.error('Error saving composition:', error)
			onShowToast?.('Error saving composition. Please try again.', 'error')
		}
	}

	/**
	 * Handle open composition
	 */
	const handleOpenComposition = (composition: SavedComposition) => {
		setChords(composition.chords.map(chord => ({
			id: chord.id,
			chordId: chord.chordId,
			openStates: chord.openStates,
			beats: chord.beats
		})))
		setTempo(composition.tempo)
		setTimeSignature(composition.timeSignature)
		setLoadedCompositionId(composition.id) // Track that we have a loaded composition
		setLoadedCompositionName(composition.name) // Track the loaded composition name for display
		setSaveModalName(composition.name) // Pre-populate save modal name with composition name
		setShowOpenModal(false)
	}

	/**
	 * Handle adding a progression to the composer
	 */
	const handleAddProgression = (progression: SavedProgression) => {
		const newChords: ComposerChord[] = progression.chordIds.map(chordId => {
			const fingering = getFingeringForChord(chordId)
			const openStates = fingeringToOpenStates(fingering)
			return {
				id: `chord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				chordId,
				openStates,
				beats: 1
			}
		})
		setChords(prev => [...prev, ...newChords])
		setShowAddProgressionModal(false)
	}

	/**
	 * Handle delete progression
	 */
	const handleDeleteProgression = async (id: string, name: string) => {
		if (window.confirm(`Delete progression "${name}"?`)) {
			try {
				const success = await deleteProgression(id)
				if (success) {
					setProgressionModalRefresh(prev => prev + 1)
				}
			} catch (error) {
				console.error('Error deleting progression:', error)
				onShowToast?.('Error deleting progression. Please try again.', 'error')
			}
		}
	}

	/**
	 * Handle share progression
	 */
	const handleShareProgression = async (progression: SavedProgression) => {
		try {
			// Check if already shared
			const sharedProgressions = await loadSharedProgressions()
			const alreadyShared = sharedProgressions.some(
				s => s.originalId === progression.id
			)

			if (alreadyShared) {
				// Check if it needs to be updated (new version)
				const existing = sharedProgressions.find(s => s.originalId === progression.id)
				if (existing) {
					if (confirm(`"${progression.name}" is already shared. Share this updated version?`)) {
						await saveSharedProgression({
							originalId: progression.id,
							name: progression.name,
							chordIds: progression.chordIds,
							createdAt: progression.createdAt,
							isPublic: true
						}, true) // isUpdate = true creates new version
						onShowToast?.(`"${progression.name}" has been updated and shared in the Community!`, 'success')
					}
				} else {
					onShowToast?.(`"${progression.name}" is already shared in the Community!`, 'info')
				}
			} else {
				// Share for the first time
				await saveSharedProgression({
					originalId: progression.id,
					name: progression.name,
					chordIds: progression.chordIds,
					createdAt: progression.createdAt,
					isPublic: true
				}, false)
				onShowToast?.(`"${progression.name}" has been shared in the Community!`, 'success')
			}
		} catch (error) {
			console.error('Error sharing progression:', error)
			onShowToast?.('Error sharing progression. Please try again.', 'error')
		}
	}

	/**
	 * Handle delete composition
	 */
	const handleDeleteComposition = async (id: string, name: string) => {
		if (confirm(`Are you sure you want to delete "${name}"?`)) {
			try {
				const success = await deleteComposition(id)
				if (success) {
					// If the deleted composition was currently loaded, clear it
					if (loadedCompositionId === id) {
						setChords([])
						setLoadedCompositionId(null)
						setLoadedCompositionName('')
						setSaveModalName('')
					}
					setOpenModalRefresh(prev => prev + 1) // Force re-render of open modal list
					onShowToast?.(`Composition "${name}" deleted successfully`, 'success')
				} else {
					onShowToast?.('Failed to delete composition. Please try again.', 'error')
				}
			} catch (error) {
				console.error('Error deleting composition:', error)
				onShowToast?.('Error deleting composition. Please try again.', 'error')
			}
		}
	}

	/**
	 * Toggle selection of a composition
	 */
	const toggleCompositionSelection = (id: string) => {
		setSelectedCompositionIds(prev => {
			const newSet = new Set(prev)
			if (newSet.has(id)) {
				newSet.delete(id)
			} else {
				newSet.add(id)
			}
			return newSet
		})
	}

	/**
	 * Select/deselect all compositions
	 */
	const toggleSelectAllCompositions = () => {
		if (selectedCompositionIds.size === savedCompositions.length) {
			// Deselect all
			setSelectedCompositionIds(new Set())
		} else {
			// Select all
			setSelectedCompositionIds(new Set(savedCompositions.map(c => c.id)))
		}
	}

	/**
	 * Handle delete selected compositions
	 */
	const handleDeleteSelectedCompositions = async () => {
		const selectedIds = Array.from(selectedCompositionIds)
		const count = selectedIds.length
		
		if (count === 0) {
			onShowToast?.('No compositions selected.', 'info')
			return
		}
		
		const selectedCompositions = savedCompositions.filter(c => selectedIds.includes(c.id))
		const names = selectedCompositions.map(c => c.name).join(', ')
		
		if (confirm(`Are you sure you want to delete ${count} selected composition${count === 1 ? '' : 's'}?\n\n${names}\n\nThis action cannot be undone.`)) {
			try {
				let successCount = 0
				let failCount = 0
				
				// Delete selected compositions
				for (const id of selectedIds) {
					try {
						const comp = savedCompositions.find(c => c.id === id)
						console.log(`Attempting to delete composition: ${id} (${comp?.name || 'unknown'})`)
						const success = await deleteComposition(id)
						if (success) {
							successCount++
							console.log(`Successfully deleted composition: ${id}`)
						} else {
							failCount++
							console.warn(`Failed to delete composition: ${id} (${comp?.name || 'unknown'}) - deleteComposition returned false`)
						}
					} catch (error) {
						failCount++
						console.error(`Error deleting composition ${id}:`, error)
					}
				}
				
				// Small delay to ensure deletions are processed
				await new Promise(resolve => setTimeout(resolve, 100))
				
				// Clear the currently loaded composition if it was deleted
				if (loadedCompositionId && selectedIds.includes(loadedCompositionId)) {
					setChords([])
					setLoadedCompositionId(null)
					setLoadedCompositionName('')
					setSaveModalName('')
				}
				
				// Clear selections first
				setSelectedCompositionIds(new Set())
				
				// Filter out deleted compositions immediately
				const deletedIdsKey = 'deleted-composition-ids'
				const deletedIds = new Set(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
				const remainingComps = savedCompositions.filter(c => !selectedIds.includes(c.id) && !deletedIds.has(c.id))
				setSavedCompositions(remainingComps)
				
				// Wait a bit longer for Supabase to process
				await new Promise(resolve => setTimeout(resolve, 300))
				
				// Force reload of compositions via useEffect
				setOpenModalRefresh(prev => prev + 1)
				
				// Reload the compositions list multiple times to ensure we get fresh data
				let updatedCompositions = await loadCompositions()
				// Filter again to ensure deleted ones don't show up
				const filteredUpdated = updatedCompositions.filter(c => !deletedIds.has(c.id))
				setSavedCompositions(filteredUpdated)
				
				// Wait and reload again
				await new Promise(resolve => setTimeout(resolve, 200))
				updatedCompositions = await loadCompositions()
				const filteredUpdated2 = updatedCompositions.filter(c => !deletedIds.has(c.id))
				setSavedCompositions(filteredUpdated2)
				
				// Verify deletion worked (check filtered list)
				const remainingIds = filteredUpdated2.map(c => c.id)
				const stillPresent = selectedIds.filter(id => remainingIds.includes(id))
				
				if (stillPresent.length > 0) {
					console.warn(`Some compositions still appear after deletion: ${stillPresent.join(', ')}`)
					console.warn('They have been marked as deleted and should not appear on next reload')
					// Force another reload with filtering
					setTimeout(async () => {
						const recheckCompositions = await loadCompositions()
						const deletedIdsSet = new Set(JSON.parse(localStorage.getItem(deletedIdsKey) || '[]'))
						const filteredRecheck = recheckCompositions.filter(c => !deletedIdsSet.has(c.id))
						setSavedCompositions(filteredRecheck)
						const finalRemaining = filteredRecheck.map(c => c.id)
						const finalStillPresent = selectedIds.filter(id => finalRemaining.includes(id))
						if (finalStillPresent.length > 0) {
							console.error(`Still unable to hide: ${finalStillPresent.join(', ')}`)
							onShowToast?.(`Could not hide ${finalStillPresent.length} composition(s). They may be re-syncing from Supabase.`, 'error')
						}
					}, 1000)
				}
				
				if (failCount === 0 && stillPresent.length === 0) {
					onShowToast?.(`${successCount} composition${successCount === 1 ? '' : 's'} deleted successfully`, 'success')
				} else {
					onShowToast?.(`Deleted ${successCount} composition${successCount === 1 ? '' : 's'}, ${failCount + stillPresent.length} failed`, 'error')
				}
			} catch (error) {
				console.error('Error deleting selected compositions:', error)
				onShowToast?.('Error deleting compositions. Please try again.', 'error')
				// Still try to reload
				try {
					const updatedCompositions = await loadCompositions()
					setSavedCompositions(updatedCompositions)
					setOpenModalRefresh(prev => prev + 1)
				} catch (reloadError) {
					console.error('Error reloading compositions:', reloadError)
				}
			}
		}
	}

	/**
	 * Handle rename composition
	 */
	const handleRenameComposition = (id: string, currentName: string) => {
		setRenameCompositionId(id)
		setRenameCompositionName(currentName)
		setShowRenameModal(true)
	}

	const handleSaveRename = async () => {
		if (!renameCompositionId || !renameCompositionName.trim()) {
			return
		}

		try {
			const success = await updateComposition(renameCompositionId, { name: renameCompositionName.trim() })
			if (success) {
				// If the renamed composition is currently loaded, update the displayed name
				if (loadedCompositionId === renameCompositionId) {
					setLoadedCompositionName(renameCompositionName.trim())
					setSaveModalName(renameCompositionName.trim())
				}
				setOpenModalRefresh(prev => prev + 1) // Force re-render of open modal list
				setShowRenameModal(false)
				setRenameCompositionId(null)
				setRenameCompositionName('')
				onShowToast?.(`Composition renamed to "${renameCompositionName.trim()}"`, 'success')
			} else {
				onShowToast?.('Error renaming composition. Please try again.', 'error')
			}
		} catch (error) {
			console.error('Error renaming composition:', error)
			onShowToast?.('Error renaming composition. Please try again.', 'error')
		}
	}

	/**
	 * Handle share composition
	 */
	const handleShareComposition = async (composition: SavedComposition) => {
		try {
			// Check if already shared
			const sharedCompositions = await loadSharedCompositions()
			const alreadyShared = sharedCompositions.some(
				s => s.originalId === composition.id
			)

			if (alreadyShared) {
				// Check if it needs to be updated (new version)
				const existing = sharedCompositions.find(s => s.originalId === composition.id)
				if (existing) {
					if (confirm(`"${composition.name}" is already shared. Share this updated version?`)) {
						await saveSharedComposition({
							originalId: composition.id,
							name: composition.name,
							chords: composition.chords,
							tempo: composition.tempo,
							timeSignature: composition.timeSignature,
							fluteType: composition.fluteType,
							tuning: composition.tuning,
							createdAt: composition.createdAt,
							updatedAt: composition.updatedAt,
							isPublic: true
						}, true) // isUpdate = true creates new version
						onShowToast?.(`"${composition.name}" has been updated and shared in the Community!`, 'success')
					}
				} else {
					onShowToast?.(`"${composition.name}" is already shared in the Community!`, 'info')
				}
			} else {
				// Share for the first time
				await saveSharedComposition({
					originalId: composition.id,
					name: composition.name,
					chords: composition.chords,
					tempo: composition.tempo,
					timeSignature: composition.timeSignature,
					fluteType: composition.fluteType,
					tuning: composition.tuning,
					createdAt: composition.createdAt,
					updatedAt: composition.updatedAt,
					isPublic: true
				}, false)
				onShowToast?.(`"${composition.name}" has been shared in the Community!`, 'success')
			}
		} catch (error) {
			console.error('Error sharing composition:', error)
			onShowToast?.('Error sharing composition. Please try again.', 'error')
		}
	}

	/**
	 * Handle new composition - clear everything for a fresh start
	 */
	const handleNewComposition = () => {
		if (chords.length > 0 && !confirm('Are you sure you want to start a new composition? Any unsaved changes will be lost.')) {
			return
		}
		
		setChords([])
		setSelectedChordIndex(null)
		setLoadedCompositionId(null)
		setLoadedCompositionName(null)
		setSaveModalName('')
		setTempo(70)
		setTimeSignature('4/4')
		setMetronomeEnabled(false)
		setIsPlaying(false)
		setIsPaused(false)
		isPlayingRef.current = false
		isPausedRef.current = false
		setPausedChordIndex(null)
		setPausedDotIndex(null)
		if (metronomeIntervalRef.current !== null) {
			clearInterval(metronomeIntervalRef.current)
			metronomeIntervalRef.current = null
		}
		
		// Clear draft from localStorage
		localStorage.removeItem(DRAFT_STORAGE_KEY)
	}

	/**
	 * Handle pause playback
	 */
	const handlePause = () => {
		if (!isPlaying || isPaused) return
		
		// Store current position before stopping
		const currentChordIndex = playingChordIndex !== null ? playingChordIndex : 0
		const currentDotIndex = playingDotIndex !== null ? playingDotIndex : -1
		
		console.log(`Pausing at chord ${currentChordIndex}, dot ${currentDotIndex}`)
		
		simplePlayer.stopAll()
		isPlayingMetronomeRef.current = false
		if (metronomeIntervalRef.current !== null) {
			clearInterval(metronomeIntervalRef.current)
			metronomeIntervalRef.current = null
		}
		
		// Set selected chord to current position to maintain scroll position
		setSelectedChordIndex(currentChordIndex)
		
		setIsPaused(true)
		isPausedRef.current = true
		pausedChordIndexRef.current = currentChordIndex
		pausedDotIndexRef.current = currentDotIndex >= 0 ? currentDotIndex : null
		setPausedChordIndex(currentChordIndex)
		setPausedDotIndex(currentDotIndex >= 0 ? currentDotIndex : null)
		
		// Ensure scroll position stays at paused location
		setTimeout(() => {
			if (sequenceContainerRef.current) {
				const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
				if (cardElements[currentChordIndex]) {
					cardElements[currentChordIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
				}
			}
		}, 100)
	}

	/**
	 * Handle stop playback
	 */
	const handleStop = () => {
		// Stop all sounds immediately when stopping playback
		simplePlayer.stopAll()
		// Stop metronome immediately when stopping playback
		isPlayingMetronomeRef.current = false
		if (metronomeIntervalRef.current !== null) {
			clearInterval(metronomeIntervalRef.current)
			metronomeIntervalRef.current = null
		}
		// Clear loop state - user must re-enable if they want to loop next time
		isLoopingRef.current = false
		setIsLooping(false)
		setIsPlaying(false)
		setIsPaused(false)
		isPlayingRef.current = false
		isPausedRef.current = false
		// Jump back to the first card after stopping
		setSelectedChordIndex(0)
		setPlayingChordIndex(null)
		setPlayingDotIndex(null)
		pausedChordIndexRef.current = null
		pausedDotIndexRef.current = null
		setPausedChordIndex(null)
		setPausedDotIndex(null)
		
		// Scroll to the first card
		if (sequenceContainerRef.current && chords.length > 0) {
			const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
			if (cardElements[0]) {
				cardElements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
			}
		}
	}

	/**
	 * Toggle play/pause - if playing, pause; if paused or stopped, play/resume
	 */
	const handlePlayPause = async () => {
		console.log(`handlePlayPause: isPlaying=${isPlaying}, isPaused=${isPaused}, pausedChordIndex=${pausedChordIndex}`)
		
		// If currently playing (not paused), pause it
		if (isPlaying && !isPaused) {
			console.log('Calling handlePause')
			handlePause()
			return
		}

		// Otherwise, start or resume playback
		console.log('Calling handlePlay to start/resume')
		await handlePlay()
	}

	/**
	 * Play the composition (or resume if paused)
	 */
	const handlePlay = async () => {

		if (chords.length === 0) return

		// Resume from paused position if paused - check refs for immediate synchronous access
		let startIndex = 0
		let startDotIndex = 0
		console.log(`handlePlay: pausedChordIndexRef=${pausedChordIndexRef.current}, pausedDotIndexRef=${pausedDotIndexRef.current}, pausedChordIndex state=${pausedChordIndex}, pausedDotIndex state=${pausedDotIndex}`)
		const wasPaused = pausedChordIndexRef.current !== null && pausedChordIndexRef.current !== undefined
		
		if (wasPaused) {
			// Resume from paused position - use the stored indices from refs (synchronous)
			startIndex = pausedChordIndexRef.current!
			startDotIndex = pausedDotIndexRef.current !== null && pausedDotIndexRef.current !== undefined ? pausedDotIndexRef.current + 1 : 0
			console.log(`✓ Resuming from chord ${startIndex}, dot ${startDotIndex} (pausedDotIndexRef was ${pausedDotIndexRef.current})`)
			
			// Set selected chord to paused position and scroll to it before resuming
			setSelectedChordIndex(startIndex)
			setTimeout(() => {
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
					if (cardElements[startIndex]) {
						cardElements[startIndex].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}
			}, 50)
			
			// Clear paused state immediately using refs for immediate effect
			isPausedRef.current = false
			setIsPaused(false)
			
			// Ensure playing state is set
			isPlayingRef.current = true
			setIsPlaying(true)
			
			// Clear paused positions after capturing them
			// Don't clear them immediately - wait until after the loop starts
		} else {
			// Start fresh
			console.log(`✗ Starting fresh (not paused)`)
			startIndex = 0
			startDotIndex = 0
			isPlayingRef.current = true
			setIsPlaying(true)
			isPausedRef.current = false
			setIsPaused(false)
			pausedChordIndexRef.current = null
			pausedDotIndexRef.current = null
			setPausedChordIndex(null)
			setPausedDotIndex(null)

			// Ensure a chord is selected when starting playback
			if (selectedChordIndex === null) {
				setSelectedChordIndex(0)
			}
		}

		try {
			await simplePlayer.initAudio()
			
			const beatDurationMs = (60 / tempo) * 1000 // One beat in milliseconds
			const beatDurationSeconds = 60 / tempo // One beat in seconds
			
			// Clear paused positions now that we've started playback
			if (wasPaused) {
				pausedChordIndexRef.current = null
				pausedDotIndexRef.current = null
				setPausedChordIndex(null)
				setPausedDotIndex(null)
			}
			
			for (let i = startIndex; i < chords.length; i++) {
				// Check refs for immediate state (not React state which is async)
				if (!isPlayingRef.current || isPausedRef.current) {
					// Stop all sounds if playback was interrupted or paused
					simplePlayer.stopAll()
					break
				}

				const chord = chords[i]
				setSelectedChordIndex(i)
				setPlayingChordIndex(i)
				
				// Scroll to the active card to keep it visible
				if (sequenceContainerRef.current) {
					const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
					if (cardElements[i]) {
						cardElements[i].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
					}
				}

				if (chord.chordId !== null) {
					// Check if this is the last chord
					const isLastChord = i === chords.length - 1
					
					// Calculate duration based on number of beats
					// Add extra duration to the last chord (1 extra beat)
					let chordDuration = beatDurationSeconds * chord.beats
					if (isLastChord) {
						chordDuration += beatDurationSeconds // Add one extra beat for the last note
					}
					
					// Play the chord with the correct duration
					const notes = getNotesFromOpenStates(chord.openStates, fluteType)
					simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, chordDuration)
				}
				// For rests, just wait

				// Animate through each dot for this chord
				const dotStartIndex = (i === startIndex && startDotIndex > 0) ? startDotIndex : 0
				for (let dotIndex = dotStartIndex; dotIndex < chord.beats; dotIndex++) {
					if (!isPlayingRef.current || isPausedRef.current) {
						// Stop all sounds if playback was interrupted or paused
						simplePlayer.stopAll()
						break
					}
					
					setPlayingDotIndex(dotIndex)
					await new Promise(resolve => setTimeout(resolve, beatDurationMs))
				}
				
				setPlayingDotIndex(null)
				startDotIndex = 0 // Reset after first chord
			}

			// Check if looping is enabled - use ref for immediate state check
			// Only restart if playing and not paused
			if (isLoopingRef.current && isPlayingRef.current && !isPausedRef.current) {
				// Loop: continue playing from the beginning
				setSelectedChordIndex(0)
				setPlayingChordIndex(null)
				setPlayingDotIndex(null)
				// Restart the loop by calling handlePlay again
				// Use setTimeout to allow the current execution to finish
				setTimeout(() => {
					if (isPlayingRef.current && isLoopingRef.current && !isPausedRef.current) {
						handlePlay()
					}
				}, 100)
				return
			}
			
			// Stop all sounds when playback finishes
			simplePlayer.stopAll()
			// Stop metronome immediately when playback finishes (before setting isPlaying to false)
			// This prevents the metronome from playing one extra tick
			isPlayingMetronomeRef.current = false
			if (metronomeIntervalRef.current !== null) {
				clearInterval(metronomeIntervalRef.current)
				metronomeIntervalRef.current = null
			}
			
			// Set isPlaying to false after stopping metronome to ensure useEffect doesn't trigger another tick
			setIsPlaying(false)
			setIsPaused(false)
			isPlayingRef.current = false
			isPausedRef.current = false
			// Jump back to the first card after playback finishes
			setSelectedChordIndex(0)
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
			setPausedChordIndex(null)
			setPausedDotIndex(null)
			
			// Scroll to the first card
			if (sequenceContainerRef.current && chords.length > 0) {
				const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
				if (cardElements[0]) {
					cardElements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
				}
			}
		} catch (error) {
			console.error('Error playing composition:', error)
			// Stop all sounds on error
			simplePlayer.stopAll()
			// Stop metronome on error
			isPlayingMetronomeRef.current = false
			if (metronomeIntervalRef.current !== null) {
				clearInterval(metronomeIntervalRef.current)
				metronomeIntervalRef.current = null
			}
			setIsPlaying(false)
			setIsPaused(false)
			isPlayingRef.current = false
			isPausedRef.current = false
			// Jump back to the first card on error as well
			setSelectedChordIndex(0)
			setPlayingChordIndex(null)
			setPlayingDotIndex(null)
			setPausedChordIndex(null)
			setPausedDotIndex(null)
			
			// Scroll to the first card
			if (sequenceContainerRef.current && chords.length > 0) {
				const cardElements = sequenceContainerRef.current.querySelectorAll('.composer-timeline-item')
				if (cardElements[0]) {
					cardElements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
				}
			}
		}
	}

	/**
	 * Navigate to previous chord
	 */
	const handlePrevious = async () => {
		if (chords.length === 0) return
		const currentIndex = selectedChordIndex !== null ? selectedChordIndex : 0
		if (currentIndex > 0) {
			const newIndex = currentIndex - 1
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
		 			await handleChordClick(chord)
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

	/**
	 * Navigate to next chord
	 */
	const handleNext = async () => {
		if (chords.length === 0) return
		const currentIndex = selectedChordIndex !== null ? selectedChordIndex : -1
		if (currentIndex < chords.length - 1) {
			const newIndex = currentIndex + 1
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
					await handleChordClick(chord)
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

	/**
	 * Play a single chord when clicked
	 */
	const handleChordClick = async (chord: ComposerChord) => {
		if (chord.chordId === null) return // Rests don't play
		
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
			
			const notes = getNotesFromOpenStates(chord.openStates, fluteType)
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning)
		} catch (error) {
			console.error('Error playing chord:', error)
		}
	}


	/**
	 * Play a metronome tick sound
	 */
	const playMetronomeTick = (isAccent: boolean = false) => {
		try {
			// Get the AudioContext from simplePlayer (should already be initialized)
			const audioContext = simplePlayer.getAudioContext()
			if (!audioContext) {
				console.warn('AudioContext not available for metronome')
				return
			}

			// Note: AudioContext should already be running after toggleMetronome initialization
			// We don't check state here to keep it synchronous and avoid async issues

			// Create oscillator for tick sound
			const oscillator = audioContext.createOscillator()
			const gainNode = audioContext.createGain()

			// Different frequencies for accent vs regular tick
			if (isAccent) {
				oscillator.frequency.value = 800 // Higher pitch for accent (downbeat)
			} else {
				oscillator.frequency.value = 600 // Lower pitch for regular tick
			}

			oscillator.type = 'sine'

			// Envelope for click sound (quick attack and decay)
			const now = audioContext.currentTime
			gainNode.gain.setValueAtTime(0, now)
			gainNode.gain.linearRampToValueAtTime(isAccent ? 0.3 : 0.2, now + 0.001)
			gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

			oscillator.connect(gainNode)
			gainNode.connect(audioContext.destination)

			oscillator.start(now)
			oscillator.stop(now + 0.1)
		} catch (error) {
			console.error('Error playing metronome tick:', error)
		}
	}

	/**
	 * Toggle metronome on/off
	 */
	const toggleMetronome = () => {
		// Just toggle the enabled state - metronome will only play when isPlaying is true
		setMetronomeEnabled(!metronomeEnabled)
	}

	// Adjust chord beats when time signature changes to 3/4
	useEffect(() => {
		if (timeSignature === '3/4') {
			const hasChordsWithMoreThan3Beats = chords.some(chord => chord.beats > 3)
			if (hasChordsWithMoreThan3Beats) {
				const updatedChords = chords.map(chord => ({
					...chord,
					beats: Math.min(chord.beats, 3) // Cap at 3 beats for 3/4 time
				}))
				setChords(updatedChords)
			}
		}
	}, [timeSignature]) // Only run when timeSignature changes

	// Auto-select first chord when chords array changes and nothing is selected
	useEffect(() => {
		if (chords.length > 0 && selectedChordIndex === null) {
			setSelectedChordIndex(0)
		} else if (chords.length === 0) {
			setSelectedChordIndex(null)
		} else if (selectedChordIndex !== null && selectedChordIndex >= chords.length) {
			setSelectedChordIndex(chords.length - 1)
		}
	}, [chords.length])

	// Start metronome only when enabled AND playing
	useEffect(() => {
		if (metronomeEnabled && isPlaying) {
			const beatsPerMeasure = timeSignature === '3/4' ? 3 : 4
			const beatDuration = (60 / tempo) * 1000
			let beatCount = 0

			const tick = () => {
				// Check if we should still be playing before each tick
				if (!isPlayingMetronomeRef.current || !isPlayingRef.current) {
					return
				}
				const isAccent = beatCount === 0
				playMetronomeTick(isAccent)
				beatCount = (beatCount + 1) % beatsPerMeasure
			}

			// Clear existing interval if any
			if (metronomeIntervalRef.current !== null) {
				clearInterval(metronomeIntervalRef.current)
			}

			// Mark that metronome should be playing
			isPlayingMetronomeRef.current = true

			// Start metronome - play first tick immediately
			tick()
			
			// Then set interval for subsequent ticks
			metronomeIntervalRef.current = window.setInterval(tick, beatDuration)
		} else {
			// Stop metronome if disabled or not playing
			isPlayingMetronomeRef.current = false
			if (metronomeIntervalRef.current !== null) {
				clearInterval(metronomeIntervalRef.current)
				metronomeIntervalRef.current = null
			}
		}

		// Cleanup on unmount
		return () => {
			isPlayingMetronomeRef.current = false
			if (metronomeIntervalRef.current !== null) {
				clearInterval(metronomeIntervalRef.current)
				metronomeIntervalRef.current = null
			}
		}
	}, [metronomeEnabled, isPlaying, tempo, timeSignature])

	// Update current user when auth changes
	useEffect(() => {
		const checkUser = () => {
			setCurrentUser(getCurrentUser())
		}
		checkUser()
		// Listen for storage changes (auth state changes)
		const handleStorageChange = () => {
			checkUser()
		}
		window.addEventListener('storage', handleStorageChange)
		return () => {
			window.removeEventListener('storage', handleStorageChange)
		}
	}, [])

	return (
		<div className="composer-view">
			{/* Description with info button */}
			<div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
				<p className="composer-description" style={{ flex: 1, margin: 0 }}>
				Create your composition: add chords, adjust rhythm with +/-, drag to reorder. Set time signature, tempo, and metronome. Press Play to hear it.
			</p>
				<button 
					className="section-info-btn"
					onClick={() => onShowInfo?.()}
					aria-label="Composer information"
					title="Composer information"
					style={{ marginTop: '4px', flexShrink: 0 }}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
						<circle cx="12" cy="12" r="10"></circle>
						<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
						<line x1="12" y1="17" x2="12.01" y2="17"></line>
					</svg>
				</button>
			</div>

			{/* Playback Settings - All on one line */}
			<div className="composer-controls" style={{ marginBottom: '16px' }}>
				<div style={{ 
					display: 'flex', 
					alignItems: 'center', 
					gap: '6px', 
					flexWrap: 'nowrap',
					width: '100%'
				}}>
					{/* Tempo Control - Extended slider */}
					<div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, flexShrink: 0, height: '100%', minWidth: 0 }}>
						<span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap', lineHeight: '1', flexShrink: 0 }}>Tempo:</span>
					<input
						type="range"
						min="10"
						max="120"
						value={tempo}
						onChange={(e) => setTempo(Number(e.target.value))}
						className="tempo-slider"
						disabled={isPlaying}
							style={{ width: '100%', margin: 0, flex: 1, minWidth: 0 }}
					/>
						<span style={{ fontSize: '10px', fontWeight: 'var(--font-weight-semibold)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: '28px', lineHeight: '1' }}>{tempo}</span>
					</div>

					{/* Time Signature - Compact but readable */}
					<select
						className="btn-sm"
						value={timeSignature}
						onChange={(e) => setTimeSignature(e.target.value as '3/4' | '4/4')}
						disabled={isPlaying}
						style={{
							flexShrink: 0,
							minWidth: '80px',
							width: '80px'
						}}
					>
						<option value="3/4">3/4</option>
						<option value="4/4">4/4</option>
					</select>

					{/* Metronome - Compact but readable */}
					<button 
						className={`btn-sm ${metronomeEnabled ? 'is-active' : ''}`}
						onClick={toggleMetronome}
						disabled={isPlaying}
						title={metronomeEnabled ? 'Metronome Off' : 'Metronome On'}
						style={{ 
							flexShrink: 0,
							minWidth: '140px',
							width: '140px',
							whiteSpace: 'nowrap'
						}}
					>
						{metronomeEnabled ? 'Metronome Off' : 'Metronome On'}
					</button>
				</div>
				</div>

			{/* Add Content Buttons */}
			<div className="composer-controls" style={{ marginBottom: '16px' }}>
				<div className="tabs" style={{ marginBottom: 0 }}>
					<button 
						className="btn-sm tab" 
						onClick={() => setShowChordSelector(true)}
						disabled={isPlaying}
						title="Add Chord"
					>
						Add Chord
					</button>
					<button
						className="btn-sm tab"
						onClick={() => setShowAddProgressionModal(true)}
						disabled={isPlaying}
						title="Add Progression"
					>
						Add Progression
					</button>
					<button 
						className="btn-sm tab" 
						onClick={handleAddRest}
						disabled={isPlaying}
						title="Add Rest"
					>
						<span className="add-rest-icon">
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '6px' }}>
								<circle cx="8" cy="8" r="6"/>
							</svg>
						</span>
						Add Rest
					</button>
				</div>
			</div>

			{/* Composition Title (if loaded) - Above the cards */}
			{loadedCompositionName && (
				<div style={{
					marginBottom: '16px',
					fontSize: '18px',
					fontWeight: '600',
					color: '#000000',
					textAlign: 'center'
				}}>
					{loadedCompositionName}
				</div>
			)}

				{chords.length === 0 ? (
					<div className="composer-empty">
					<div className="composer-empty-card-placeholder"></div>
						<p>Your composition is empty. Add chords from the Library to get started.</p>
					</div>
				) : (
				<>
					{/* Main Large Card with Rhythm Dots Above */}
					<div className="composer-main-card-container">
						{/* Rhythm Dots Above Main Card */}
						{(() => {
							// Use playingChordIndex during playback, otherwise use selectedChordIndex
							const activeIndex = playingChordIndex !== null ? playingChordIndex : selectedChordIndex
							return activeIndex !== null && activeIndex < chords.length ? (
								<div className="composer-main-rhythm-dots">
									{Array.from({ length: chords[activeIndex].beats }).map((_, dotIndex) => {
										const isActive = playingChordIndex === activeIndex && playingDotIndex === dotIndex
										return (
											<span 
												key={dotIndex} 
												className={`composer-rhythm-dot ${isActive ? 'is-active' : ''}`}
											></span>
										)
									})}
								</div>
							) : null
						})()}

						{/* Main Large Chord Card - Always visible */}
						<div className="composer-main-card">
							{(() => {
								// Use playingChordIndex during playback, otherwise use selectedChordIndex
								const activeIndex = playingChordIndex !== null ? playingChordIndex : selectedChordIndex
								return activeIndex !== null && activeIndex < chords.length ? (
									chords[activeIndex].chordId === null ? (
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
											value={String(chords[activeIndex].chordId)}
											openStates={chords[activeIndex].openStates}
											fluteType={fluteType}
											onPlay={() => handleChordClick(chords[activeIndex])}
											hideNotes={false}
											hideChordNumber={false}
											fluid={true}
											pixelSize={180}
										/>
									)
								) : (
									<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
										<span style={{ fontSize: '14px', color: 'var(--color-black)' }}>Select a chord</span>
									</div>
								)
							})()}
						</div>
					</div>

					{/* Timeline with Small Cards Below */}
					<div className="composer-timeline-container">
						<div className="composer-timeline" ref={sequenceContainerRef}>
						{chords.map((chord, index) => (
							<div 
								key={chord.id} 
									className={`composer-timeline-item ${selectedChordIndex === index ? 'is-selected' : ''} ${playingChordIndex === index ? 'is-playing' : ''} ${draggedIndex === index ? 'is-dragging' : ''} ${dragOverIndex === index ? 'is-drag-over' : ''}`}
								draggable={!isPlaying}
								onDragStart={(e) => handleDragStart(e, index)}
								onDragOver={(e) => handleDragOver(e, index)}
								onDragLeave={handleDragLeave}
								onDrop={(e) => handleDrop(e, index)}
								onDragEnd={handleDragEnd}
									onClick={() => {
										if (draggedIndex === null) {
											setSelectedChordIndex(index)
											handleChordClick(chord)
										}
									}}
									onTouchStart={async (e) => {
										// iOS touch event handler - ensure audio plays on tap
										// Must initialize audio synchronously in touch handler for iOS
										if (draggedIndex === null && chord.chordId !== null) {
											e.preventDefault()
											setSelectedChordIndex(index)
											// Call handleChordClick directly to ensure audio initialization happens in touch handler
											await handleChordClick(chord)
										}
									}}
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

									{/* Small Chord Card or Rest */}
									<div className={`composer-timeline-chord ${chord.chordId === null ? 'is-rest' : ''}`}>
									{chord.chordId === null ? (
											<div className="composer-timeline-rest">
											<svg 
												viewBox="0 0 120 120" 
													width="60" 
													height="60"
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
											onClick={() => handleChordClick(chord)}
											hideNotes={false}
											hideChordNumber={false}
											fluid={true}
												pixelSize={60}
										/>
									)}
								</div>

								{/* Beats Control */}
									<div className="composer-timeline-beats-control">
									<button
										className="composer-beats-btn"
											onClick={(e) => {
												e.stopPropagation()
												handleUpdateBeats(index, chord.beats - 1)
											}}
										disabled={chord.beats <= 1}
									>
										−
									</button>
									<button
										className="composer-beats-btn"
											onClick={(e) => {
												e.stopPropagation()
												handleUpdateBeats(index, chord.beats + 1)
											}}
											disabled={chord.beats >= (timeSignature === '3/4' ? 3 : 4)}
									>
										+
									</button>
								</div>

								{/* Duplicate Button */}
								<button
									className="composer-timeline-duplicate-btn"
									onClick={(e) => {
										e.stopPropagation()
										handleDuplicateChord(index)
									}}
									title="Duplicate"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
										<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
										<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
									</svg>
								</button>

								{/* Remove Button */}
								<button
										className="composer-timeline-remove-btn"
										onClick={(e) => {
											e.stopPropagation()
											handleRemoveChord(index)
										}}
									title="Remove"
								>
									×
								</button>
							</div>
						))}
					</div>
			</div>
				</>
			)}

			{/* Play/Pause/Stop Buttons - Above New, Save, Open */}
			<div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: '12px', marginBottom: '8px' }}>
				<button
					className="btn-sm" 
					onClick={handlePrevious}
					disabled={chords.length === 0 || (selectedChordIndex !== null ? selectedChordIndex === 0 : true) || isPlaying}
					title="Previous"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
						<polyline points="11 17 6 12 11 7"></polyline>
						<polyline points="18 17 13 12 18 7"></polyline>
					</svg>
				</button>
				<button
					className={`btn-sm ${isPlaying && !isPaused ? 'is-active' : ''}`} 
					onClick={handlePlayPause}
					disabled={chords.length === 0}
					title={isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Play'}
				>
					{isPlaying && !isPaused ? (
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
							<rect x="6" y="4" width="4" height="16"></rect>
							<rect x="14" y="4" width="4" height="16"></rect>
						</svg>
					) : (
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
							<polygon points="5 3 19 12 5 21 5 3"></polygon>
						</svg>
					)}
				</button>
				<button
					className="btn-sm"
					onClick={handleStop}
					disabled={chords.length === 0 || !isPlaying}
					title="Stop"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
						<rect x="6" y="6" width="12" height="12"></rect>
					</svg>
				</button>
				<button
					className="btn-sm"
					onClick={handleNext}
					disabled={chords.length === 0 || (selectedChordIndex !== null ? selectedChordIndex === chords.length - 1 : true) || isPlaying}
					title="Next"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
						<polyline points="13 17 18 12 13 7"></polyline>
						<polyline points="6 17 11 12 6 7"></polyline>
					</svg>
				</button>
				<button
					className={`btn-sm ${isLooping ? 'is-active' : ''}`}
					onClick={() => {
						const newLoopingState = !isLooping
						isLoopingRef.current = newLoopingState
						setIsLooping(newLoopingState)
					}}
					disabled={chords.length === 0}
					title={isLooping ? 'Loop Enabled' : 'Loop Disabled'}
					style={{ marginLeft: 'var(--space-3)' }}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px' }}>
						<path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
					</svg>
				</button>
			</div>
			{/* Composition Management - Below the composition */}
			<div style={{ marginBottom: '8px' }}>
				<div className="tabs" style={{ marginBottom: 0 }}>
				<button 
						className="btn-sm tab" 
						onClick={handleNewComposition}
						disabled={isPlaying}
						title="Clear Composition"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Clear
				</button>
				<button 
						className="btn-sm tab" 
						onClick={() => {
							if (loadedCompositionId) {
								const comp = savedCompositions.find(c => c.id === loadedCompositionId)
								if (comp) {
									setSaveModalName(comp.name)
								}
							}
							setShowSaveModal(true)
						}}
					disabled={chords.length === 0}
						title="Save Composition"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
							<polyline points="17 21 17 13 7 13 7 21"></polyline>
							<polyline points="7 3 7 8 15 8"></polyline>
						</svg>
						Save
				</button>
				<button 
						className="btn-sm tab" 
					onClick={() => setShowOpenModal(true)}
						title="Open Composition"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px', marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="17 8 12 3 7 8"></polyline>
							<line x1="12" y1="3" x2="12" y2="15"></line>
						</svg>
						Open
					</button>
				</div>
			</div>

			{/* Save Modal */}
			{showSaveModal && (
				<div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">{loadedCompositionId ? 'Save Composition' : 'Save Composition'}</h2>
						</div>
						<div className="modal-body">
							<input
								type="text"
								className="modal-input"
								placeholder="Enter composition name"
								value={saveModalName}
								onChange={(e) => setSaveModalName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleSaveComposition()
									} else if (e.key === 'Escape') {
										setShowSaveModal(false)
									}
								}}
								autoFocus
							/>
						</div>
						<div className="modal-footer">
							<button className="btn-sm" onClick={() => setShowSaveModal(false)}>
								Cancel
							</button>
							<button 
								className="btn-sm is-active" 
								onClick={handleSaveComposition}
								disabled={!saveModalName.trim()}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Open Modal */}
			{showOpenModal && (
				<div className="modal-overlay" onClick={() => {
					setShowOpenModal(false)
					setSelectedCompositionIds(new Set()) // Clear selections when closing
				}}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
							<h2 className="modal-title">Open Composition</h2>
							{savedCompositions.length > 0 && (
								<div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
									<button
										className="icon-btn-sm"
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											setCompositionSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')
										}}
										title={compositionSortOrder === 'newest' ? 'Show oldest first' : 'Show newest first'}
										style={{ 
											padding: '6px',
											background: 'transparent',
											border: 'var(--border-2) solid var(--color-black)',
											borderRadius: 'var(--radius-2)',
											cursor: 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center'
										}}
									>
										<svg 
											viewBox="0 0 24 24" 
											fill="none" 
											stroke="currentColor" 
											strokeWidth="2" 
											strokeLinecap="round" 
											strokeLinejoin="round" 
											width="16" 
											height="16"
										>
											{compositionSortOrder === 'newest' ? (
												// Arrow pointing down (newest first)
												<polyline points="6 9 12 15 18 9"></polyline>
											) : (
												// Arrow pointing up (oldest first)
												<polyline points="18 15 12 9 6 15"></polyline>
											)}
										</svg>
									</button>
									<button
										className="btn-sm"
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											toggleSelectAllCompositions()
										}}
										style={{ 
											fontSize: 'var(--font-size-sm)',
											padding: 'var(--space-1) var(--space-2)',
											background: 'transparent',
											border: 'var(--border-2) solid var(--color-black)',
											color: 'var(--color-black)',
											cursor: 'pointer'
										}}
										title={selectedCompositionIds.size === savedCompositions.length ? 'Deselect all' : 'Select all'}
									>
										{selectedCompositionIds.size === savedCompositions.length ? 'Deselect All' : 'Select All'}
									</button>
									{selectedCompositionIds.size > 0 && (
										<button
											className="btn-sm"
											onClick={async (e) => {
												e.preventDefault()
												e.stopPropagation()
												await handleDeleteSelectedCompositions()
											}}
											style={{ 
												fontSize: 'var(--font-size-sm)',
												padding: 'var(--space-1) var(--space-2)',
												background: 'var(--color-black)',
												border: 'var(--border-2) solid var(--color-black)',
												color: 'var(--color-white)',
												cursor: 'pointer'
											}}
											title={`Delete ${selectedCompositionIds.size} selected composition${selectedCompositionIds.size === 1 ? '' : 's'}`}
										>
											Delete Selected ({selectedCompositionIds.size})
										</button>
									)}
								</div>
							)}
						</div>
						<div className="modal-body">
							{savedCompositions.length === 0 ? (
								<p style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'rgba(0, 0, 0, 0.6)' }}>
									No saved compositions yet. Save your first composition to get started!
								</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '400px', overflowY: 'auto' }} key={openModalRefresh}>
									{[...savedCompositions].sort((a, b) => {
										// Sort by createdAt (most recent first or oldest first)
										const aTime = a.createdAt || 0
										const bTime = b.createdAt || 0
										return compositionSortOrder === 'newest' 
											? bTime - aTime // Newest first (descending)
											: aTime - bTime // Oldest first (ascending)
									}).map((composition) => (
										<div 
											key={composition.id} 
											style={{ 
												display: 'flex', 
												justifyContent: 'space-between', 
												alignItems: 'center',
												padding: 'var(--space-2)',
												border: 'var(--border-2) solid var(--color-black)',
												borderRadius: 'var(--radius-2)',
												cursor: 'pointer',
												transition: 'background 0.2s ease',
												backgroundColor: selectedCompositionIds.has(composition.id) ? 'rgba(0, 0, 0, 0.1)' : 'transparent'
											}}
											onClick={() => handleOpenComposition(composition)}
											onMouseEnter={(e) => {
												if (!selectedCompositionIds.has(composition.id)) {
													e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
												}
											}}
											onMouseLeave={(e) => {
												if (!selectedCompositionIds.has(composition.id)) {
													e.currentTarget.style.background = 'transparent'
												} else {
													e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'
												}
											}}
										>
											<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
												<div
													onClick={(e) => {
														e.stopPropagation()
														toggleCompositionSelection(composition.id)
													}}
													style={{
														width: '18px',
														height: '18px',
														cursor: 'pointer',
														flexShrink: 0,
														border: '2px solid var(--color-black)',
														borderRadius: '2px',
														backgroundColor: selectedCompositionIds.has(composition.id) ? 'var(--color-black)' : 'var(--color-white)',
														position: 'relative',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center'
													}}
												>
													{selectedCompositionIds.has(composition.id) && (
														<svg 
															width="12" 
															height="12" 
															viewBox="0 0 12 12" 
															fill="none" 
															stroke="var(--color-white)" 
															strokeWidth="2" 
															strokeLinecap="round" 
															strokeLinejoin="round"
															style={{ pointerEvents: 'none' }}
														>
															<polyline points="2 6 5 9 10 2"></polyline>
														</svg>
													)}
												</div>
												<div>
													<div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
														{composition.name}
													</div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.6)' }}>
														{composition.chords.length} {composition.chords.length === 1 ? 'chord' : 'chords'} • {composition.tempo} BPM • {composition.timeSignature}
													</div>
												</div>
											</div>
											<div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
												{currentUser && isAdmin(currentUser) && (
													<button
														className="icon-btn-sm"
														onClick={(e) => {
															e.stopPropagation()
															// Set the composition as loaded first
															handleOpenComposition(composition)
															// Then show the add to lessons modal
															setTimeout(() => {
																setShowAddToLessonsModal(true)
															}, 100)
														}}
														title="Add to Lessons (Admin)"
														style={{ 
															width: '28px',
															height: '28px',
															border: '2px solid #dc2626',
															borderRadius: '50%',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															background: '#fff',
															color: '#dc2626',
															cursor: 'pointer',
															flexShrink: 0
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.background = '#dc2626'
															e.currentTarget.style.color = '#fff'
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.background = '#fff'
															e.currentTarget.style.color = '#dc2626'
														}}
													>
														<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', display: 'block' }}>
															<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
															<polyline points="14 2 14 8 20 8"></polyline>
															<line x1="12" y1="18" x2="12" y2="12"></line>
															<line x1="9" y1="15" x2="15" y2="15"></line>
														</svg>
													</button>
												)}
												<button
													className="icon-btn-sm"
													onClick={(e) => {
														e.stopPropagation()
														handleShareComposition(composition)
													}}
													title="Share to Community"
													style={{ 
														width: '28px',
														height: '28px',
														border: '2px solid #000',
														borderRadius: '50%',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														background: '#fff',
														cursor: 'pointer',
														flexShrink: 0
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.background = '#000'
														e.currentTarget.style.color = '#fff'
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.background = '#fff'
														e.currentTarget.style.color = '#000'
													}}
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', display: 'block' }}>
														<circle cx="18" cy="5" r="3"></circle>
														<circle cx="6" cy="12" r="3"></circle>
														<circle cx="18" cy="19" r="3"></circle>
														<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
														<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
													</svg>
												</button>
												<button
													className="icon-btn-sm"
													onClick={(e) => {
														e.stopPropagation()
														handleRenameComposition(composition.id, composition.name)
													}}
													title="Rename"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
													</svg>
												</button>
											<button
												className="icon-btn-sm"
												onClick={(e) => {
													e.stopPropagation()
													handleDeleteComposition(composition.id, composition.name)
												}}
												title="Delete"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
													<line x1="18" y1="6" x2="6" y2="18"></line>
													<line x1="6" y1="6" x2="18" y2="18"></line>
												</svg>
											</button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
						<div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							{currentUser && isAdmin(currentUser) && savedCompositions.length > 0 && (
								<button 
									className="btn-sm" 
									onClick={async () => {
										if (confirm('⚠️ WARNING: This will delete ALL compositions. This cannot be undone!\n\nAre you absolutely sure?')) {
											try {
												const deleted = await deleteAllCompositions()
												onShowToast?.(`Deleted ${deleted} compositions`, 'success')
												setOpenModalRefresh(prev => prev + 1)
												setSavedCompositions([])
												setSelectedCompositionIds(new Set())
											} catch (error) {
												console.error('Error deleting all compositions:', error)
												onShowToast?.('Error deleting all compositions', 'error')
											}
										}
									}}
									style={{ 
										background: 'transparent',
										border: '2px solid #dc2626',
										color: '#dc2626'
									}}
								>
									Delete All Compositions
								</button>
							)}
							<button className="btn-sm" onClick={() => setShowOpenModal(false)}>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Rename Modal */}
			{showRenameModal && (
				<div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">Rename Composition</h2>
						</div>
						<div className="modal-body">
							<label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-weight-semibold)' }}>
								New Name
							</label>
							<input
								type="text"
								value={renameCompositionName}
								onChange={(e) => setRenameCompositionName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleSaveRename()
									} else if (e.key === 'Escape') {
										setShowRenameModal(false)
									}
								}}
								style={{
									width: '100%',
									padding: 'var(--space-2)',
									border: 'var(--border-2) solid var(--color-black)',
									borderRadius: 'var(--radius-2)',
									fontSize: 'var(--font-size-base)',
									fontFamily: 'inherit'
								}}
								autoFocus
							/>
						</div>
						<div className="modal-footer">
							<button className="btn-sm" onClick={() => setShowRenameModal(false)}>
								Cancel
							</button>
							<button 
								className="btn-sm is-active" 
								onClick={handleSaveRename}
								disabled={!renameCompositionName.trim()}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add Progression Modal */}
			{showAddProgressionModal && (
				<div className="modal-overlay" onClick={() => setShowAddProgressionModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">Add Progression</h2>
						</div>
						<div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }} key={progressionModalRefresh}>
							{savedProgressions.length === 0 ? (
								<p style={{ textAlign: 'center', color: 'rgba(0, 0, 0, 0.6)', padding: 'var(--space-4)' }}>
									No progressions saved yet. Save progressions in the Library.
								</p>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
									{savedProgressions.map((progression) => (
											<div
												key={progression.id}
												style={{
													display: 'flex',
													justifyContent: 'space-between',
													alignItems: 'center',
													padding: 'var(--space-2)',
													border: 'var(--border-2) solid var(--color-black)',
													borderRadius: 'var(--radius-2)',
													cursor: 'pointer',
													transition: 'background 0.2s ease'
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.background = 'transparent'
												}}
											>
												<div
													style={{ flex: 1 }}
													onClick={() => handleAddProgression(progression)}
												>
													<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
														{progression.name}
													</div>
													<div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.6)' }}>
														{progression.chordIds.length} chord{progression.chordIds.length !== 1 ? 's' : ''}
													</div>
												</div>
												<div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', flexShrink: 0 }}>
													<button
														className="icon-btn-sm"
														onClick={(e) => {
															e.stopPropagation()
															handleShareProgression(progression)
														}}
														title="Share to Community"
														style={{ 
															width: '28px',
															height: '28px',
															border: '2px solid #000',
															borderRadius: '50%',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															background: '#fff',
															cursor: 'pointer',
															flexShrink: 0
														}}
														onMouseEnter={(e) => {
															e.currentTarget.style.background = '#000'
															e.currentTarget.style.color = '#fff'
														}}
														onMouseLeave={(e) => {
															e.currentTarget.style.background = '#fff'
															e.currentTarget.style.color = '#000'
														}}
													>
														<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '16px', height: '16px', display: 'block' }}>
															<circle cx="18" cy="5" r="3"></circle>
															<circle cx="6" cy="12" r="3"></circle>
															<circle cx="18" cy="19" r="3"></circle>
															<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
															<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
														</svg>
													</button>
												<button
													className="icon-btn-sm"
													onClick={(e) => {
														e.stopPropagation()
														handleDeleteProgression(progression.id, progression.name)
													}}
													aria-label="Delete progression"
														title="Delete progression"
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
													</svg>
												</button>
												</div>
											</div>
									))}
								</div>
							)}
						</div>
						<div className="modal-footer">
							<button className="btn-sm" onClick={() => setShowAddProgressionModal(false)}>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Add to Lessons Modal */}
			{showAddToLessonsModal && loadedCompositionId && loadedCompositionName && (
				<AddToLessonsModal
					isOpen={showAddToLessonsModal}
					compositionId={loadedCompositionId}
					compositionName={loadedCompositionName}
					onClose={() => setShowAddToLessonsModal(false)}
					onSuccess={() => {
						// Refresh lessons if needed
						console.log('Lesson added successfully!')
					}}
				/>
			)}

			{/* Chord Selector Modal */}
			{showChordSelector && (
				<ChordSelectorModal
					fluteType={fluteType}
					tuning={tuning}
					onSelect={handleAddChord.current}
					onClose={() => setShowChordSelector(false)}
					favoriteChordIds={favoriteChordIds}
					onToggleFavorite={onToggleFavorite}
				/>
			)}
		</div>
	)
})

