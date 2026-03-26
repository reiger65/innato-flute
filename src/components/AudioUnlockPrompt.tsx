import { useEffect, useState } from 'react'
import { simplePlayer } from '../lib/simpleAudioPlayer'

function isAppleTouchDevice(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent
	if (/iPad|iPhone|iPod/.test(ua)) return true
	// iPadOS 13+ desktop UA
	if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
	return false
}

/**
 * Safari (especially iOS) treats YouTube iframe taps separately from the page Web Audio context.
 * Users can hear videos but not chord sounds until they interact with *this* page.
 */
export function AudioUnlockPrompt() {
	const [show, setShow] = useState(false)

	useEffect(() => {
		const update = () => {
			const ctx = simplePlayer.getAudioContext()
			if (ctx?.state === 'running') {
				setShow(false)
				return
			}
			if (ctx?.state === 'suspended') {
				setShow(true)
				return
			}
			// No context yet: only nag on Apple mobile where autoplay is strict
			setShow(isAppleTouchDevice())
		}

		update()
		const id = window.setInterval(update, 500)
		const onVis = () => {
			if (!document.hidden) update()
		}
		document.addEventListener('visibilitychange', onVis)
		return () => {
			window.clearInterval(id)
			document.removeEventListener('visibilitychange', onVis)
		}
	}, [])

	const handleEnable = () => {
		simplePlayer.unlockFromUserGesture()
		window.setTimeout(() => {
			const ctx = simplePlayer.getAudioContext()
			if (ctx?.state === 'running') setShow(false)
		}, 50)
	}

	if (!show) return null

	return (
		<div className="audio-unlock-prompt" role="region" aria-label="Enable app audio">
			<div className="audio-unlock-prompt__text">
				<p>
					<strong>App sounds (chords, practice):</strong> on phones and tablets this is separate from YouTube. Tap the button once to hear the flute sounds in this app.
				</p>
				<p className="audio-unlock-prompt__sub">
					<strong>App-geluid (akkoorden):</strong> op telefoon/tablet staat dit los van YouTube. Tik één keer op de knop om het geluid van deze app aan te zetten.
				</p>
			</div>
			<button type="button" className="btn-sm is-active audio-unlock-prompt__btn" onClick={handleEnable}>
				Enable app sound / Geluid aan
			</button>
		</div>
	)
}
