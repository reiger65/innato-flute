import { useState, useRef, useEffect, useCallback } from 'react'
import { ChordCard } from './components/ChordCard'
import { DronePlayer } from './components/DronePlayer'
import { AboutPanel } from './components/AboutPanel'
import { LoginPanel } from './components/LoginPanel'
import { LessonModal } from './components/LessonModal'
import { ComposerView, type ComposerViewRef } from './components/ComposerView'
import { SectionInfoModal } from './components/SectionInfoModal'
import { CommunityView } from './components/CommunityView'
import { ManageLessonsModal } from './components/ManageLessonsModal'
import { ToastContainer, useToast } from './components/Toast'
import { fingeringToOpenStates, getFingeringForChord, getChordIdFromFingering } from './lib/chordMappings'
import { simplePlayer, type TuningFrequency } from './lib/simpleAudioPlayer'
import { type FluteType, getNoteForFingering, openStatesToFingering, getNotesFromOpenStates } from './lib/fluteData'
import { getCurrentUser, type User, isAdmin } from './lib/authService'
import { getSupabaseClient } from './lib/supabaseClient'
import { getLessonsWithProgress, getCompletedLessonCount, type Lesson } from './lib/lessonsService'
import { assignCompositionsToLessons } from './lib/lessonsData'
import { saveProgression, loadProgressions, deleteProgression, type SavedProgression } from './lib/progressionService'
import { saveSharedProgression, loadSharedProgressions } from './lib/sharedItemsStorage'
import { type SavedComposition } from './lib/compositionStorage'
import './styles/components.css'

/**
 * Main App Component - Stonewhistle Score Composer
 * 
 * Video URLs configuration
 * TODO: Add YouTube URLs from https://stonewhistle.com/instruments/innato/
 * Format: "https://www.youtube.com/watch?v=VIDEO_ID" or just "VIDEO_ID"
 * 
 * Structure:
 * - 'introduction': Instructional video (landscape/16:9)
 * - Flute tuning demos: Demo videos for each flute key (shorts/9:16, 2 per row)
 */
const videoUrls: Record<string, string | null> = {
	// Instructional video (landscape)
	'introduction': 'https://youtu.be/UB7Rv5rFhBY',
	
	// Flute tuning demos (shorts - portrait)
	'Em4': 'https://youtu.be/1ciwARw7Q4g',
	'D#m4': 'https://www.youtube.com/shorts/cnLucYtaFkI',
	'Dm4': 'https://www.youtube.com/shorts/_Mnh9rrospo',
	'C#m4': 'https://www.youtube.com/shorts/yt-BTtfBevc',
	'Cm4': 'https://www.youtube.com/shorts/xJ0vu_gYgA8',
	'Bm3': 'https://www.youtube.com/shorts/0BH6g7yxopY',
	'Bbm3': 'https://youtu.be/ZLSe47Tt2sg',
	'Am3': 'https://www.youtube.com/shorts/_LWSyErTekA',
	'G#m3': 'https://www.youtube.com/shorts/2WECRe48jOQ',
	'Gm3': 'https://youtu.be/63SQs6-yxGA',
	'F#m3': 'https://youtu.be/1_ACnwVoqnc',
	'Fm3': 'https://www.youtube.com/shorts/d-z9tTbmFOU',
	'Em3': 'https://www.youtube.com/shorts/f5mMpgZJd1g',
}

