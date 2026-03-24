import { useState, useRef, useEffect } from 'react'
import { type FluteType } from '../lib/fluteData'
import { type TuningFrequency } from '../lib/simpleAudioPlayer'
import { DroneAudioEngine, type DroneInstrument } from '../lib/droneAudioEngine'

interface DronePlayerProps {
	fluteType: FluteType
	tuning: TuningFrequency
	onClose: () => void
}

// Map flute types to root notes for drone
const fluteTypeToRootNote: Record<FluteType, string> = {
	"Em4": "E4",
	"D#m4": "D#4",
	"Dm4": "D4",
	"C#m4": "C#4",
	"Cm4": "C4",
	"Bm3": "B3",
	"Bbm3": "Bb3",
	"Am3": "A3",
	"G#m3": "G#3",
	"Gm3": "G3",
	"F#m3": "F#3",
	"Fm3": "F3",
	"Em3": "E3"
}

const innatoFluteTypes: FluteType[] = [
	"Em4", "D#m4", "Dm4", "C#m4", "Cm4",
	"Bm3", "Bbm3", "Am3", "G#m3", "Gm3", "F#m3", "Fm3", "Em3"
]

const droneInstruments: { id: DroneInstrument; name: string; description: string }[] = [
	{ id: "tanpura", name: "Tanpura", description: "Traditional Indian string drone" },
	{ id: "shruti", name: "Shruti Box", description: "Harmonium-like drone" }
]

