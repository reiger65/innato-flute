/**
 * Simple Audio Player
 * 
 * Generates and plays chords using Web Audio API.
 * Based on the audio generation logic from the Replit version.
 */

export type TuningFrequency = "440" | "432" | "256";

/**
 * Get the frequency for a note based on the tuning standard
 */
export function getNoteFrequency(note: string, tuning: TuningFrequency): number {
	// Base frequencies for A4 in different tuning standards
	const tuningFrequencies = {
		"440": 440,
		"432": 432,
		"256": 256 * Math.pow(2, 0.75)  // 256 Hz for C, adjusted for A4
	};
	
	// Notes in chromatic scale from C0
	const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
	
	// Parse the note name and octave
	const noteName = note.slice(0, -1);
	const octave = parseInt(note.slice(-1));
	
	// Handle flat notes (convert to equivalent sharp notes)
	let noteIndex = notes.indexOf(noteName);
	if (noteIndex === -1) {
		if (noteName === "Bb") noteIndex = notes.indexOf("A#");
		else if (noteName === "Eb") noteIndex = notes.indexOf("D#");
		else if (noteName === "Ab") noteIndex = notes.indexOf("G#");
		else if (noteName === "Db") noteIndex = notes.indexOf("C#");
		else if (noteName === "Gb") noteIndex = notes.indexOf("F#");
	}
	
	// Calculate the note's position relative to A4
	const stepsFromA4 = noteIndex - notes.indexOf("A") + (octave - 4) * 12;
	
	// Calculate the frequency using the equal temperament formula: f = f0 * 2^(n/12)
	const frequency = tuningFrequencies[tuning] * Math.pow(2, stepsFromA4 / 12);
	
	return Math.round(frequency * 100) / 100;  // Round to 2 decimal places
}

/**
 * Simple Audio Player class
 */
class SimpleAudioPlayer {
	private audioContext: AudioContext | null = null;
	private oscillators: OscillatorNode[] = [];
	private gainNode: GainNode | null = null;
	private isInitialized: boolean = false;

	/**
	 * Initialize the Web Audio API context
	 * Mobile-friendly: Creates context lazily (doesn't resume until user interaction)
	 */
	async initAudio(): Promise<void> {
		try {
			// Create audio context if it doesn't exist
			if (!this.audioContext) {
				// Use the correct AudioContext constructor for all browsers (including mobile)
				const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
				if (!AudioContextClass) {
					throw new Error("Web Audio API not supported in this browser");
				}
				// Create audio context with optimal settings for mobile
				this.audioContext = new AudioContextClass({
					// Use 'interactive' latency hint for mobile devices
					latencyHint: 'interactive',
					// Sample rate - use default, but ensure it's set properly
					sampleRate: undefined // Let browser choose optimal rate
				});
				this.isInitialized = true;
				// Don't try to resume here - wait for user interaction
				// Resuming will happen automatically when playChord is called
			}
			
			// Create gain node if it doesn't exist
			if (!this.gainNode && this.audioContext) {
				this.gainNode = this.audioContext.createGain();
				this.gainNode.connect(this.audioContext.destination);
				this.gainNode.gain.value = 0.3; // Set volume to 30%
			}
		} catch (error) {
			console.error("Error initializing audio:", error);
			// Don't throw on first init failure - audio might work after user interaction
			if (!this.isInitialized) {
				this.isInitialized = false;
			}
			// Still throw to let caller know, but they can catch it
			throw error;
		}
	}

	/**
	 * Get the AudioContext (for sharing with other components like metronome)
	 */
	getAudioContext(): AudioContext | null {
		return this.audioContext;
	}

	/**
	 * Stop any currently playing sounds
	 */
	stopAll(): void {
		if (this.oscillators.length > 0) {
			this.oscillators.forEach(osc => {
				try {
					osc.stop();
				} catch {
					// Oscillator might already be stopped
				}
			});
			this.oscillators = [];
		}
	}

