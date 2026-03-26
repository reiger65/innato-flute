import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { simplePlayer } from './lib/simpleAudioPlayer'
import './index.css'
import App from './App.tsx'

// iOS Audio Unlock — must run synchronously in the same user gesture (no separate AudioContext + async init).
const unlockAudioOnUserGesture = () => {
	try {
		simplePlayer.unlockFromUserGesture()
	} catch (error) {
		console.warn('Audio unlock attempt:', error)
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