export default function App() {
	// App state
	const [fluteType, setFluteType] = useState<FluteType>('Cm4')
	const [tuning, setTuning] = useState<TuningFrequency>('440')
	const [currentChords, setCurrentChords] = useState([
		{ id: 33, openStates: fingeringToOpenStates(getFingeringForChord(33)) },
		{ id: 24, openStates: fingeringToOpenStates(getFingeringForChord(24)) },
		{ id: 15, openStates: fingeringToOpenStates(getFingeringForChord(15)) },
		{ id: 12, openStates: fingeringToOpenStates(getFingeringForChord(12)) }
	])
	const [isPlaying, setIsPlaying] = useState(false)
	const [showMeActive, setShowMeActive] = useState(false)
	const [currentShowIndex, setCurrentShowIndex] = useState(0)
	const [tempo, setTempo] = useState(30)
	const [activeView, setActiveView] = useState<'basics' | 'practice' | 'lessons' | 'advanced' | 'compose' | 'community'>('basics')
	const [activeSubTab, setActiveSubTab] = useState<'guide' | 'fingering' | 'video'>('guide')
	const [showSaveModal, setShowSaveModal] = useState(false)
	const [saveModalName, setSaveModalName] = useState('')
	const [showLibrary, setShowLibrary] = useState(false)
	const [showDrone, setShowDrone] = useState(false)
	const [showAbout, setShowAbout] = useState(false)
	const [showLogin, setShowLogin] = useState(false)
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [interactiveOpenStates, setInteractiveOpenStates] = useState<boolean[]>([false, false, false, false, false, false])
	const [selectedChordIds, setSelectedChordIds] = useState<number[]>([])
	const [favoriteChordIds, setFavoriteChordIds] = useState<number[]>([])
	const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
	const [lessons, setLessons] = useState<Lesson[]>([])
	const [showSaveProgressionModal, setShowSaveProgressionModal] = useState(false)
	const [progressionName, setProgressionName] = useState('')
	const [showManageProgressionsModal, setShowManageProgressionsModal] = useState(false)
	const [progressionModalRefresh, setProgressionModalRefresh] = useState(0)
	const [showManageLessonsModal, setShowManageLessonsModal] = useState(false)
	const [meditationIndex, setMeditationIndex] = useState(0)
	const [breathingIndex, setBreathingIndex] = useState(0)
	const [showPracticeInfo, setShowPracticeInfo] = useState(false)
	const [showComposeInfo, setShowComposeInfo] = useState(false)
	const [showLessonsInfo, setShowLessonsInfo] = useState(false)
	const [showAdvancedInfo, setShowAdvancedInfo] = useState(false)
	const [savedProgressions, setSavedProgressions] = useState<SavedProgression[]>([])
	const composerViewRef = useRef<ComposerViewRef>(null)
	const toast = useToast()
	
	// Refs for managing active state and autoplay
	const activeTimeoutRef = useRef<number | null>(null)
	const playbackTimeoutRefs = useRef<number[]>([])
	const showMeTimeoutRef = useRef<number | null>(null)
	const showMeActiveRef = useRef<boolean>(false)

	// Load favorites from localStorage on mount
	useEffect(() => {
		try {
			const saved = localStorage.getItem('innato-favorites')
			if (saved) {
				const parsed = JSON.parse(saved)
				if (Array.isArray(parsed)) {
					setFavoriteChordIds(parsed)
				}
			}
		} catch (error) {
			console.error('Error loading favorites:', error)
		}
	}, [])

	// Save favorites to localStorage whenever they change
	useEffect(() => {
		try {
			localStorage.setItem('innato-favorites', JSON.stringify(favoriteChordIds))
		} catch (error) {
			console.error('Error saving favorites:', error)
		}
	}, [favoriteChordIds])

	// Initialize user state on mount and listen for changes
	useEffect(() => {
		// Check Supabase configuration on mount
		const user = getCurrentUser()
		setCurrentUser(user)
		
		// Listen for Supabase auth state changes
		const supabase = getSupabaseClient()
		let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null
		
		if (supabase) {
			const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
				if (session?.user) {
					const user: User = {
						id: session.user.id,
						email: session.user.email || '',
						username: session.user.user_metadata?.username,
						role: session.user.user_metadata?.role,
						createdAt: new Date(session.user.created_at).getTime()
					}
					setCurrentUser(user)
				} else {
					setCurrentUser(null)
				}
			})
			authListener = { data: { subscription } }
		}
		
		// Listen for storage changes (login/logout from other tabs)
		const handleStorageChange = () => {
			const user = getCurrentUser()
			setCurrentUser(user)
		}
		
		window.addEventListener('storage', handleStorageChange)
		
		return () => {
			window.removeEventListener('storage', handleStorageChange)
			if (authListener?.data?.subscription) {
				authListener.data.subscription.unsubscribe()
			}
		}
	}, [])

	// Load lessons with progress (async - loads from Supabase)
	const loadLessons = useCallback(async () => {
		const lessonsWithProgress = await getLessonsWithProgress()
		setLessons(lessonsWithProgress)
	}, [])

	useEffect(() => {
		loadLessons()
		
		// Reload lessons periodically to catch localStorage changes
		// Increased to 5 seconds to prevent infinite loops
		const interval = setInterval(loadLessons, 5000)
		
		return () => clearInterval(interval)
	}, [loadLessons])

	// Load progressions on mount and when refresh triggers
	useEffect(() => {
		const loadProgs = async () => {
			try {
				const progs = await loadProgressions()
				setSavedProgressions(progs)
			} catch (error) {
				console.error('Error loading progressions:', error)
			}
		}
		loadProgs()
	}, [progressionModalRefresh])

	// Reload lessons when switching to lessons view and auto-assign compositions
	useEffect(() => {
		if (activeView === 'lessons') {
			// Auto-assign compositions to lessons
			assignCompositionsToLessons().catch((err: any) => console.error('Error assigning compositions:', err))
			loadLessons()
		}
	}, [activeView, loadLessons])

	/**
	 * Handle authentication state change
	 */
	const handleAuthChange = (user: User | null) => {
		setCurrentUser(user)
	}
	
	/**
	 * Convert YouTube URL to embed URL
	 */
	const getYouTubeEmbedUrl = (url: string | null | undefined): string | null => {
		if (!url) return null
		
		// Extract video ID from various YouTube URL formats
		const patterns = [
			/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
			/youtu\.be\/([a-zA-Z0-9_-]+)/,
			/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
			/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
		]
		
		for (const pattern of patterns) {
			const match = url.match(pattern)
			if (match && match[1]) {
				return `https://www.youtube.com/embed/${match[1]}`
			}
		}
		
		// If it's already an embed URL, return as is
		if (url.includes('youtube.com/embed/')) {
			return url
		}
		
		// If it's just a video ID, assume it's a video ID
		if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
			return `https://www.youtube.com/embed/${url}`
		}
		
		return null
	}

	/**
	 * Handle chord card click - plays audio and provides visual feedback
	 */
	const handleChordCardClick = async (
		notes: { left: string; right: string; front: string }, 
		chordId: number
	) => {
		try {
			await simplePlayer.initAudio()
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning)
			
			// Visual feedback - add active class to the clicked card
			updateCardActiveState(chordId)
			
			// Clear active state after 2 seconds
			if (activeTimeoutRef.current) {
				clearTimeout(activeTimeoutRef.current)
			}
			activeTimeoutRef.current = window.setTimeout(() => {
				updateCardActiveState(null)
			}, 2000)
		} catch (err) {
			console.error('Error playing chord:', err)
		}
	}
	
	/**
	 * Generate random chord IDs (1-64)
	 */
	const generateRandomChordIds = (count: number = 4): number[] => {
		const ids: number[] = []
		while (ids.length < count) {
			const randomId = Math.floor(Math.random() * 64) + 1
			if (!ids.includes(randomId)) {
				ids.push(randomId)
			}
		}
		return ids
	}

	/**
	 * Get notes for a chord ID
	 */
	const getNotesForChordId = (chordId: number) => {
		const fingering = getFingeringForChord(chordId)
		// Note: For left/right chambers, the naming is inverted in the physical flute
		// leftUpper is physically lower, leftLower is physically upper
		return {
			left: getNoteForFingering(fluteType, 'left', fingering.leftLower, fingering.leftUpper),
			right: getNoteForFingering(fluteType, 'right', fingering.rightLower, fingering.rightUpper),
			front: getNoteForFingering(fluteType, 'front', fingering.frontLeft, fingering.frontRight)
		}
	}

	/**
	 * Convert BPM to delay in milliseconds (assuming 1 beat per chord)
	 */
	const bpmToDelay = (bpm: number): number => {
		// BPM to seconds: 60 seconds / BPM = seconds per beat
		// Convert to milliseconds
		return (60 / bpm) * 1000
	}

	/**
	 * Helper function to update card active state
	 */
	const updateCardActiveState = (chordId: number | null) => {
			const grid = document.getElementById('chord-grid')
		if (!grid) return
		
				const cards = grid.querySelectorAll('.chord-card')
				cards.forEach(card => card.classList.remove('active'))
				
		if (chordId !== null) {
				const targetCard = Array.from(cards).find(card => {
					const svg = card.querySelector('svg')
					const textElement = svg?.querySelector('.fg-val')
					return textElement?.textContent === String(chordId)
				})
			
				if (targetCard) {
					targetCard.classList.add('active')
			}
		}
	}

	/**
	 * Play chord progression automatically
	 */
	const playChordProgression = async (chordIds: number[]) => {
		const delayMs = bpmToDelay(tempo)
		// Stop any ongoing playback
		stopPlayback()
		
		setIsPlaying(true)
		await simplePlayer.initAudio()

		for (let i = 0; i < chordIds.length; i++) {
			const chordId = chordIds[i]
			const notes = getNotesForChordId(chordId)
			const isLastChord = i === chordIds.length - 1
			
			// Visual feedback - highlight current card
			updateCardActiveState(chordId)

			// Play the chord - last chord gets longer duration (default 2s + 1 beat)
			const chordDuration = isLastChord ? 2.0 + (delayMs / 1000) : 2.0
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning, chordDuration)

			// Wait before next chord (except for last one)
			if (i < chordIds.length - 1) {
				const timeoutId = window.setTimeout(() => {
					// Remove active state before next chord
					updateCardActiveState(null)
				}, delayMs)
				playbackTimeoutRefs.current.push(timeoutId)
				
				await new Promise(resolve => setTimeout(resolve, delayMs))
			} else {
				// Last chord - remove active state after it finishes (with extra time for longer duration)
				const timeoutId = window.setTimeout(() => {
					updateCardActiveState(null)
					setIsPlaying(false)
				}, delayMs + 1000) // Extra second for the longer duration
				playbackTimeoutRefs.current.push(timeoutId)
			}
		}
	}

	/**
	 * Stop current playback
	 */
	const stopPlayback = () => {
		simplePlayer.stopAll()
		playbackTimeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId))
		playbackTimeoutRefs.current = []
		setIsPlaying(false)
		updateCardActiveState(null)
	}

	/**
	 * Handle shuffle button click
	 */
	const handleShuffle = () => {
		// Stop any current playback
		if (isPlaying) {
			stopPlayback()
		}
		
		const randomIds = generateRandomChordIds(4)
		const newChords = randomIds.map(id => ({
			id,
			openStates: fingeringToOpenStates(getFingeringForChord(id))
		}))
		setCurrentChords(newChords)
	}

	/**
	 * Handle play/stop button click
	 */
	const handlePlayStop = async () => {
		if (isPlaying) {
			stopPlayback()
		} else {
			// Play current chord progression
			const chordIds = currentChords.map(chord => chord.id)
			await playChordProgression(chordIds)
		}
	}

	/**
	 * Handle Save Progression - saves current chord configuration
	 */
	const handleSaveProgression = () => {
		if (!saveModalName.trim()) return
		
		// Get current chord IDs
		const chordIds = currentChords.map(c => c.id)
		
		// Create progression object
		const progression = {
			id: `progression-${Date.now()}`,
			name: saveModalName.trim(),
			chordIds: chordIds,
			tempo: tempo,
			fluteType: fluteType,
			tuning: tuning,
			createdAt: Date.now()
		}
		
		// TODO: Save to storage service (localStorage for now)
		// Load existing progressions from localStorage
		try {
			const existing = localStorage.getItem('innato-progressions')
			const progressions = existing ? JSON.parse(existing) : []
			progressions.push(progression)
			localStorage.setItem('innato-progressions', JSON.stringify(progressions))
			
			// Show success and close modal
			setShowSaveModal(false)
			setSaveModalName('')
			
			// TODO: Show success message to user (replace alert with better UI)
			alert(`Progression "${progression.name}" saved successfully!`)
		} catch (error) {
			console.error('Error saving progression:', error)
			alert('Error saving progression. Please try again.')
		}
	}

	/**
	 * Toggle interactive chord finder hole (for Library)
	 */
		const toggleInteractiveHole = async (index: number) => {
		try {
			const newStates = [...interactiveOpenStates]
			newStates[index] = !newStates[index]
			setInteractiveOpenStates(newStates)
			
			// Play sound immediately after toggling the hole
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
			
			const notes = getNotesFromOpenStates(newStates, fluteType)
			await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning)
		} catch (error) {
			console.error('Error in toggleInteractiveHole:', error)
		}
	}

	/**
	 * Get chord ID from current interactive open states
	 */
	const getInteractiveChordId = (): number => {
		const fingering = openStatesToFingering(interactiveOpenStates)
		return getChordIdFromFingering(fingering)
	}

	/**
	 * Handle saving chord from interactive finder
	 */
	const handleSaveInteractiveChord = () => {
		const chordId = getInteractiveChordId()
		// TODO: Save to favorites or show save modal
		alert(`Save chord #${chordId} (coming soon)`)
	}

	/**
	 * Toggle chord selection (for creating progressions)
	 */
	const toggleChordSelection = (chordId: number) => {
		setSelectedChordIds(prev => {
			if (prev.includes(chordId)) {
				return prev.filter(id => id !== chordId)
			} else {
				return [...prev, chordId]
			}
		})
	}

	/**
	 * Handle opening save progression modal
	 */
	const handleSaveSelectedProgression = () => {
		if (selectedChordIds.length < 2) {
			alert('Please select at least 2 chords')
			return
		}
		setProgressionName('')
		setShowSaveProgressionModal(true)
	}

	/**
	 * Handle saving progression with name
	 */
	const handleSaveProgressionConfirm = async () => {
		if (selectedChordIds.length < 2 || !progressionName.trim()) {
			return
		}
		
		try {
			// Save progression to local storage
			const saved = await saveProgression({
				name: progressionName.trim(),
				chordIds: selectedChordIds
			})
			
			// Automatically share progression to community when saved
			await saveSharedProgression({
				originalId: saved.id,
				name: saved.name,
				chordIds: saved.chordIds,
				createdAt: saved.createdAt,
				isPublic: true
			}, false)
			
			setSelectedChordIds([])
			setProgressionName('')
			setShowSaveProgressionModal(false)
			setProgressionModalRefresh(prev => prev + 1) // Refresh manage modal if open
			toast.showSuccess(`Progression "${saved.name}" saved successfully!`)
		} catch (error) {
			console.error('Error saving progression:', error)
			toast.showError('Error saving progression. Please try again.')
		}
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
					toast.showSuccess(`Progression "${name}" deleted successfully.`)
				} else {
					toast.showError('Failed to delete progression.')
				}
			} catch (error) {
				console.error('Error deleting progression:', error)
				toast.showError('Error deleting progression. Please try again.')
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
						toast.showSuccess(`"${progression.name}" has been updated and shared in the Community!`)
					}
				} else {
					toast.showInfo(`"${progression.name}" is already shared in the Community!`)
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
				toast.showSuccess(`"${progression.name}" has been shared in the Community!`)
			}
		} catch (error) {
			console.error('Error sharing progression:', error)
			toast.showError('Error sharing progression. Please try again.')
		}
	}

	/**
	 * Advanced Techniques Navigation Handlers
	 */
	const handleNextMeditation = () => {
		const max = 6 // 7 meditation techniques (0-6)
		if (meditationIndex < max) {
			setMeditationIndex(meditationIndex + 1)
		} else {
			setMeditationIndex(0)
		}
	}

	const handlePreviousMeditation = () => {
		const max = 6 // 7 meditation techniques (0-6)
		if (meditationIndex > 0) {
			setMeditationIndex(meditationIndex - 1)
		} else {
			setMeditationIndex(max)
		}
	}

	const handleNextBreathing = () => {
		const max = 5 // 6 breathing techniques (0-5)
		if (breathingIndex < max) {
			setBreathingIndex(breathingIndex + 1)
		} else {
			setBreathingIndex(0)
		}
	}

	const handlePreviousBreathing = () => {
		const max = 5 // 6 breathing techniques (0-5)
		if (breathingIndex > 0) {
			setBreathingIndex(breathingIndex - 1)
		} else {
			setBreathingIndex(max)
		}
	}

	/**
	 * Handle Show Me button click - shows cards one by one in full size and plays audio
	 */
	const handleShowMe = async () => {
		if (showMeActive) {
			// Stop show me
			if (showMeTimeoutRef.current) {
				clearTimeout(showMeTimeoutRef.current)
				showMeTimeoutRef.current = null
			}
			simplePlayer.stopAll()
			showMeActiveRef.current = false
			setShowMeActive(false)
			setCurrentShowIndex(0)
		} else {
			// Start show me
			showMeActiveRef.current = true
			setShowMeActive(true)
			setCurrentShowIndex(0)
			
			// Initialize audio first
			await simplePlayer.initAudio()
			
			// Cycle through cards and play audio
			const cycleThroughCards = async (index: number) => {
				if (!showMeActiveRef.current) return
				
				const chordId = currentChords[index].id
				const notes = getNotesForChordId(chordId)
				
				// Update visual
				setCurrentShowIndex(index)
				
				// Play the chord audio
				await simplePlayer.playChord(notes.left, notes.right, notes.front, tuning)
				
				// Move to next card after delay based on tempo
				const delayMs = bpmToDelay(tempo)
				if (index < currentChords.length - 1) {
					showMeTimeoutRef.current = window.setTimeout(() => {
						if (showMeActiveRef.current) {
							cycleThroughCards(index + 1)
						}
					}, delayMs)
				}
				// Last card - just stay on the last card, don't auto-hide
			}
			
			cycleThroughCards(0)
		}
	}

	/**
	 * Cleanup show me when component unmounts or chords change
	 */
	useEffect(() => {
		return () => {
			if (showMeTimeoutRef.current) {
				clearTimeout(showMeTimeoutRef.current)
			}
		}
	}, [])

	/**
	 * Reset show me when chords change
	 */
	useEffect(() => {
		showMeActiveRef.current = false
		setShowMeActive(false)
		setCurrentShowIndex(0)
		if (showMeTimeoutRef.current) {
			clearTimeout(showMeTimeoutRef.current)
			showMeTimeoutRef.current = null
		}
	}, [currentChords])

	/**
	 * Initialize audio lazily (only when needed, not on mount)
	 * This prevents AudioContext warnings on page load
	 */
	useEffect(() => {
		// Don't initialize audio on mount - let it initialize lazily when first needed
		// This prevents the "AudioContext was not allowed to start" warning
		
		return () => {
			if (activeTimeoutRef.current) {
				clearTimeout(activeTimeoutRef.current)
			}
			stopPlayback()
			simplePlayer.dispose()
		}
	}, [])

	/**
	 * Initialize audio when library panel opens to ensure clicks work immediately
	 */
	useEffect(() => {
		if (showLibrary) {
			simplePlayer.initAudio().catch(err => {
				console.error('Failed to initialize audio for library:', err)
			})
		}
	}, [showLibrary])
	
	/**
	 * Flute type options for dropdown
	 */
	const fluteTypeOptions: FluteType[] = [
		'Em4', 'D#m4', 'Dm4', 'C#m4', 'Cm4',
		'Bm3', 'Bbm3', 'Am3', 'G#m3', 'Gm3',
		'F#m3', 'Fm3', 'Em3'
	]
	
	return (
		<div className="app">
			<div className="phone">
				<div className="inner">
					{/* Floating Menu */}
					<div className="floating-menu">
						<button 
							className={`icon-btn-sm ${showLibrary ? 'is-active' : ''}`}
							aria-label="Music Notes"
							onClick={() => setShowLibrary(!showLibrary)}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M9 18V5l12-2v13"/>
								<circle cx="6" cy="18" r="3"/>
								<circle cx="18" cy="16" r="3"/>
							</svg>
						</button>
						<button 
							className={`icon-btn-sm ${showDrone ? 'is-active' : ''}`}
							aria-label="Audio Source"
							onClick={() => setShowDrone(!showDrone)}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
								<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
							</svg>
						</button>
						<button 
							className={`icon-btn-sm ${showAbout ? 'is-active' : ''}`}
							aria-label="About"
							onClick={() => setShowAbout(!showAbout)}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="10"/>
								<line x1="12" y1="16" x2="12" y2="12"/>
								<line x1="12" y1="8" x2="12.01" y2="8"/>
							</svg>
						</button>
						<button 
							className={`icon-btn-sm ${showLogin ? 'is-active' : ''}`}
							aria-label={currentUser ? 'Account' : 'Login'}
							onClick={() => setShowLogin(!showLogin)}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
								<circle cx="12" cy="7" r="4"/>
							</svg>
						</button>
					</div>

					{/* Toolbar */}
					<div className="toolbar">
						<div className="brand">
							<img src="/logo.jpg" alt="Stonewhistle" className="logo" />
							<div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
								<div>Stonewhistle</div>
								<div>INNATO Explorations</div>
							</div>
						</div>
						<div className="right">
							<div className="settings-group">
								<div className="settings-row">
									<label className="settings-label">Key:</label>
									<select 
										className="settings-select"
										value={fluteType}
										onChange={(e) => setFluteType(e.target.value as FluteType)}
									>
										{fluteTypeOptions.map(option => (
											<option key={option} value={option}>{option}</option>
										))}
									</select>
								</div>
								<div className="settings-row">
									<label className="settings-label">Pitch:</label>
									<select 
										className="settings-select"
										value={tuning}
										onChange={(e) => setTuning(e.target.value as TuningFrequency)}
									>
										<option value="440">440 Hz</option>
										<option value="432">432 Hz</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					{/* Tabs */}
					<div className="tabs">
						<button 
							className={`tab ${(activeView === 'basics' || activeView === 'practice' || activeView === 'lessons' || activeView === 'advanced') ? 'is-active' : ''}`}
							onClick={() => {
								if (activeView !== 'basics' && activeView !== 'practice' && activeView !== 'lessons' && activeView !== 'advanced') {
									setActiveView('basics')
								}
							}}
						>
							LEARN
						</button>
						<button 
							className={`tab ${activeView === 'compose' ? 'is-active' : ''}`}
							onClick={() => setActiveView('compose')}
						>
							COMPOSE
						</button>
						<button 
							className={`tab ${activeView === 'community' ? 'is-active' : ''} ${!currentUser ? 'community-requires-login' : ''}`}
							onClick={() => {
								if (currentUser) {
									setActiveView('community')
								} else {
									setShowLogin(true)
								}
							}}
							title={!currentUser ? 'Login required to access Community' : ''}
						>
							COMMUNITY
						</button>
					</div>

					{/* Filters - Only show when LEARN tab is active */}
					{(activeView === 'basics' || activeView === 'practice' || activeView === 'lessons' || activeView === 'advanced') && (
					<div className="pills">
							<button 
								className={`pill ${activeView === 'basics' ? 'is-active' : ''}`}
								onClick={() => setActiveView('basics')}
							>
								Basics
							</button>
							<button 
								className={`pill ${activeView === 'practice' ? 'is-active' : ''}`}
								onClick={() => setActiveView('practice')}
							>
								Practice
							</button>
							<button 
								className={`pill ${activeView === 'lessons' ? 'is-active' : ''}`}
								onClick={() => setActiveView('lessons')}
							>
								Lessons
							</button>
							<button 
								className={`pill ${activeView === 'advanced' ? 'is-active' : ''}`}
								onClick={() => setActiveView('advanced')}
							>
								Advanced
							</button>
					</div>
					)}

					{/* Library View - Side Panel */}
					{showLibrary && (
						<>
							<div className="library-overlay" onClick={() => setShowLibrary(false)} />
							<div className="library-panel">
								<div className="panel-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
									<h2 className="panel-title">Library</h2>
									<button
										className="icon-btn-sm"
										aria-label="Close"
										onClick={() => setShowLibrary(false)}
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<line x1="18" y1="6" x2="6" y2="18"></line>
											<line x1="6" y1="6" x2="18" y2="18"></line>
										</svg>
									</button>
								</div>
							
							{/* Interactive Chord Finder */}
							<div style={{ marginBottom: '32px' }}>
								<h3 style={{ marginBottom: '12px', fontSize: '18px', fontWeight: 'bold' }}>Interactive Chord Finder</h3>
								<p style={{ marginBottom: '16px', fontSize: '14px' }}>Tap on any hole to toggle it open/closed.</p>
								
								<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
									<div style={{ position: 'relative', display: 'inline-block', pointerEvents: 'none' }}>
										<ChordCard
											openStates={interactiveOpenStates}
											fluteType={fluteType}
											value={String(getInteractiveChordId())}
											fluid={true}
											pixelSize={300}
										/>
										{/* Clickable hole overlays */}
										{interactiveOpenStates.map((open, index) => {
											const startAngleDeg = 0
											const angleDeg = startAngleDeg + (360 / 6) * index
											const angleRad = (angleDeg * Math.PI) / 180
											const radius = 34.5
											const centerX = 60
											const centerY = 60
											const holeX = centerX + radius * Math.cos(angleRad)
											const holeY = centerY + radius * Math.sin(angleRad)
											const pxX = (holeX / 120) * 300
											const pxY = (holeY / 120) * 300
											
											return (
												<button
													key={index}
													style={{
														position: 'absolute',
														left: `${pxX}px`,
														top: `${pxY}px`,
														transform: 'translate(-50%, -50%)',
														width: '50px',
														height: '50px',
														borderRadius: '50%',
														border: 'none',
														background: 'transparent',
														cursor: 'pointer',
														padding: 0,
														zIndex: 20,
														pointerEvents: 'auto',
														touchAction: 'manipulation'
													}}
													onClick={async (e) => {
														e.preventDefault()
														e.stopPropagation()
														await toggleInteractiveHole(index)
													}}
													onTouchStart={async (e) => {
														e.preventDefault()
														e.stopPropagation()
														await toggleInteractiveHole(index)
													}}
													aria-label={`Toggle hole ${index + 1} ${open ? 'open' : 'closed'}`}
												/>
											)
										})}
									</div>
								</div>
								
								<button 
									className="btn-sm is-active"
									onClick={handleSaveInteractiveChord}
									style={{ width: '100%' }}
								>
									Save Chord
								</button>
							</div>

							{/* All 64 Chords */}
							<div>
								<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '12px' }}>
									<h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>All 64 INNATO Chord Combinations</h3>
									<button 
										className="section-info-btn"
										onClick={() => setShowPracticeInfo(true)}
										aria-label="Practice information"
										title="Practice information"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
											<circle cx="12" cy="12" r="10"></circle>
											<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
											<line x1="12" y1="17" x2="12.01" y2="17"></line>
										</svg>
									</button>
								</div>
								<ul className="guide-list" style={{ fontSize: '14px', marginBottom: '16px' }}>
									<li>Tap any chord to hear its sounds</li>
									<li>Select chords (circle icon) to save as new progression</li>
									<li>Click a heart (heart icon) to save to favorite chords</li>
								</ul>

								<div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: '16px' }}>
									<button 
										className={`btn-sm ${selectedChordIds.length >= 2 ? 'is-active' : ''}`}
										onClick={handleSaveSelectedProgression}
										disabled={selectedChordIds.length < 2}
										style={{ flex: 1 }}
									>
										Select 2+ chords to save as progression
									</button>
									<button 
										className="btn-sm"
										onClick={() => setShowManageProgressionsModal(true)}
										style={{ flex: 1 }}
									>
										Manage Progressions
									</button>
								</div>

								<div 
									className="library-chords-grid"
									style={{ 
										display: 'grid', 
										gridTemplateColumns: 'repeat(2, 1fr)',
										gap: '20px',
										rowGap: '16px',
										marginBottom: '32px',
										justifyItems: 'center',
										maxWidth: '100%'
									}}
								>
									{Array.from({ length: 64 }, (_, i) => i + 1).map(chordId => {
										const fingering = getFingeringForChord(chordId)
										const openStates = fingeringToOpenStates(fingering)
										const isSelected = selectedChordIds.includes(chordId)
										const isFavorite = favoriteChordIds.includes(chordId)
										
										return (
											<div key={chordId} style={{ position: 'relative', width: '100%', maxWidth: '160px', margin: '0 auto' }}>
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
														if (isFavorite) {
															setFavoriteChordIds(prev => prev.filter(id => id !== chordId))
														} else {
															setFavoriteChordIds(prev => [...prev, chordId])
														}
													}}
													aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
												>
													♥
												</button>
												
												<div className="chord-card">
													<ChordCard
														value={String(chordId)}
														openStates={openStates}
														fluteType={fluteType}
														onPlay={(notes) => {
															handleChordCardClick(notes, chordId)
														}}
														fluid={true}
														pixelSize={160}
													/>
												</div>
											</div>
										)
									})}
								</div>
							</div>
							</div>
						</>
					)}

					{/* Content based on active view */}
					{activeView === 'compose' ? (
					<ComposerView
						ref={composerViewRef}
						fluteType={fluteType}
						tuning={tuning}
						favoriteChordIds={favoriteChordIds}
						onToggleFavorite={(chordId) => {
							setFavoriteChordIds(prev => {
								if (prev.includes(chordId)) {
									return prev.filter(id => id !== chordId)
								} else {
									return [...prev, chordId]
								}
							})
						}}
						onShowInfo={() => setShowComposeInfo(true)}
						onShowToast={(message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => {
							if (type === 'success') toast.showSuccess(message, duration)
							else if (type === 'error') toast.showError(message, duration)
							else if (type === 'warning') toast.showWarning(message, duration)
							else toast.showInfo(message, duration)
						}}
					/>
					) : activeView === 'lessons' ? (
						<>
							{/* Section header */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
								<div className="section-title" style={{ margin: 0 }}>All Lessons</div>
								{(() => {
									// Double-check admin status explicitly
									if (!currentUser) return null
									const userIsAdmin = isAdmin(currentUser)
									if (!userIsAdmin) return null
									
									return (
										<button 
											className="btn-sm"
											onClick={() => {
												// Triple-check admin status before opening modal
												const user = getCurrentUser()
												if (!user || !isAdmin(user)) {
													toast.showError('You must be an admin to manage lessons', 3000)
													return
												}
												setShowManageLessonsModal(true)
											}}
											title="Manage Lessons (Admin Only)"
											style={{ 
												marginLeft: 'auto',
												border: '2px solid #dc2626',
												color: '#dc2626',
												background: 'transparent'
											}}
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px' }}>
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
											</svg>
											Manage
										</button>
									)
								})()}
								<button 
									className="section-info-btn"
									onClick={() => setShowLessonsInfo(true)}
									aria-label="Lessons information"
									title="Lessons information"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
										<circle cx="12" cy="12" r="10"></circle>
										<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
										<line x1="12" y1="17" x2="12.01" y2="17"></line>
									</svg>
								</button>
							</div>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
								<p className="section-desc" style={{ margin: 0 }}>
									Master the flute through our structured learning journey with three categories: Progressions, Melodies, and Compositions. Mark each lesson as complete to unlock the next one.
								</p>
								<span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
									{getCompletedLessonCount()}/{lessons.length} complete
								</span>
							</div>

							{/* Lessons Timeline (horizontal scroll) */}
							<div className="lessons-timeline">
								{lessons.filter((lesson, index, self) => 
									index === self.findIndex(l => l.id === lesson.id)
								).map((lesson) => {
									return (
										<div
											key={lesson.id}
											className={`lesson-card ${lesson.unlocked ? '' : 'is-locked'} ${lesson.completed ? 'is-completed' : ''}`}
											onClick={() => {
												if (lesson.unlocked) {
													setSelectedLesson(lesson)
												}
											}}
											style={{ cursor: lesson.unlocked ? 'pointer' : 'not-allowed' }}
										>
											{!lesson.unlocked && (
												<div className="lesson-lock-icon">
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
														<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
													</svg>
												</div>
											)}
											{lesson.completed && (
												<div className="lesson-complete-icon">
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
														<polyline points="20 6 9 17 4 12"></polyline>
													</svg>
												</div>
											)}
											{!lesson.compositionId && lesson.unlocked && (
												<div style={{ 
													fontSize: 'var(--font-size-xs)', 
													color: 'rgba(0, 0, 0, 0.5)', 
													marginBottom: 'var(--space-2)',
													fontStyle: 'italic'
												}}>
													No composition assigned
												</div>
											)}
											<h3 className="lesson-card-title">
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
											{lesson.topic && (
												<p style={{ 
													margin: '2px 0 0 0',
													fontSize: 'var(--font-size-xs)', 
													color: 'rgba(0, 0, 0, 0.8)',
													fontWeight: 'var(--font-weight-semibold)'
												}}>
													{lesson.topic}
												</p>
											)}
											<p className="lesson-card-category">{lesson.category}</p>
											<p className="lesson-card-description">{lesson.description}</p>
										</div>
									)
								})}
							</div>
						</>
					) : activeView === 'community' ? (
						<CommunityView
							fluteType={fluteType}
							tuning={tuning}
							isAuthenticated={!!currentUser}
							onShowLogin={() => setShowLogin(true)}
							onOpenComposition={(sharedComposition) => {
								// Convert SharedComposition to SavedComposition and load it
								const composition: SavedComposition = {
									id: sharedComposition.originalId,
									name: sharedComposition.name,
									chords: sharedComposition.chords,
									tempo: sharedComposition.tempo,
									timeSignature: sharedComposition.timeSignature,
									fluteType: sharedComposition.fluteType as FluteType,
									tuning: sharedComposition.tuning as TuningFrequency,
									createdAt: sharedComposition.createdAt,
									updatedAt: sharedComposition.updatedAt || sharedComposition.createdAt
								}
								
								// Switch to compose view and load the composition
								setActiveView('compose')
								// Use setTimeout to ensure the view has switched before loading
								setTimeout(() => {
									if (composerViewRef.current) {
										composerViewRef.current.loadComposition(composition)
									}
								}, 100)
							}}
							onOpenProgression={(sharedProgression) => {
								// Convert progression chordIds to chords and load in composer
								// Switch to compose view and add the progression chords
								setActiveView('compose')
								// Use setTimeout to ensure the view has switched before adding
								setTimeout(() => {
									if (composerViewRef.current) {
										composerViewRef.current.addChord(sharedProgression.chordIds)
									}
								}, 100)
							}}
						/>
					) : activeView === 'advanced' ? (
						<>
							{/* Section header */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
								<div className="section-title" style={{ margin: 0 }}>Advanced Techniques</div>
								<button 
									className="section-info-btn"
									onClick={() => setShowAdvancedInfo(true)}
									aria-label="Advanced techniques information"
									title="Advanced techniques information"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
										<circle cx="12" cy="12" r="10"></circle>
										<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
										<line x1="12" y1="17" x2="12.01" y2="17"></line>
									</svg>
								</button>
							</div>
							<div className="section-desc">Explore these advanced techniques to deepen your INNATO flute practice.</div>

							<div className="guide-content">
								{/* Meditation Techniques */}
								<div style={{ marginBottom: 'calc(var(--space-4) + var(--space-2))' }}>
									<h3 className="guide-section-title">Meditation Techniques</h3>
									
									<div style={{ 
										border: 'var(--border-2) solid var(--color-black)', 
										borderRadius: 'var(--radius-2)', 
										padding: 'var(--space-4)' 
									}}>
										{/* Dynamic content based on index */}
										{meditationIndex === 0 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>1 — Listening</h4>
												<ul className="guide-list">
													<li>Begin by producing a steady sound.</li>
													<li>Then, simply listen to the response from your instrument.</li>
													<li>Do you detect the rhythm of your heartbeat in the sound?</li>
													<li>Can you notice the tension at the end of your exhale?</li>
													<li>Relax your hands as you hold your instrument.</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 1 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>2 — Vibration</h4>
												<ul className="guide-list">
													<li>Breathe in slowly and deeply.</li>
													<li>Exhale gently into the flute to produce a constant note.</li>
													<li>Focus on the vibrations reaching your fingertips.</li>
													<li>Notice if the vibrations shift as you play various notes.</li>
													<li>Do they vary with each tone?</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 2 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>3 — Immersion</h4>
												<ul className="guide-list">
													<li>Find an empty corner in your room.</li>
													<li>Now sit or stand there, holding your INNATO facing the wall as close as you can.</li>
													<li>While playing, listen how the sound of the instrument immerses you.</li>
													<li>Imagining being inside the instrument, a safe place to be and listen to what the sound tells you...</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 3 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>4 — Mirror</h4>
												<ul className="guide-list">
													<li>Find a nice spot somewhere in nature.</li>
													<li>Sit down and listen to the sounds around you. Can you hear birds? Can you hear the wind blowing through the trees? Are there any sounds you would like to block out?</li>
													<li>Don't. Invite all sounds around you and try to mirror them with your instrument.</li>
													<li>Can you hear the birds respond? Can you follow the sound of the wind?</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 4 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>5 — Soundwalk</h4>
												<ul className="guide-list">
													<li>Hold your instrument and slowly start walking around.</li>
													<li>Now blow a steady note on your INNATO and listen how your footsteps create a rhythm in your breath.</li>
													<li>Slowly start to walk slower and slower, until your steps won't affect your breath anymore.</li>
													<li>Do you feel like floating? Now imagining you don't touch the floor anymore and are floating on the sound of your INNATO...</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 5 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>6 — Randomness</h4>
												<ul className="guide-list">
													<li>Cover all fingerholes on your INNATO, then lift your fingers off one hole at a time randomly, and cover them back slowly to create a rhythm.</li>
													<li>Next, randomly open and close two fingerholes together.</li>
													<li>Finally, let your fingers move without thinking, creating random patterns.</li>
													<li>Do you hear the difference?</li>
												</ul>
											</>
										)}
										
										{meditationIndex === 6 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>7 — Sounddrops</h4>
												<ul className="guide-list">
													<li>Hold your INNATO with all holes open but don't play it yet. Hold it close to your ear and now randomly tap your fingers on the holes to create a tapping sound.</li>
													<li>Now close your eyes and listen to imaginary sounddrops dripping in a pool of sound.</li>
													<li>Can you create a melody? A rhythm?</li>
													<li>Try to create a tension using the silence between the drops...</li>
												</ul>
											</>
										)}
										
										{/* Navigation buttons */}
										<div style={{ 
											display: 'flex', 
											gap: 'var(--space-2)', 
											marginTop: 'var(--space-4)' 
										}}>
											<button 
												onClick={handlePreviousMeditation}
												className="btn-sm"
												style={{ flex: 1 }}
											>
												← Previous
											</button>
											<button 
												onClick={handleNextMeditation}
												className="btn-sm is-active"
												style={{ flex: 1 }}
											>
												Next →
											</button>
										</div>
										
										{/* Progress indicator */}
										<div style={{ 
											display: 'flex', 
											justifyContent: 'center', 
											alignItems: 'center', 
											gap: '4px', 
											marginTop: 'var(--space-2)' 
										}}>
											{Array.from({ length: 7 }).map((_, i) => (
												<div 
													key={i} 
													style={{
														width: '8px',
														height: '8px',
														borderRadius: 'var(--radius-full)',
														background: i === meditationIndex ? 'var(--color-black)' : 'rgba(0, 0, 0, 0.2)'
													}}
												/>
											))}
										</div>
									</div>
								</div>
								
								{/* Breathing Techniques */}
								<div style={{ marginBottom: 'calc(var(--space-4) + var(--space-2))' }}>
									<h3 className="guide-section-title">Breathing Techniques</h3>
									
									<div style={{ 
										border: 'var(--border-2) solid var(--color-black)', 
										borderRadius: 'var(--radius-2)', 
										padding: 'var(--space-4)' 
									}}>
										{/* Dynamic content based on index */}
										{breathingIndex === 0 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>1 — Steady Breath</h4>
												<ul className="guide-list">
													<li>Take a slow, deep inhale.</li>
													<li>Then slowly exhale through the flute, playing a steady note.</li>
													<li>Try to keep your breath as steady as possible, especially at reaching the end of your breath.</li>
													<li>Practising this technique repeatedly, you can train a longer exhale.</li>
												</ul>
											</>
										)}
										
										{breathingIndex === 1 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>2 — Dipping</h4>
												<ul className="guide-list">
													<li>Take a slow, deep inhale.</li>
													<li>Then slowly exhale through the flute, playing a steady note.</li>
													<li>Now drop the volume for a brief moment, creating a dip in the pitch of the flute and repeat this 3 times.</li>
													<li>You also can practice doing this creating a certain rhythm.</li>
												</ul>
											</>
										)}
										
										{breathingIndex === 2 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>3 — Rhythm</h4>
												<ul className="guide-list">
													<li>Take a slow, deep inhale.</li>
													<li>Then slowly exhale through the flute, playing a steady note.</li>
													<li>Now try to create a rhythm, pushing short pulses of air making a soft "T" sound with your tongue.</li>
													<li>Try different rhythms using less or more force.</li>
													<li>You also can try using the "T" followed by a "K" and repeat this in a fast rhythm: "TKTKTKTK".</li>
												</ul>
											</>
										)}
										
										{breathingIndex === 3 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>4 — Dropping</h4>
												<ul className="guide-list">
													<li>Take a slow, deep inhale.</li>
													<li>Then slowly exhale through the flute, playing a steady note.</li>
													<li>Now slowly drop the pressure of your breath until you don't hear sound anymore.</li>
													<li>Did you noticed that when the sound is almost gone, the flute creates very soft whistling sounds?</li>
													<li>Try to play with these moving your fingers quickly and randomly to create very soft bird like voices.</li>
												</ul>
											</>
										)}
										
										{breathingIndex === 4 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>5 — Using Your Voice</h4>
												<ul className="guide-list">
													<li>Take a slow, deep inhale.</li>
													<li>Then slowly exhale through the flute, playing a steady note.</li>
													<li>Now try to match the note you hear with your voice until they resonate with each other.</li>
													<li>Combine this with other techniques and rhythm, you can create a very nice growling sound.</li>
												</ul>
											</>
										)}
										
										{breathingIndex === 5 && (
											<>
												<h4 style={{ 
													fontWeight: 'var(--font-weight-bold)', 
													marginBottom: 'var(--space-2)', 
													fontSize: 'var(--font-size-base)',
													color: 'var(--color-black)'
												}}>6 — Random Staccato</h4>
												<ul className="guide-list">
													<li>Create short pushes of air by making "T" sounds with your tongue in a staccato rhythm. Start slow at first.</li>
													<li>Now change the position of your fingers on every "T".</li>
													<li>This can create a very beautiful random staccato rhythm on which you also can play progressions and melodies.</li>
													<li>Also try to combine this technique with the "TK" method.</li>
												</ul>
											</>
										)}
										
										{/* Navigation buttons */}
										<div style={{ 
											display: 'flex', 
											gap: 'var(--space-2)', 
											marginTop: 'var(--space-4)' 
										}}>
											<button 
												onClick={handlePreviousBreathing}
												className="btn-sm"
												style={{ flex: 1 }}
											>
												← Previous
											</button>
											<button 
												onClick={handleNextBreathing}
												className="btn-sm is-active"
												style={{ flex: 1 }}
											>
												Next →
											</button>
										</div>
										
										{/* Progress indicator */}
										<div style={{ 
											display: 'flex', 
											justifyContent: 'center', 
											alignItems: 'center', 
											gap: '4px', 
											marginTop: 'var(--space-2)' 
										}}>
											{Array.from({ length: 6 }).map((_, i) => (
												<div 
													key={i} 
													style={{
														width: '8px',
														height: '8px',
														borderRadius: 'var(--radius-full)',
														background: i === breathingIndex ? 'var(--color-black)' : 'rgba(0, 0, 0, 0.2)'
													}}
												/>
											))}
										</div>
									</div>
								</div>
							</div>
						</>
					) : activeView === 'basics' ? (
						<>
							{/* Section header */}
							<div className="section-title">Getting Started</div>
							<div className="section-desc">Welcome to Progressions</div>

							{/* Sub-tabs */}
							<div className="controls">
								<button 
									className={`btn-sm ${activeSubTab === 'guide' ? 'is-active' : ''}`}
									onClick={() => setActiveSubTab('guide')}
								>
									Guide
								</button>
								<button 
									className={`btn-sm ${activeSubTab === 'fingering' ? 'is-active' : ''}`}
									onClick={() => setActiveSubTab('fingering')}
								>
									Fingering
								</button>
								<button 
									className={`btn-sm ${activeSubTab === 'video' ? 'is-active' : ''}`}
									onClick={() => setActiveSubTab('video')}
								>
									Video
								</button>
							</div>

							{/* Guide Content */}
							{activeSubTab === 'guide' && (
								<div className="guide-content">
									<div className="guide-block">
										<h3 className="guide-section-title">Getting Started with INNATO</h3>
										<p className="guide-text">
											Welcome to Progressions! This app is designed to enhance your flute experience by helping you explore and learn different chord patterns. Whether you're just starting out or looking to expand your musical knowledge, this guide will help you get the most out of your practice sessions.
										</p>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">First Steps</h3>
										<p className="guide-text">Before you begin:</p>
										<ul className="guide-list">
											<li>Select your flute key from the Key dropdown in the upper right corner</li>
											<li>Choose your preferred pitch standard (Pitch) — either 440 Hz or 432 Hz</li>
										</ul>
										<p className="guide-text">
											These settings ensure that all chord diagrams and audio playback match your specific INNATO flute model.
										</p>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">App Navigation</h3>
										<p className="guide-text">This app is organized into three main areas:</p>
										<ul className="guide-list">
											<li><strong>Learn:</strong> Explore different chord patterns and learn how to play your flute</li>
											<li><strong>Compose:</strong> Create your own musical sequences by combining chords</li>
											<li><strong>Community:</strong> Share your compositions and discover pieces created by others</li>
										</ul>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">Using This App</h3>
										<p className="guide-text">To get started:</p>
										<ul className="guide-list">
											<li>Navigate between Learn, Compose, and Community using the tabs at the top</li>
											<li>In the Learn tab, start with the Basics section to understand how the app works</li>
											<li>In Practice, click on any chord card to hear how it sounds</li>
											<li>Use the Shuffle button to generate random chord combinations</li>
											<li>Use the Play button to hear a chord progression play automatically</li>
											<li>Switch to Compose to create and play your own chord progressions</li>
										</ul>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">Floating Action Buttons</h3>
										<p className="guide-text">
											The buttons in the top left corner provide quick access to additional features:
										</p>
										<ul className="guide-list">
											<li><strong>Music Notes:</strong> Access your saved progressions and favorites</li>
											<li><strong>Audio Source:</strong> Configure audio settings and playback options</li>
											<li><strong>Information:</strong> Learn more about the INNATO flute and techniques</li>
											<li><strong>Login:</strong> Access your account to sync progress across devices</li>
										</ul>
									</div>
								</div>
							)}

							{/* Fingering Content */}
							{activeSubTab === 'fingering' && (
								<div className="guide-content">
									<div className="guide-block">
										<h3 className="guide-section-title">Understanding the INNATO Fingering System</h3>
										<p className="guide-text">
											The INNATO flute uses a unique fingering system with 6 holes arranged in a perfect circle around the flute body. Each chord is created by opening or closing specific combinations of these holes.
										</p>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">The 6 Holes and Chambers</h3>
										<p className="guide-text">The flute has three chambers, each with two holes arranged around the flute body:</p>
										<ul className="guide-list">
											<li><strong>Left Chamber:</strong> Upper hole and lower hole (leftUpper, leftLower)</li>
											<li><strong>Right Chamber:</strong> Upper hole and lower hole (rightUpper, rightLower)</li>
											<li><strong>Front Chamber:</strong> Left front hole and right front hole (frontLeft, frontRight)</li>
										</ul>
									</div>

									{/* Diagram showing hole layout */}
									<div className="guide-block">
										<div className="guide-diagram-large">
											<ChordCard
												value=""
												openStates={[true, true, true, true, true, true]}
												fluteType={fluteType}
												onClick={() => {}}
												hideNotes={true}
												hideChordNumber={true}
												fluid={true}
												pixelSize={200}
											/>
										</div>
										<p className="guide-text guide-diagram-caption">
											Diagram showing all 6 holes in a circle (all shown as open/white circles)
										</p>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">How to Read Fingering Diagrams</h3>
										<p className="guide-text">Each chord diagram shows you the fingering pattern:</p>
										<ul className="guide-list">
											<li><strong>Black circles:</strong> Closed holes — cover these holes with your fingers</li>
											<li><strong>White circles:</strong> Open holes — leave these holes uncovered</li>
											<li><strong>Center circle:</strong> Shows the chord number (1-64) for reference</li>
											<li><strong>Three arms:</strong> Extend from the center and show which notes are produced by each chamber (visible in full chord cards)</li>
										</ul>
										<p className="guide-text">Here are some examples of different hole patterns:</p>
									</div>

									{/* Example diagrams - without notes and numbers */}
									<div className="guide-block">
										<div className="guide-diagrams">
											<div className="guide-diagram-item">
												<ChordCard
													openStates={fingeringToOpenStates(getFingeringForChord(1))}
													fluteType={fluteType}
													onClick={() => {}}
													hideNotes={true}
													hideChordNumber={true}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">All holes closed</p>
											</div>
											<div className="guide-diagram-item">
												<ChordCard
													openStates={fingeringToOpenStates(getFingeringForChord(4))}
													fluteType={fluteType}
													onClick={() => {}}
													hideNotes={true}
													hideChordNumber={true}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">Front holes open</p>
											</div>
											<div className="guide-diagram-item">
												<ChordCard
													openStates={fingeringToOpenStates(getFingeringForChord(15))}
													fluteType={fluteType}
													onClick={() => {}}
													hideNotes={true}
													hideChordNumber={true}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">Mixed pattern</p>
											</div>
										</div>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">Basic Fingering Techniques</h3>
										<p className="guide-text">To play chords effectively:</p>
										<ul className="guide-list">
											<li>Place your fingers over the black (closed) holes firmly but gently</li>
											<li>Ensure a good seal around closed holes to prevent air leaks</li>
											<li>Keep open holes completely clear and unobstructed</li>
											<li>Practice transitioning between chords smoothly</li>
											<li>Start with simple chords (fewer open holes) and progress to more complex patterns</li>
										</ul>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">Reading Complete Chord Diagrams</h3>
										<p className="guide-text">In full chord cards, you'll see additional information:</p>
										<ul className="guide-list">
											<li><strong>Chord Number:</strong> The number in the center circle (1-64) identifies this specific chord</li>
											<li><strong>Note Labels:</strong> The three arms show which notes are produced by each chamber</li>
											<li><strong>Hole Pattern:</strong> Black circles = closed holes, white circles = open holes</li>
										</ul>
										<p className="guide-text">Here are examples of complete chord diagrams with all information visible:</p>
									</div>

									{/* Example diagrams with notes and numbers visible */}
									<div className="guide-block">
										<div className="guide-diagrams">
											<div className="guide-diagram-item">
												<ChordCard
													value="1"
													openStates={fingeringToOpenStates(getFingeringForChord(1))}
													fluteType={fluteType}
													onClick={() => {}}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">Chord #1</p>
											</div>
											<div className="guide-diagram-item">
												<ChordCard
													value="15"
													openStates={fingeringToOpenStates(getFingeringForChord(15))}
													fluteType={fluteType}
													onClick={() => {}}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">Chord #15</p>
											</div>
											<div className="guide-diagram-item">
												<ChordCard
													value="33"
													openStates={fingeringToOpenStates(getFingeringForChord(33))}
													fluteType={fluteType}
													onClick={() => {}}
													fluid={true}
													pixelSize={100}
												/>
												<p className="guide-diagram-label">Chord #33</p>
											</div>
										</div>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">The 64 Chord System</h3>
										<p className="guide-text">The INNATO system offers 64 unique chord combinations:</p>
										<ul className="guide-list">
											<li>Each chord produces a unique sound based on which holes are open</li>
											<li>Chords are numbered 1 through 64 for easy reference</li>
											<li>Explore these chords in the Practice section using the Shuffle and Play buttons</li>
										</ul>
									</div>

									<div className="guide-block">
										<h3 className="guide-section-title">Tips for Practice</h3>
										<p className="guide-text">To improve your fingering:</p>
										<ul className="guide-list">
											<li>Practice holding each chord position steadily</li>
											<li>Focus on clean finger placement without touching adjacent holes</li>
											<li>Use the "Show Me" feature to see one chord at a time in detail</li>
											<li>Adjust the tempo slider to practice at your own pace</li>
											<li>Save your favorite chord patterns for regular practice</li>
										</ul>
									</div>
								</div>
							)}

							{/* Video Content */}
							{activeSubTab === 'video' && (
								<div className="guide-content">
									<h3 className="guide-section-title">Flute Performance</h3>
									<p className="guide-text">Watch this demonstration video to see and hear the INNATO flute being played with different techniques.</p>
									
									{/* First video - introduction (landscape 16:9) */}
									<div className="video-item-landscape">
										<div className="video-embed-landscape">
											{getYouTubeEmbedUrl(videoUrls['introduction']) ? (
												<iframe
													src={getYouTubeEmbedUrl(videoUrls['introduction']) || ''}
													title="Introduction to the INNATO Flute"
													allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
													allowFullScreen
												/>
											) : (
												<p className="video-placeholder">Video: Introduction to the INNATO Flute</p>
											)}
										</div>
										<p className="guide-text">Experience the unique sound of the INNATO flute in this musical demonstration</p>
									</div>

									<h3 className="guide-section-title">Flute by Key</h3>
									<p className="guide-text">Listen to demonstrations of the flute in different keys. Select the key that matches your instrument.</p>
									
									{/* Flute tuning demos - shorts (9:16), 2 per row */}
									<div className="video-shorts-grid">
										<div className="video-item-short">
											<h4 className="video-title">INNATO in Em4</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Em4']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Em4']) || ''}
														title="INNATO in Em4"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Em4</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in D#m4</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['D#m4']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['D#m4']) || ''}
														title="INNATO in D#m4"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in D#m4</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Dm4</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Dm4']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Dm4']) || ''}
														title="INNATO in Dm4"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Dm4</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in C#m4</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['C#m4']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['C#m4']) || ''}
														title="INNATO in C#m4"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in C#m4</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Cm4</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Cm4']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Cm4']) || ''}
														title="INNATO in Cm4"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Cm4</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Bm3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Bm3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Bm3']) || ''}
														title="INNATO in Bm3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Bm3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Bbm3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Bbm3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Bbm3']) || ''}
														title="INNATO in Bbm3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Bbm3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Am3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Am3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Am3']) || ''}
														title="INNATO in Am3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Am3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in G#m3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['G#m3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['G#m3']) || ''}
														title="INNATO in G#m3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in G#m3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Gm3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Gm3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Gm3']) || ''}
														title="INNATO in Gm3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Gm3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in F#m3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['F#m3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['F#m3']) || ''}
														title="INNATO in F#m3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in F#m3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Fm3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Fm3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Fm3']) || ''}
														title="INNATO in Fm3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Fm3</p>
												)}
											</div>
										</div>

										<div className="video-item-short">
											<h4 className="video-title">INNATO in Em3</h4>
											<div className="video-embed-short">
												{getYouTubeEmbedUrl(videoUrls['Em3']) ? (
													<iframe
														src={getYouTubeEmbedUrl(videoUrls['Em3']) || ''}
														title="INNATO in Em3"
														allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
														allowFullScreen
													/>
												) : (
													<p className="video-placeholder">Video: INNATO in Em3</p>
												)}
											</div>
										</div>
									</div>
								</div>
							)}
						</>
					) : (
						<>
					{/* Section header */}
					<div className="section-title">Practice Progressions</div>
					<div className="section-desc">Try playing along with these example progressions.</div>

					{/* Controls */}
					<div className="controls">
								<button 
									className="btn-sm" 
									onClick={handleShuffle}
									disabled={isPlaying || showMeActive}
								>
									Shuffle
								</button>
								<button 
									className={`btn-sm ${isPlaying ? 'is-active' : ''}`}
									onClick={handlePlayStop}
									disabled={showMeActive}
								>
									{isPlaying ? 'Stop' : 'Play'}
								</button>
								<button 
									className={`btn-sm ${showMeActive ? 'is-active' : ''}`}
									onClick={handleShowMe}
								>
									{showMeActive ? 'Hide' : 'Show Me'}
								</button>
								<button 
									className="btn-sm"
									onClick={() => setShowSaveModal(true)}
								>
									Save
								</button>
					</div>

							{/* Tempo Slider */}
							<div className="tempo-control">
								<label className="tempo-label">Tempo: {tempo} BPM</label>
								<input
									type="range"
									min="10"
									max="120"
									value={tempo}
									onChange={(e) => setTempo(Number(e.target.value))}
									className="tempo-slider"
									disabled={isPlaying || showMeActive}
								/>
							</div>

							{/* Chord Grid */}
							<div className={`grid ${showMeActive ? 'grid--show-me' : ''}`} id="chord-grid">
								{showMeActive ? (
									// Show only the current card in full size
									<ChordCard
										key={currentChords[currentShowIndex].id}
										value={String(currentChords[currentShowIndex].id)}
										openStates={currentChords[currentShowIndex].openStates}
										fluteType={fluteType}
										onPlay={(notes) => handleChordCardClick(notes, currentChords[currentShowIndex].id)}
										fluid={true}
										pixelSize={400}
									/>
								) : (
									// Show all 4 cards in grid
									currentChords.map(({ id, openStates }) => (
								<div key={id} className="chord-card">
									<ChordCard
										value={String(id)}
										openStates={openStates}
										fluteType={fluteType}
										onPlay={(notes) => handleChordCardClick(notes, id)}
										fluid={true}
										pixelSize={180}
									/>
								</div>
									))
								)}
					</div>
						</>
					)}

					{/* Save Modal */}
					{showSaveModal && (
						<div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
							<div className="modal-content" onClick={(e) => e.stopPropagation()}>
								<div className="modal-header">
									<h3 className="modal-title">Save Progression</h3>
								</div>
								<div className="modal-body">
									<input
										type="text"
										className="modal-input"
										placeholder="Enter progression name..."
										value={saveModalName}
										onChange={(e) => setSaveModalName(e.target.value)}
										autoFocus
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												handleSaveProgression()
											} else if (e.key === 'Escape') {
												setShowSaveModal(false)
											}
										}}
									/>
									<p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.6)', marginTop: '8px' }}>
										Current chords: {currentChords.map(c => c.id).join(', ')}
									</p>
								</div>
								<div className="modal-footer">
									<button 
										className="btn-sm"
										onClick={() => {
											setShowSaveModal(false)
											setSaveModalName('')
										}}
									>
										Cancel
									</button>
									<button 
										className="btn-sm is-active"
										onClick={handleSaveProgression}
										disabled={!saveModalName.trim()}
									>
										Save
									</button>
								</div>
							</div>
						</div>
					)}

					<div className="caption">www.stonewhistle.com</div>
				</div>
			</div>

			{/* About Panel */}
			{showAbout && (
				<AboutPanel
					onClose={() => setShowAbout(false)}
				/>
			)}

			{/* Login Panel */}
			{showLogin && (
				<LoginPanel
					onClose={() => setShowLogin(false)}
					onAuthChange={handleAuthChange}
				/>
			)}

			{/* Lesson Modal */}
			{selectedLesson && (
				<LessonModal
					lesson={selectedLesson}
					fluteType={fluteType}
					tuning={tuning}
					onClose={() => setSelectedLesson(null)}
					onComplete={async (completedLessonId) => {
						// Refresh lessons with updated progress
						const updatedLessons = await getLessonsWithProgress()
						setLessons(updatedLessons)
						
						// Find the next lesson
						const getLessonNumber = (id: string): number => {
							const match = id.match(/lesson-(\d+)/)
							return match ? parseInt(match[1], 10) : 0
						}
						const currentLessonNumber = getLessonNumber(completedLessonId)
						const nextLesson = updatedLessons.find((l: Lesson) => {
							const lessonNum = getLessonNumber(l.id)
							return lessonNum === currentLessonNumber + 1
						})
						
						// Close current modal first
						setSelectedLesson(null)
						
						// If next lesson exists and is unlocked, open it after a short delay
						if (nextLesson && nextLesson.unlocked) {
							setTimeout(() => {
								setSelectedLesson(nextLesson)
							}, 150)
						}
					}}
				/>
			)}

			{/* Manage Lessons Modal */}
			{showManageLessonsModal && currentUser && isAdmin(currentUser) && (
				<ManageLessonsModal
					isOpen={showManageLessonsModal}
					onClose={() => setShowManageLessonsModal(false)}
					onSuccess={() => {
						// Refresh lessons
						loadLessons()
					}}
					onShowToast={(message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => {
						if (type === 'success') toast.showSuccess(message, duration)
						else if (type === 'error') toast.showError(message, duration)
						else if (type === 'warning') toast.showWarning(message, duration)
						else toast.showInfo(message, duration)
					}}
				/>
			)}

			{/* Section Info Modals */}
			<SectionInfoModal
				isOpen={showPracticeInfo}
				onClose={() => setShowPracticeInfo(false)}
				title="Practice - How to Use"
			>
				<div className="guide-content">
					<div className="guide-block">
						<h3 className="guide-section-title">Interactive Chord Finder</h3>
						<ul className="guide-list">
							<li>Tap on any hole in the diagram to toggle it open or closed</li>
							<li>Watch the chord number update as you change the pattern</li>
							<li>Click "Save Chord" to add the current chord to your favorites</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">All 64 Chord Combinations</h3>
						<ul className="guide-list">
							<li><strong>Tap any chord card</strong> to hear how it sounds</li>
							<li><strong>Select chords</strong> by clicking the circle icon (○) in the top-left corner of a chord card</li>
							<li><strong>Save as favorite</strong> by clicking the heart icon (♥) in the top-right corner</li>
							<li><strong>Create a progression:</strong> Select 2 or more chords, then click "Select 2+ chords to save as progression"</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Tips</h3>
						<ul className="guide-list">
							<li>Start by exploring different chords to discover sounds you like</li>
							<li>Save your favorite chords for quick access later</li>
							<li>Combine multiple chords to create your own musical sequences</li>
						</ul>
					</div>
				</div>
			</SectionInfoModal>

			<SectionInfoModal
				isOpen={showComposeInfo}
				onClose={() => setShowComposeInfo(false)}
				title="Composer - How to Use"
			>
				<div className="guide-content">
					<div className="guide-block">
						<h3 className="guide-section-title">Creating Compositions</h3>
						<ul className="guide-list">
							<li><strong>Add Chord:</strong> Click "Add Chord" to open the selector, then choose a chord to add to your composition</li>
							<li><strong>Add Progression:</strong> Select a saved progression from your library to add all its chords at once</li>
							<li><strong>Add Rest:</strong> Click "Add Rest" to insert a pause (silence) in your composition</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Editing Your Composition</h3>
						<ul className="guide-list">
							<li><strong>Main Card:</strong> The large card shows the currently selected chord</li>
							<li><strong>Timeline:</strong> The horizontal timeline below shows your full composition</li>
							<li><strong>Select a chord:</strong> Click any card in the timeline to select and view it</li>
							<li><strong>Change rhythm:</strong> Use the + and - buttons to adjust how many beats each chord lasts</li>
							<li><strong>Reorder:</strong> Drag and drop cards in the timeline to rearrange your composition</li>
							<li><strong>Remove:</strong> Click the × button that appears when hovering over a card</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Playback Settings</h3>
						<ul className="guide-list">
							<li><strong>Tempo:</strong> Adjust the slider to set the speed (10-120 BPM)</li>
							<li><strong>Time Signature:</strong> Choose 3/4 or 4/4 to set the rhythm structure</li>
							<li><strong>Metronome:</strong> Toggle the metronome button to hear a click track while playing</li>
							<li><strong>Note:</strong> In 3/4 time, you can only add up to 3 rhythm dots per chord</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Saving and Loading</h3>
						<ul className="guide-list">
							<li><strong>New:</strong> Click "New" to clear the composer and start fresh</li>
							<li><strong>Save:</strong> Click "Save" to save your composition with a name</li>
							<li><strong>Open:</strong> Click "Open" to load a previously saved composition</li>
							<li><strong>Rename:</strong> When opening, you can click the pencil icon to rename a composition</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Playing Your Composition</h3>
						<ul className="guide-list">
							<li>Click "Play" to hear your composition played automatically</li>
							<li>The active chord will be highlighted during playback</li>
							<li>Rhythm dots will light up to show the beat</li>
							<li>The last chord will ring out longer for a natural ending</li>
							<li>Click "Stop" (or Play again) to stop playback</li>
						</ul>
					</div>
				</div>
			</SectionInfoModal>

			<SectionInfoModal
				isOpen={showLessonsInfo}
				onClose={() => setShowLessonsInfo(false)}
				title="Lessons - How to Use"
			>
				<div className="guide-content">
					<div className="guide-block">
						<h3 className="guide-section-title">Lesson Structure</h3>
						<ul className="guide-list">
							<li>Lessons are displayed horizontally in a timeline</li>
							<li>Each lesson contains a saved composition that you'll practice</li>
							<li>Lessons are numbered sequentially (Lesson 1, 2, 3, etc.)</li>
							<li>Each lesson shows its title, category, and description</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Unlocking Lessons</h3>
						<ul className="guide-list">
							<li>The first lesson is unlocked by default</li>
							<li>Complete a lesson to unlock the next one</li>
							<li>Locked lessons show a lock icon and cannot be opened</li>
							<li>Completed lessons show a checkmark icon</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Using a Lesson</h3>
						<ul className="guide-list">
							<li>Click on an unlocked lesson to open it</li>
							<li>The lesson modal shows a large card with the current chord</li>
							<li>Rhythm dots above the card show the beat pattern</li>
							<li>The timeline below shows all chords in the composition</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Lesson Controls</h3>
						<ul className="guide-list">
							<li><strong>Previous/Next:</strong> Navigate between chords manually</li>
							<li><strong>Play:</strong> Play the entire composition automatically</li>
							<li><strong>Click cards:</strong> Click any chord in the timeline to jump to it and hear it</li>
							<li><strong>Mark Complete:</strong> Click "✓ Mark as Complete" when you're done practicing</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Progress</h3>
						<ul className="guide-list">
							<li>Your progress is saved automatically</li>
							<li>The top shows how many lessons you've completed (e.g., "5/12 complete")</li>
							<li>When you complete a lesson, the next one unlocks automatically</li>
							<li>After completing a lesson, the app may automatically jump to the next unlocked lesson</li>
						</ul>
					</div>
				</div>
			</SectionInfoModal>

			<SectionInfoModal
				isOpen={showAdvancedInfo}
				onClose={() => setShowAdvancedInfo(false)}
				title="Advanced Techniques - How to Use"
			>
				<div className="guide-content">
					<div className="guide-block">
						<h3 className="guide-section-title">Meditation Techniques</h3>
						<p className="guide-text">
							Explore 7 different meditation techniques designed to deepen your connection with the INNATO flute. Use the navigation dots below to browse through each technique.
						</p>
						<ul className="guide-list">
							<li><strong>Listening:</strong> Focus on the sound and response of your instrument</li>
							<li><strong>Vibration:</strong> Pay attention to the vibrations reaching your fingertips</li>
							<li><strong>Immersion:</strong> Create a safe space with the sound of your flute</li>
							<li><strong>Mirror:</strong> Mirror natural sounds around you</li>
							<li><strong>Soundwalk:</strong> Walk slowly while playing and notice rhythm</li>
							<li><strong>Randomness:</strong> Let your fingers move without thinking</li>
							<li><strong>Sounddrops:</strong> Create tapping sounds with your fingers</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Breathing Techniques</h3>
						<p className="guide-text">
							Practice 6 breathing techniques to improve your breath control and create different sounds. Use the navigation dots below to browse through each technique.
						</p>
						<ul className="guide-list">
							<li><strong>Steady Breath:</strong> Practice slow, deep inhales and steady exhales</li>
							<li><strong>Dipping:</strong> Create dips in volume for rhythmic patterns</li>
							<li><strong>Rhythm:</strong> Use your tongue to create rhythmic pulses (T sounds)</li>
							<li><strong>Dropping:</strong> Slowly drop pressure to create soft whistling sounds</li>
							<li><strong>Using Your Voice:</strong> Match the note with your voice for resonance</li>
							<li><strong>Random Staccato:</strong> Create short pushes of air in random patterns</li>
						</ul>
					</div>
					<div className="guide-block">
						<h3 className="guide-section-title">Navigation</h3>
						<ul className="guide-list">
							<li>Use the dots below each section to navigate between techniques</li>
							<li>Each technique has detailed instructions to follow</li>
							<li>Practice each technique at your own pace</li>
							<li>Combine techniques for more complex musical expressions</li>
						</ul>
					</div>
				</div>
			</SectionInfoModal>

			{showDrone && (
				<DronePlayer
					fluteType={fluteType}
					tuning={tuning}
					onClose={() => setShowDrone(false)}
				/>
			)}
			{/* Manage Progressions Modal */}
			{showManageProgressionsModal && (
				<div className="modal-overlay" onClick={() => setShowManageProgressionsModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">Manage Progressions</h2>
						</div>
						<div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }} key={progressionModalRefresh}>
							{savedProgressions.length === 0 ? (
								<p style={{ textAlign: 'center', color: 'rgba(0, 0, 0, 0.6)', padding: 'var(--space-4)' }}>
									No progressions saved yet. Select 2+ chords in the Library and save them as a progression.
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
												background: 'var(--color-white)'
											}}
										>
											<div style={{ flex: 1 }}>
												<div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
													{progression.name}
												</div>
												<div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.6)' }}>
													{progression.chordIds.length} chord{progression.chordIds.length !== 1 ? 's' : ''}
												</div>
											</div>
											<div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center', flexShrink: 0 }}>
												<button
													className="btn-sm"
													onClick={() => {
														playChordProgression(progression.chordIds)
													}}
													style={{ 
														flex: '0 0 auto',
														minWidth: 'fit-content',
														padding: '4px 12px',
														fontSize: '11px',
														lineHeight: '1.4'
													}}
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px', flexShrink: 0 }}>
														<polygon points="5 3 19 12 5 21 5 3"></polygon>
													</svg>
													Play
												</button>
												<button
													className="icon-btn-sm"
													onClick={() => {
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
													onClick={() => {
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
							<button className="btn-sm" onClick={() => setShowManageProgressionsModal(false)}>
								Close
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Save Progression Modal */}
			{showSaveProgressionModal && (
				<div className="modal-overlay" onClick={() => setShowSaveProgressionModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2 className="modal-title">Save Progression</h2>
						</div>
						<div className="modal-body">
							<input
								type="text"
								className="modal-input"
								placeholder="Enter progression name"
								value={progressionName}
								onChange={(e) => setProgressionName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										handleSaveProgressionConfirm()
									} else if (e.key === 'Escape') {
										setShowSaveProgressionModal(false)
									}
								}}
								autoFocus
							/>
						</div>
						<div className="modal-footer">
							<button className="btn-sm" onClick={() => setShowSaveProgressionModal(false)}>
								Cancel
							</button>
							<button 
								className="btn-sm is-active" 
								onClick={handleSaveProgressionConfirm}
								disabled={!progressionName.trim() || selectedChordIds.length < 2}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Toast Container */}
			<ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
		</div>
	)
}