	/**
	 * Play a chord with three notes
	 * 
	 * @param leftNote - Note for the left chamber (e.g., "C4")
	 * @param rightNote - Note for the right chamber (e.g., "Eb4")
	 * @param frontNote - Note for the front chamber (e.g., "G4")
	 * @param tuning - Tuning frequency standard ("440", "432", or "256")
	 * @param duration - Duration in seconds (default: 2 seconds)
	 */
	async playChord(
		leftNote: string,
		rightNote: string,
		frontNote: string,
		tuning: TuningFrequency = "440",
		duration: number = 2.0
	): Promise<void> {
		// Ensure audio is initialized
		try {
			await this.initAudio();
		} catch (error) {
			console.error("Failed to initialize audio:", error);
			return;
		}
		
		if (!this.audioContext || !this.gainNode) {
			console.error("Audio not initialized. Call initAudio() first.");
			return;
		}

		// Resume audio context if suspended (this happens after user interaction)
		// This MUST be called directly from a user gesture event handler on iOS
		if (this.audioContext.state === 'suspended') {
			try {
				// On iOS, resume() must be called synchronously in the event handler
				await this.audioContext.resume();
				
				// iOS sometimes needs multiple attempts
				if (this.audioContext.state === 'suspended') {
					// Try again immediately (iOS allows multiple resume calls)
					await this.audioContext.resume();
				}
			} catch (resumeError) {
				// Silently fail - audio will work after first user interaction
				// Don't log warnings here as this is expected behavior
			}
		}

		// Stop any currently playing sounds
		this.stopAll();

		// Get frequencies for each note
		const frequencies = [
			getNoteFrequency(leftNote, tuning),
			getNoteFrequency(rightNote, tuning),
			getNoteFrequency(frontNote, tuning)
		];

		// Create oscillators for each note
		frequencies.forEach((freq) => {
			const oscillator = this.audioContext!.createOscillator();
			const noteGain = this.audioContext!.createGain();

			// Configure oscillator
			oscillator.type = "sine"; // Sine wave for smooth flute-like sound
			oscillator.frequency.value = freq;

			// Create envelope for smooth attack and release
			const now = this.audioContext!.currentTime;
			
			// Calculate envelope times based on duration for smoother playback
			// For very short durations, use shorter envelope times to prevent clicks
			const attackTime = Math.min(0.03, duration * 0.1); // Max 30ms attack, or 10% of duration
			const releaseTime = Math.min(0.1, duration * 0.2); // Max 100ms release, or 20% of duration
			const sustainStart = now + attackTime;
			const releaseStart = now + duration - releaseTime;
			
			// Attack: smooth fade in
			noteGain.gain.setValueAtTime(0, now);
			noteGain.gain.linearRampToValueAtTime(0.2, sustainStart);
			
			// Sustain: hold for most of the duration
			noteGain.gain.setValueAtTime(0.2, sustainStart);
			
			// Release: smooth fade out (only if duration is long enough)
			if (duration > attackTime + releaseTime) {
				noteGain.gain.setValueAtTime(0.2, releaseStart);
				noteGain.gain.linearRampToValueAtTime(0, now + duration);
			} else {
				// For very short durations, just fade out from sustain
				noteGain.gain.linearRampToValueAtTime(0, now + duration);
			}

			// Connect oscillator -> gain -> master gain -> destination
			oscillator.connect(noteGain);
			if (this.gainNode) {
				noteGain.connect(this.gainNode);
			}

			// Start and stop the oscillator
			oscillator.start(now);
			oscillator.stop(now + duration);

			// Store oscillator for cleanup
			this.oscillators.push(oscillator);

			// Clean up after playback
			oscillator.onended = () => {
				const index = this.oscillators.indexOf(oscillator);
				if (index > -1) {
					this.oscillators.splice(index, 1);
				}
			};
		});
	}

	/**
	 * Dispose of audio resources
	 */
	dispose(): void {
		this.stopAll();
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		this.gainNode = null;
	}
}

// Export singleton instance
export const simplePlayer = new SimpleAudioPlayer();


