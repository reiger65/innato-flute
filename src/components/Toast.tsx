import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
	id: string
	message: string
	type: ToastType
	duration?: number
}

interface ToastProps {
	toast: Toast
	onRemove: (id: string) => void
}

function ToastItem({ toast, onRemove }: ToastProps) {
	const [isVisible, setIsVisible] = useState(false)

	useEffect(() => {
		// Trigger fade-in animation
		setTimeout(() => setIsVisible(true), 10)

		// Auto-remove after duration
		const duration = toast.duration || 3000
		const timer = setTimeout(() => {
			setIsVisible(false)
			setTimeout(() => onRemove(toast.id), 300) // Wait for fade-out
		}, duration)

		return () => clearTimeout(timer)
	}, [toast.id, toast.duration, onRemove])

	const getToastStyles = () => {
		const baseStyles = {
			background: 'var(--color-white)',
			border: 'var(--border-2) solid var(--color-black)',
			borderRadius: 'var(--radius-2)',
			padding: 'var(--space-2) var(--space-3)',
			boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
			display: 'flex',
			alignItems: 'center',
			gap: 'var(--space-2)',
			minWidth: '250px',
			maxWidth: '400px',
			transition: 'all 0.3s ease',
			opacity: isVisible ? 1 : 0,
			transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
			pointerEvents: (isVisible ? 'auto' : 'none') as 'auto' | 'none'
		}

		switch (toast.type) {
			case 'success':
				return {
					...baseStyles,
					borderLeft: '4px solid rgba(0, 128, 0, 0.8)'
				}
			case 'error':
				return {
					...baseStyles,
					borderLeft: '4px solid rgba(255, 0, 0, 0.8)'
				}
			case 'warning':
				return {
					...baseStyles,
					borderLeft: '4px solid rgba(255, 165, 0, 0.8)'
				}
			default:
				return baseStyles
		}
	}

	const getIcon = () => {
		switch (toast.type) {
			case 'success':
				return (
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0, color: 'rgba(0, 128, 0, 0.8)' }}>
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
				)
			case 'error':
				return (
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0, color: 'rgba(255, 0, 0, 0.8)' }}>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
				)
			case 'warning':
				return (
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0, color: 'rgba(255, 165, 0, 0.8)' }}>
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
						<line x1="12" y1="9" x2="12" y2="13"></line>
						<line x1="12" y1="17" x2="12.01" y2="17"></line>
					</svg>
				)
			default:
				return (
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" style={{ flexShrink: 0 }}>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="16" x2="12" y2="12"></line>
						<line x1="12" y1="8" x2="12.01" y2="8"></line>
					</svg>
				)
		}
	}

	return (
		<div style={getToastStyles()}>
			{getIcon()}
			<span style={{ flex: 1, fontSize: 'var(--font-size-sm)', lineHeight: '1.4' }}>
				{toast.message}
			</span>
			<button
				onClick={() => {
					setIsVisible(false)
					setTimeout(() => onRemove(toast.id), 300)
				}}
				style={{
					background: 'transparent',
					border: 'none',
					cursor: 'pointer',
					padding: '4px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: 'var(--color-black)',
					opacity: 0.6,
					transition: 'opacity 0.2s ease',
					flexShrink: 0
				}}
				onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
				onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6' }}
				aria-label="Close notification"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
		</div>
	)
}

interface ToastContainerProps {
	toasts: Toast[]
	onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
	if (toasts.length === 0) return null

	return (
		<div
			style={{
				position: 'fixed',
				top: '80px',
				right: '20px',
				zIndex: 10000,
				display: 'flex',
				flexDirection: 'column',
				gap: 'var(--space-2)',
				maxWidth: '400px',
				pointerEvents: 'none'
			}}
			aria-live="polite"
			aria-atomic="false"
		>
			{toasts.map((toast) => (
				<div key={toast.id} style={{ pointerEvents: 'auto' }}>
					<ToastItem toast={toast} onRemove={onRemove} />
				</div>
			))}
		</div>
	)
}

// Hook for using toasts
export function useToast() {
	const [toasts, setToasts] = useState<Toast[]>([])

	const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		const newToast: Toast = { id, message, type, duration }
		setToasts((prev) => [...prev, newToast])
		return id
	}

	const removeToast = (id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id))
	}

	const showSuccess = (message: string, duration?: number) => showToast(message, 'success', duration)
	const showError = (message: string, duration?: number) => showToast(message, 'error', duration || 5000)
	const showWarning = (message: string, duration?: number) => showToast(message, 'warning', duration)
	const showInfo = (message: string, duration?: number) => showToast(message, 'info', duration)

	return {
		toasts,
		showToast,
		showSuccess,
		showError,
		showWarning,
		showInfo,
		removeToast
	}
}

