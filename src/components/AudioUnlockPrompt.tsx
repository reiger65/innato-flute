import { useEffect, useState } from 'react'
import { simplePlayer } from '../lib/simpleAudioPlayer'

function isAppleTouchDevice(): boolean {
	if (typeof navigator === 'undefined') return false
	const ua = navigator.userAgent
	if (/iPad|iPhone|iPod/.test(ua)) return true
	if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true
	return false
}

/** Short tap-to-unlock hint for Safari/iOS Web Audio — no YouTube copy. */
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

	const handleTap = () => {
		simplePlayer.unlockFromUserGesture()
		window.setTimeout(() => {
			const ctx = simplePlayer.getAudioContext()
			if (ctx?.state === 'running') setShow(false)
		}, 50)
	}

	if (!show) return null

	return (
		<div className="audio-unlock-prompt" role="region" aria-label="Enable sound">
			<p className="audio-unlock-prompt__text">
				<strong>Tap once</strong> to turn on sounds in this app. — <strong>Tik één keer</strong> om het geluid van deze app aan te zetten.
			</p>
			<button type="button" className="btn-sm is-active audio-unlock-prompt__btn" onClick={handleTap}>
				Tap here / Tik hier
			</button>
		</div>
	)
}
