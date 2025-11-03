import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { simplePlayer } from './lib/simpleAudioPlayer'
import './index.css'
import App from './App.tsx'

// iOS Audio Unlock - Must be called DIRECTLY from user gesture
// iOS requires audio context resume to be called synchronously in the event handler
const unlockAudioOnUserGesture = () => {
	// On iOS, we MUST do everything synchronously in the event handler
	try {
		// Initialize audio context immediately
		const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		if (!AudioContextClass) return
		
		const testContext = new AudioContextClass()
		
		// Play a very short silent sound to unlock iOS audio
		// This must be done synchronously in the event handler
		const buffer = testContext.createBuffer(1, 1, 22050) // 1 channel, 1 sample, 22050Hz
		const source = testContext.createBufferSource()
		source.buffer = buffer
		source.connect(testContext.destination)
		
		// Start immediately (synchronously)
		source.start(0)
		
		// Resume if suspended (critical for iOS)
		if (testContext.state === 'suspended') {
			testContext.resume().then(() => {
				console.log('iOS Audio unlocked successfully')
				testContext.close()
			}).catch(() => {
				// Will unlock on next interaction
			})
		} else {
			testContext.close()
		}
		
		// Also initialize and resume the main audio player
		simplePlayer.initAudio().then(() => {
			const audioContext = simplePlayer.getAudioContext()
			if (audioContext && audioContext.state === 'suspended') {
				audioContext.resume().catch(() => {
					// Will try again on next interaction
				})
			}
		}).catch(() => {
			// Will try again on next interaction
		})
	} catch (error) {
		console.warn('Audio unlock attempt:', error)
		// Will try again on next user interaction
	}
}

// Listen for user interactions on iOS
// Use multiple events to catch any type of interaction
// Don't use 'once: true' - iOS audio can get suspended again, so we need to be able to re-unlock
const events = ['touchstart', 'touchend', 'click', 'mousedown']
const attachAudioUnlockListeners = () => {
	events.forEach(eventType => {
		document.addEventListener(eventType, unlockAudioOnUserGesture, { 
			passive: true,
			capture: true // Capture phase for better iOS support
		})
	})
}

// Attach listeners initially
attachAudioUnlockListeners()

// Also try to unlock when app becomes visible (handles some edge cases)
document.addEventListener('visibilitychange', () => {
	if (!document.hidden) {
		// When tab becomes visible, try to resume audio context
		setTimeout(() => {
			simplePlayer.initAudio().then(() => {
				const audioContext = simplePlayer.getAudioContext()
				if (audioContext && audioContext.state === 'suspended') {
					audioContext.resume().catch(() => {
						// Will unlock on next user interaction
					})
				}
			}).catch(() => {
				// Will unlock on next user interaction
			})
		}, 100)
	}
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
