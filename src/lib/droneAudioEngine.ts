/**
 * Drone Audio Engine
 * Handles playback of drone audio with pitch shifting and fine-tuning
 */

export type DroneInstrument = "tanpura" | "shruti"

export interface DroneAudioSettings {
	audioPath: string
	use432Hz: boolean
	fineTune: number // in cents (-50 to +50)
	volume?: number // 0-100, default 75
}

export class DroneAudioEngine {
	private audio: HTMLAudioElement | null = null
	private audioContext: AudioContext | null = null
	private sourceNode: MediaElementAudioSourceNode | null = null
	private gainNode: GainNode | null = null
	private settings: DroneAudioSettings
	private isPlaying: boolean = false
	private playbackRateMonitorInterval: number | null = null
	// @ts-expect-error - Tracked for debugging/monitoring purposes
	private targetPlaybackRate: number = 1.0
	private bufferSourceNode: AudioBufferSourceNode | null = null
	private audioBuffer: AudioBuffer | null = null

	constructor(settings: DroneAudioSettings) {
		this.settings = {
			volume: 75,
			...settings
		}
		this.targetPlaybackRate = this.getPlaybackRate()
	}

	/**
	 * Load audio as AudioBuffer for pitch shifting
	 * This method works reliably across all browsers and platforms
	 */
	private async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
		// Create AudioContext if it doesn't exist
		if (!this.audioContext) {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
			this.audioContext = new AudioContextClass()
		}