export function DronePlayer({ fluteType, tuning, onClose }: DronePlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string>("")
	const [instrument, setInstrument] = useState<DroneInstrument>("tanpura")
	const [selectedFluteType, setSelectedFluteType] = useState<FluteType>(fluteType)
	const [use432Hz, setUse432Hz] = useState(tuning === "432")
	const [fineTune, setFineTune] = useState(0) // -50 to +50 cents

	const audioEngineRef = useRef<DroneAudioEngine | null>(null)

	// Get note from flute type
	const note = fluteTypeToRootNote[selectedFluteType] || "C4"

	// Get audio file path
	const getAudioUrl = (noteValue: string, instrumentType: DroneInstrument): string => {
		// Get note base without octave (e.g., "A" from "A3" or "E" from "E4")
		// E and F are used for both E3/E4 and F3/F4
		const noteBase = noteValue.replace(/[0-9]/g, '')

		// Map note to filename
		let filename: string
		switch (noteBase) {
			case 'C#':
				filename = 'Csharp'
				break
			case 'D#':
				filename = 'Dsharp'
				break
			case 'F#':
				filename = 'Fsharp'
				break
			case 'G#':
				filename = 'Gsharp'
				break
			case 'A#':
				filename = 'Asharp'
				break
			case 'Bb':
				filename = 'Asharp' // A# is equivalent to Bb
				break
			default:
				filename = noteBase // E, F, A, B, C, D, G (octave doesn't matter)
		}

		// Map instrument type to folder name
		const instrumentFolder = instrumentType === 'shruti' ? 'shrutibox' : 'tanpura'

		// Construct the full path
		return `/audio/drone_player/${instrumentFolder}/${filename}.mp3`
	}

	// Toggle drone playback
	const toggleDrone = async () => {
		if (isLoading) return

		try {
			// If playing, stop
			if (isPlaying) {
				if (audioEngineRef.current) {
					audioEngineRef.current.stop()
					audioEngineRef.current.dispose()
					audioEngineRef.current = null
				}
				setIsPlaying(false)
				return
			}

			// Start playback
			setIsLoading(true)
			setErrorMessage("")

			const audioUrl = getAudioUrl(note, instrument)

			// Create audio engine
			const audioEngine = new DroneAudioEngine({
				audioPath: audioUrl,
				use432Hz: use432Hz,
				fineTune: fineTune,
				volume: 75
			})

			audioEngineRef.current = audioEngine

			// Load and play
			const loaded = await audioEngine.loadAudio()
			if (!loaded) {
				setErrorMessage("Failed to load audio. Please try again.")
				setIsLoading(false)
				setTimeout(() => setErrorMessage(""), 5000)
				return
			}

			const played = await audioEngine.play()
			if (!played) {
				setErrorMessage("Could not play drone. Try again or check browser settings.")
				setIsLoading(false)
				setTimeout(() => setErrorMessage(""), 5000)
				return
			}

			setIsPlaying(true)
			setIsLoading(false)
		} catch (error) {
			console.error("Error in toggleDrone:", error)
			setErrorMessage("An error occurred. Please try again.")
			setIsLoading(false)
			setTimeout(() => setErrorMessage(""), 5000)
		}
	}

	// Handle instrument change
	const handleInstrumentChange = (newInstrument: DroneInstrument) => {
		const wasPlaying = isPlaying
		if (wasPlaying) {
			toggleDrone() // Stop current playback
		}
		setInstrument(newInstrument)
		if (wasPlaying) {
			setTimeout(() => toggleDrone(), 100) // Restart with new instrument
		}
	}

	// Handle flute type change
	const handleFluteTypeChange = (newFluteType: FluteType) => {
		const wasPlaying = isPlaying
		if (wasPlaying) {
			toggleDrone() // Stop current playback
		}
		setSelectedFluteType(newFluteType)
		if (wasPlaying) {
			setTimeout(() => toggleDrone(), 100) // Restart with new note
		}
	}

	// Handle tuning change - live update (AudioBuffer supports this)
	const handleTuningChange = (use432: boolean) => {
		setUse432Hz(use432)
		// Update tuning live - AudioBufferSourceNode supports live playbackRate changes
		if (audioEngineRef.current && isPlaying) {
			audioEngineRef.current.setTuning(use432)
		}
	}

	// Handle fine-tune change - live update (AudioBuffer supports this)
	const handleFineTuneChange = (cents: number) => {
		setFineTune(cents)
		// Update fine-tune live - AudioBufferSourceNode supports live playbackRate changes
		if (audioEngineRef.current && isPlaying) {
			audioEngineRef.current.setFineTune(cents)
		}
	}

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (audioEngineRef.current) {
				audioEngineRef.current.dispose()
				audioEngineRef.current = null
			}
		}
	}, [])

	return (
		<div className="drone-overlay" onClick={onClose}>
			<div className="drone-panel" onClick={(e) => e.stopPropagation()}>
				<div className="drone-header">
					<h3 className="drone-title">Drone Player</h3>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
					</button>
				</div>

				{errorMessage && (
					<div className="drone-error">
						{errorMessage}
					</div>
				)}

				<div className="drone-content">
					{/* Instrument Selection */}
					<div className="drone-section">
						<label className="drone-label">Instrument</label>
						<p className="drone-description">Select a drone instrument type</p>
						<div className="drone-instruments">
							{droneInstruments.map((inst) => (
								<button
									key={inst.id}
									className={`btn-sm ${instrument === inst.id ? 'is-active' : ''}`}
									onClick={() => handleInstrumentChange(inst.id)}
								>
									{inst.name}
								</button>
							))}
						</div>
						{droneInstruments.find(i => i.id === instrument)?.description && (
							<p className="drone-description-small">
								{droneInstruments.find(i => i.id === instrument)?.description}
							</p>
						)}
					</div>

					{/* Flute/Key Selection */}
					<div className="drone-section">
						<label className="drone-label">Flute</label>
						<select
							className="drone-select"
							value={selectedFluteType}
							onChange={(e) => handleFluteTypeChange(e.target.value as FluteType)}
						>
							{innatoFluteTypes.map((flute) => (
								<option key={flute} value={flute}>
									{flute}
								</option>
							))}
						</select>
					</div>

					{/* Tuning Selection */}
					<div className="drone-section">
						<label className="drone-label">Tuning</label>
						<div className="drone-tuning-toggle">
							<button
								type="button"
								onClick={() => handleTuningChange(false)}
								className={`btn-sm ${!use432Hz ? 'is-active' : ''}`}
							>
								440Hz
							</button>
							<button
								type="button"
								onClick={() => handleTuningChange(true)}
								className={`btn-sm ${use432Hz ? 'is-active' : ''}`}
							>
								432Hz
							</button>
						</div>
					</div>

					{/* Fine-tune Slider */}
					<div className="drone-section">
						<div className="drone-fine-tune-header">
							<label className="drone-label">Fine-tune</label>
							<span className="drone-fine-tune-value">
								{fineTune === 0 ? '0' : fineTune > 0 ? `+${fineTune}` : `${fineTune}`}¢
							</span>
						</div>
						<input
							type="range"
							min="-50"
							max="50"
							step="1"
							value={fineTune}
							onChange={(e) => handleFineTuneChange(Number(e.target.value))}
							className="drone-slider"
							disabled={isLoading}
						/>
						<div className="drone-slider-labels">
							<span>-50¢</span>
							<span className={fineTune === 0 ? 'drone-slider-label-active' : ''}>0</span>
							<span>+50¢</span>
						</div>
					</div>

					{/* Start/Stop Button */}
					<div className="drone-section">
						<button
							type="button"
							className={`btn-sm ${isPlaying ? 'is-active' : ''}`}
							onClick={toggleDrone}
							disabled={isLoading}
						>
							{isLoading ? (
								<span>Loading...</span>
							) : isPlaying ? (
								'Stop Drone'
							) : (
								'Start Drone'
							)}
						</button>
					</div>

					{/* Description */}
					<div className="drone-description-text">
						<p>Playing a continuous drone helps maintain key and improves pitch awareness during practice.</p>
					</div>

					{/* Credit */}
					<div className="drone-credit">
						<p>
							<a
								href="https://mynoise.net/NoiseMachines/tanpuraGenerator.php"
								target="_blank"
								rel="noopener noreferrer"
								className="drone-credit-link"
							>
								Thanks to myNoise.net for the sounds
							</a>
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

