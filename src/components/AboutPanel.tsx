
interface AboutPanelProps {
	onClose: () => void
}

export function AboutPanel({ onClose }: AboutPanelProps) {
	return (
		<>
			<div className="library-overlay" onClick={onClose}></div>
			<div className="library-panel" onClick={(e) => e.stopPropagation()}>
				<div className="panel-header">
					<h2 className="panel-title">About</h2>
					<button
						className="icon-btn-sm"
						aria-label="Close"
						onClick={onClose}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<div className="guide-content">
					<h3 className="guide-section-title">Welcome to Progressions</h3>

					<h3 className="guide-section-title">What is the INNATO Flute?</h3>
					<p className="guide-text">
						The word "Innato" means "inborn" or "innate" in Italian, reflecting the idea that the knowledge to play is already within you. This unique instrument is designed to feel intuitive, allowing you to express music that flows naturally from your body.
					</p>
					<p className="guide-text">
						This harmonic three-chambered instrument can be played purely for a personal experience or for another person. It can be played by hand, on a second person's head for an extra 3-dimensional experience, or in any number of comfortable ways.
					</p>

					<h3 className="guide-section-title">Philosophy</h3>
					<p className="guide-text">
						The INNATO connects sonically to our pure innateness and is playable by anyone with hands and ears. In just a few minutes, it gives an experience that shifts or opens your perception of the moment.
					</p>
					<p className="guide-text">
						As you explore its tones and rhythms, you'll discover that playing the INNATO is less about learning and more about remembering what you already know.
					</p>

					<h3 className="guide-section-title">Unique Sound Experience</h3>
					<p className="guide-text">
						All possible combinations of fingers create only beautiful three-note chords. The chords available eliminate all intervals that are not initially pleasant to people's ears.
					</p>
					<p className="guide-text">
						The INNATO can also dissolve the distinction between the performer and the audience. A player can deliver a three-dimensional sound experience for another person by covering their head in sound. Because the two back chambers resonate directly into the inner ear and the front chamber resonates through the front fontanel, the brain perceives that you are actually within the sound.
					</p>
				</div>
			</div>
		</>
	)
}
