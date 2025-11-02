import type { ReactNode } from 'react'

interface SectionInfoModalProps {
	isOpen: boolean
	onClose: () => void
	title: string
	children: ReactNode
}

export function SectionInfoModal({ isOpen, onClose, title, children }: SectionInfoModalProps) {
	if (!isOpen) return null

	return (
		<div className="section-info-modal-overlay" onClick={onClose}>
			<div className="section-info-modal" onClick={(e) => e.stopPropagation()}>
				<div className="section-info-modal-header">
					<h2 className="section-info-modal-title">{title}</h2>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				<div className="section-info-modal-content">
					{children}
				</div>
			</div>
		</div>
	)
}