		// Resume context if suspended (required for autoplay)
		if (this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume()
			} catch (e) {
				console.warn("Could not resume audio context:", e)
			}
		}

		try {
			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			const arrayBuffer = await response.arrayBuffer()
			const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
			return audioBuffer
		} catch (error) {
			console.error("Failed to load audio buffer:", error)
			return null
		}
	}

	/**
	 * Load the audio file
	 */
	async loadAudio(): Promise<boolean> {
		// Try loading as AudioBuffer for reliable pitch shifting
		this.audioBuffer = await this.loadAudioBuffer(this.settings.audioPath)
		
		if (this.audioBuffer) {
			return true
		}
		
		// Fallback to HTML audio element (less reliable for pitch shifting)
		return new Promise((resolve) => {
			// Dispose of old audio
			if (this.audio) {
				this.audio.pause()
				this.audio.src = ''
				this.audio = null
			}
			
			// Create fresh audio element
			this.audio = new Audio()
			this.audio.loop = true
			this.audio.preload = "auto"
			
			// Calculate playback rate
			const playbackRate = this.getPlaybackRate()
			
			// Set playback rate
			this.audio.playbackRate = playbackRate
			this.audio.src = this.settings.audioPath

			let resolved = false
			const handleLoad = () => {
				if (resolved) return
				resolved = true
				if (this.audio) {
					this.audio.playbackRate = playbackRate
				}
				resolve(true)
			}

			this.audio.addEventListener('loadeddata', handleLoad, { once: true })
			this.audio.addEventListener('canplay', handleLoad, { once: true })

			this.audio.onerror = () => {
				if (resolved) return
				resolved = true
				console.error("Failed to load audio:", this.settings.audioPath)
				resolve(false)
			}

			this.audio.load()
			
			setTimeout(() => {
				if (!resolved && this.audio && this.audio.readyState >= 2 && !this.audio.error) {
					handleLoad()
				}
			}, 5000)
		})
	}

	/**
	 * Initialize audio context (for fallback HTML audio element only)
	 */
	private async initAudioContext(): Promise<void> {
		if (!this.audio) return

		// Set playback rate on HTML audio element
		const playbackRate = this.getPlaybackRate()
		if (this.audio) {
			this.audio.playbackRate = playbackRate
		}

		// Create AudioContext if needed (for fallback)
		if (!this.audioContext) {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
			this.audioContext = new AudioContextClass()
		}

		// Resume context if suspended
		if (this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume()
			} catch (e) {
				console.warn("Could not resume audio context:", e)
			}
		}
	}

	/**
	 * Calculate playback rate based on tuning and fine-tune
	 */
	private getPlaybackRate(): number {
		// Base ratio for 432Hz vs 440Hz: 432/440 = 0.981818...
		const baseRatio = this.settings.use432Hz ? 432 / 440 : 1

		// Fine-tune in cents: each cent is 2^(1/1200)
		const fineTuneRatio = Math.pow(2, this.settings.fineTune / 1200)

		const rate = baseRatio * fineTuneRatio
		return rate
	}

	/**
	 * Update volume on audio element directly
	 */
	private updateVolume(): void {
		if (this.audio && this.settings.volume !== undefined) {
			const volume = Math.max(0, Math.min(1, this.settings.volume / 100))
			this.audio.volume = volume
		}
	}

	/**
	 * Update gain node volume (for AudioBuffer playback)
	 */
	private updateGain(): void {
		if (this.gainNode && this.settings.volume !== undefined) {
			const volume = Math.max(0, Math.min(1, this.settings.volume / 100))
			this.gainNode.gain.value = volume
		}
	}

	/**
	 * Start monitoring and enforcing playback rate
	 * More aggressive monitoring to prevent browser from resetting it
	 */
	private startPlaybackRateMonitor(): void {
		this.stopPlaybackRateMonitor()
		
		this.playbackRateMonitorInterval = window.setInterval(() => {
			if (this.audio && this.isPlaying) {
				const targetRate = this.getPlaybackRate()
				this.targetPlaybackRate = targetRate
				
				// Always set it, don't just check - browsers can reset it silently
				this.audio.playbackRate = targetRate
				
				// Log if there's a mismatch
				if (Math.abs(this.audio.playbackRate - targetRate) > 0.001) {
					console.warn('PlaybackRate mismatch!', {
						target: targetRate,
						actual: this.audio.playbackRate,
						diff: Math.abs(this.audio.playbackRate - targetRate)
					})
				}
			}
		}, 50) // Check and reset every 50ms
	}

	/**
	 * Stop monitoring playback rate
	 */
	private stopPlaybackRateMonitor(): void {
		if (this.playbackRateMonitorInterval !== null) {
			clearInterval(this.playbackRateMonitorInterval)
			this.playbackRateMonitorInterval = null
		}
	}

	/**
	 * Play the audio using AudioBuffer for reliable pitch shifting
	 * This works across all browsers and platforms
	 */
	async play(): Promise<boolean> {
		// Create AudioContext if needed
		if (!this.audioContext) {
			const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
			this.audioContext = new AudioContextClass()
		}

		// Resume context if suspended (required for autoplay)
		if (this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume()
			} catch (e) {
				console.warn("Could not resume audio context:", e)
				return false
			}
		}

		try {
			const playbackRate = this.getPlaybackRate()
			this.targetPlaybackRate = playbackRate

			// Use AudioBuffer if available (more reliable for pitch shifting)
			if (this.audioBuffer) {
				
				// Stop existing playback
				if (this.bufferSourceNode) {
					try {
						this.bufferSourceNode.stop()
					} catch {
						// Ignore if already stopped
					}
					this.bufferSourceNode.disconnect()
					this.bufferSourceNode = null
				}

				// Verify audioContext is ready
				if (!this.audioContext) {
					console.error("AudioContext is null!")
					return false
				}

				// Create new buffer source
				try {
					this.bufferSourceNode = this.audioContext.createBufferSource()
					if (!this.bufferSourceNode) {
						console.error("Failed to create buffer source node")
						return false
					}
					
					this.bufferSourceNode.buffer = this.audioBuffer
					this.bufferSourceNode.loop = true
					
					// Set playback rate on buffer source (this works reliably!)
					this.bufferSourceNode.playbackRate.value = playbackRate

					// Create gain node for volume
					if (!this.gainNode) {
						this.gainNode = this.audioContext.createGain()
						if (!this.gainNode) {
							console.error("Failed to create gain node")
							return false
						}
					}
					this.updateGain()

					// Connect: buffer source -> gain -> destination
					this.bufferSourceNode.connect(this.gainNode)
					this.gainNode.connect(this.audioContext.destination)

					// Start playback
					try {
						this.bufferSourceNode.start(0)
						this.isPlaying = true
						return true
					} catch (startError) {
						console.error("Error starting buffer source:", startError)
						return false
					}
				} catch (bufferError) {
					console.error("Error creating buffer source:", bufferError)
					return false
				}
			}

			// Fallback to HTML audio element
			if (!this.audio) {
				console.error("Audio element is null")
				return false
			}

			this.audio.playbackRate = playbackRate
			await this.initAudioContext()
			this.updateVolume()

			try {
				await this.audio.play()
				this.audio.playbackRate = playbackRate
				
				this.startPlaybackRateMonitor()
				this.isPlaying = true
				return true
			} catch (playError) {
				console.error("Error playing HTML audio:", playError)
				return false
			}
		} catch (error) {
			console.error("Error playing drone audio:", error)
			return false
		}
	}

	/**
	 * Stop the audio
	 */
	stop(): void {
		this.stopPlaybackRateMonitor()
		
		// Stop AudioBuffer playback
		if (this.bufferSourceNode) {
			try {
				this.bufferSourceNode.stop()
			} catch {
				// Ignore errors if already stopped
			}
			this.bufferSourceNode.disconnect()
			this.bufferSourceNode = null
		}
		
		// Stop HTML audio element
		if (this.audio) {
			this.audio.pause()
			this.audio.currentTime = 0
		}
		
		this.isPlaying = false
	}

	/**
	 * Update fine-tune setting - live update
	 */
	setFineTune(cents: number): void {
		this.settings.fineTune = cents
		if (this.isPlaying) {
			const newRate = this.getPlaybackRate()
			this.targetPlaybackRate = newRate
			
			// Update AudioBuffer playback rate (live, works reliably!)
			if (this.bufferSourceNode) {
				this.bufferSourceNode.playbackRate.value = newRate
				return
			}
			
			// Fallback for HTML audio element
			if (this.audio) {
				this.audio.playbackRate = newRate
			}
		}
	}

	/**
	 * Update tuning (432Hz vs 440Hz) - live update
	 */
	setTuning(use432Hz: boolean): void {
		this.settings.use432Hz = use432Hz
		if (this.isPlaying) {
			const newRate = this.getPlaybackRate()
			this.targetPlaybackRate = newRate
			
			// Update AudioBuffer playback rate (live, works reliably!)
			if (this.bufferSourceNode) {
				this.bufferSourceNode.playbackRate.value = newRate
				return
			}
			
			// Fallback for HTML audio element
			if (this.audio) {
				this.audio.playbackRate = newRate
			}
		}
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.stopPlaybackRateMonitor()
		this.stop()
		
		if (this.bufferSourceNode) {
			try {
				this.bufferSourceNode.stop()
			} catch {
				// Ignore errors if already stopped
			}
			this.bufferSourceNode.disconnect()
			this.bufferSourceNode = null
		}
		
		if (this.sourceNode) {
			this.sourceNode.disconnect()
			this.sourceNode = null
		}

		if (this.gainNode) {
			this.gainNode.disconnect()
			this.gainNode = null
		}

		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().catch(() => {
				// Ignore close errors
			})
			this.audioContext = null
		}

		if (this.audio) {
			this.audio.src = ''
			this.audio = null
		}
		
		this.audioBuffer = null
	}

	get playing(): boolean {
		return this.isPlaying
	}
}

