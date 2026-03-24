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
interface PlayingNote {
	oscillator: OscillatorNode;
	gainNode: GainNode;
	frequency: number;
	note: string; // e.g., "C4", "Eb4"
	startTime: number;
}

class SimpleAudioPlayer {
	private audioContext: AudioContext | null = null;
	private oscillators: OscillatorNode[] = [];
	private gainNode: GainNode | null = null;
	private isInitialized: boolean = false;
	private playingNotes: Map<string, PlayingNote> = new Map(); // Map note name to playing note info

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
		this.playingNotes.clear();
	}

	/**
	 * Stop specific notes by note names (e.g., ["C4", "Eb4"])
	 */
	stopNotes(notesToStop: string[]): void {
		if (!this.audioContext) return;
		
		notesToStop.forEach(note => {
			const playingNote = this.playingNotes.get(note);
			if (playingNote && this.audioContext) {
				try {
					// Very smooth, gradual fade out to avoid any ticks
					const now = this.audioContext.currentTime;
					const fadeOutTime = 0.05; // 50ms gradual fade out
					
					// Cancel any scheduled gain changes
					playingNote.gainNode.gain.cancelScheduledValues(now);
					const currentGain = Math.max(0.01, playingNote.gainNode.gain.value);
					
					// Smooth linear fade out - very gradual
					playingNote.gainNode.gain.setValueAtTime(currentGain, now);
					playingNote.gainNode.gain.linearRampToValueAtTime(0, now + fadeOutTime);
					
					// Stop oscillator after fade out completes
					playingNote.oscillator.stop(now + fadeOutTime);
				} catch {
					// Oscillator might already be stopped
				}
				// Remove from tracking
				const index = this.oscillators.indexOf(playingNote.oscillator);
				if (index > -1) {
					this.oscillators.splice(index, 1);
				}
				this.playingNotes.delete(note);
			}
		});
	}

	/**
	 * Play a chord with three notes
	 * 
	 * @param leftNote - Note for the left chamber (e.g., "C4")
	 * @param rightNote - Note for the right chamber (e.g., "Eb4")
	 * @param frontNote - Note for the front chamber (e.g., "G4")
	 * @param tuning - Tuning frequency standard ("440", "432", or "256")
	 * @param duration - Duration in seconds (default: 2 seconds)
	 * @param skipStopAll - If true, don't stop previous sounds (for smooth breath-like progressions)
	 * @param keepNotes - Array of note names to keep playing (don't stop/restart these)
	 */
	async playChord(
		leftNote: string,
		rightNote: string,
		frontNote: string,
		tuning: TuningFrequency = "440",
		duration: number = 2.0,
		skipStopAll: boolean = false,
		keepNotes: string[] = []
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

		// Stop any currently playing sounds (unless skipping for smooth transitions)
		if (!skipStopAll) {
			// If we have notes to keep, only stop the ones that aren't being kept
			if (keepNotes.length > 0) {
				const notesToStop: string[] = [];
				this.playingNotes.forEach((_, note) => {
					if (!keepNotes.includes(note)) {
						notesToStop.push(note);
					}
				});
				// Use AudioContext timing for precise scheduling
				// Start fading out old notes AFTER new notes have started (using audio context time)
				if (notesToStop.length > 0 && this.audioContext) {
					const now = this.audioContext.currentTime;
					// Schedule fade-out to start after new notes begin (40ms = attack time)
					notesToStop.forEach(note => {
						const playingNote = this.playingNotes.get(note);
						if (playingNote) {
							// Schedule fade-out to start after new notes have begun fading in
							const fadeStartTime = now + 0.04; // Start fade after new notes attack begins
							const fadeOutTime = 0.06; // 60ms fade out
							
							playingNote.gainNode.gain.cancelScheduledValues(now);
							const currentGain = Math.max(0.01, playingNote.gainNode.gain.value);
							
							// Keep gain steady until fade starts
							playingNote.gainNode.gain.setValueAtTime(currentGain, now);
							playingNote.gainNode.gain.setValueAtTime(currentGain, fadeStartTime);
							// Then fade out smoothly
							playingNote.gainNode.gain.linearRampToValueAtTime(0, fadeStartTime + fadeOutTime);
							
							// Stop oscillator after fade completes
							playingNote.oscillator.stop(fadeStartTime + fadeOutTime);
							
							// Remove from tracking after fade completes
							setTimeout(() => {
								const index = this.oscillators.indexOf(playingNote.oscillator);
								if (index > -1) {
									this.oscillators.splice(index, 1);
								}
								this.playingNotes.delete(note);
							}, (fadeStartTime - now + fadeOutTime) * 1000 + 10);
						}
					});
				}
			} else {
				this.stopAll();
			}
		}

		const newNotes = [leftNote, rightNote, frontNote];
		const frequencies = [
			getNoteFrequency(leftNote, tuning),
			getNoteFrequency(rightNote, tuning),
			getNoteFrequency(frontNote, tuning)
		];

		// Create oscillators for each note (only if not already playing)
		frequencies.forEach((freq, index) => {
			const noteName = newNotes[index];
			
			// Skip if this note is already playing and should be kept
			if (keepNotes.includes(noteName) && this.playingNotes.has(noteName)) {
				// Note is already playing and matches - extend its duration
				const existingNote = this.playingNotes.get(noteName)!;
				const now = this.audioContext!.currentTime;
				
				// Try to extend the oscillator's stop time
				// Note: Once stop() is called, we can't cancel it, but we can try to schedule a later stop
				try {
					// Cancel any scheduled gain changes and keep it sustained
					existingNote.gainNode.gain.cancelScheduledValues(now);
					existingNote.gainNode.gain.setValueAtTime(0.2, now);
					
					// Schedule fade out at the end of the new duration
					const releaseStart = now + duration - 0.1;
					if (releaseStart > now) {
						existingNote.gainNode.gain.setValueAtTime(0.2, releaseStart);
						existingNote.gainNode.gain.linearRampToValueAtTime(0, now + duration);
					}
					
					// Try to extend stop time (this will fail if already stopped, which is fine)
					try {
						existingNote.oscillator.stop(now + duration);
					} catch {
						// Oscillator already stopped or can't be extended - that's okay, it will continue
					}
				} catch {
					// If we can't extend, the note will continue until its original stop time
					// This is acceptable - it means the note will play a bit longer
				}
				return; // Skip creating a new oscillator for this note
			}
			const oscillator = this.audioContext!.createOscillator();
			const noteGain = this.audioContext!.createGain();

			// Configure oscillator
			oscillator.type = "sine"; // Sine wave for smooth flute-like sound
			oscillator.frequency.value = freq;

			// Create envelope for smooth attack and release
			const now = this.audioContext!.currentTime;
			
			// Calculate envelope times based on duration for smoother playback
			// For very short durations, use shorter envelope times to prevent clicks
			const attackTime = Math.min(0.04, duration * 0.12); // Max 40ms attack, or 12% of duration
			const releaseTime = Math.min(0.08, duration * 0.15); // Max 80ms release, or 15% of duration
			const sustainStart = now + attackTime;
			const releaseStart = now + duration - releaseTime;
			
			// Attack: smooth fade in
			noteGain.gain.setValueAtTime(0, now);
			noteGain.gain.linearRampToValueAtTime(0.2, sustainStart);
			
			// Sustain: hold for most of the duration
			noteGain.gain.setValueAtTime(0.2, sustainStart);
			
			// Release: smooth fade out
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
			
			// Track this playing note
			this.playingNotes.set(noteName, {
				oscillator,
				gainNode: noteGain,
				frequency: freq,
				note: noteName,
				startTime: now
			});

			// Clean up after playback
			oscillator.onended = () => {
				const index = this.oscillators.indexOf(oscillator);
				if (index > -1) {
					this.oscillators.splice(index, 1);
				}
				this.playingNotes.delete(noteName);
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


