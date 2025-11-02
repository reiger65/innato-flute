import { useState, useEffect } from 'react'
import type { User } from '../lib/localAuth'
import { signUp, signIn, signOut, getCurrentUser } from '../lib/localAuth'

interface LoginPanelProps {
	onClose: () => void
	onAuthChange: (user: User | null) => void
}

type ViewMode = 'login' | 'signup'

export function LoginPanel({ onClose, onAuthChange }: LoginPanelProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('login')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [username, setUsername] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [currentUser, setCurrentUser] = useState<User | null>(null)

	// Check for existing session on mount
	useEffect(() => {
		const user = getCurrentUser()
		setCurrentUser(user)
		onAuthChange(user)
	}, [onAuthChange])

	const handleSignUp = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!email || !password) {
			setError('Please fill in all fields')
			setLoading(false)
			return
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters')
			setLoading(false)
			return
		}

		const result = signUp(email, password, username)
		setLoading(false)

		if (result.success && result.user) {
			setCurrentUser(result.user)
			onAuthChange(result.user)
			setEmail('')
			setPassword('')
			setUsername('')
		} else {
			setError(result.error || 'Failed to create account')
		}
	}

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!email || !password) {
			setError('Please fill in all fields')
			setLoading(false)
			return
		}

		const result = await signIn(email, password)
		setLoading(false)

		if (result.success && result.user) {
			setCurrentUser(result.user)
			onAuthChange(result.user)
			setEmail('')
			setPassword('')
		} else {
			setError(result.error || 'Invalid email or password')
		}
	}

	const handleSignOut = () => {
		signOut()
		setCurrentUser(null)
		onAuthChange(null)
	}

	const switchMode = (mode: ViewMode) => {
		setViewMode(mode)
		setError('')
		setEmail('')
		setPassword('')
		setUsername('')
	}

	return (
		<>
			<div className="library-overlay" onClick={onClose}></div>
			<div className="library-panel" onClick={(e) => e.stopPropagation()}>
				<div className="panel-header">
					<h2 className="panel-title">Account</h2>
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
					{currentUser ? (
						// Logged in view
						<div>
							<div style={{ marginBottom: '24px', padding: '16px', border: '2px solid var(--color-black)', borderRadius: '8px' }}>
								<p style={{ marginBottom: '8px', fontWeight: 'var(--font-weight-semibold)' }}>Logged in as:</p>
								<p style={{ marginBottom: '4px', fontSize: 'var(--font-size-base)' }}>{currentUser.username || currentUser.email}</p>
								<p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-black)', opacity: 0.7 }}>{currentUser.email}</p>
							</div>
							<button
								className="btn"
								onClick={handleSignOut}
								style={{ width: '100%' }}
							>
								Sign Out
							</button>
						</div>
					) : (
						// Login/Signup view
						<div>
							<div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid var(--color-black)', paddingBottom: '12px' }}>
								<button
									className={`tab ${viewMode === 'login' ? 'is-active' : ''}`}
									onClick={() => switchMode('login')}
									style={{ flex: 1 }}
								>
									Login
								</button>
								<button
									className={`tab ${viewMode === 'signup' ? 'is-active' : ''}`}
									onClick={() => switchMode('signup')}
									style={{ flex: 1 }}
								>
									Sign Up
								</button>
							</div>

							<form onSubmit={viewMode === 'login' ? handleSignIn : handleSignUp}>
								{viewMode === 'signup' && (
									<div style={{ marginBottom: '16px' }}>
										<label style={{ display: 'block', marginBottom: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
											Username (optional)
										</label>
										<input
											type="text"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											placeholder="Choose a username"
											style={{
												width: '100%',
												padding: '8px 12px',
												border: '2px solid var(--color-black)',
												borderRadius: '4px',
												fontSize: 'var(--font-size-sm)'
											}}
										/>
									</div>
								)}

								<div style={{ marginBottom: '16px' }}>
									<label style={{ display: 'block', marginBottom: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
										Email
									</label>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="your@email.com"
										required
										style={{
											width: '100%',
											padding: '8px 12px',
											border: '2px solid var(--color-black)',
											borderRadius: '4px',
											fontSize: 'var(--font-size-sm)'
										}}
									/>
								</div>

								<div style={{ marginBottom: '20px' }}>
									<label style={{ display: 'block', marginBottom: '8px', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
										Password
									</label>
									<input
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
										required
										minLength={6}
										style={{
											width: '100%',
											padding: '8px 12px',
											border: '2px solid var(--color-black)',
											borderRadius: '4px',
											fontSize: 'var(--font-size-sm)'
										}}
									/>
								</div>

								{error && (
									<div style={{ 
										marginBottom: '16px', 
										padding: '12px', 
										background: 'var(--color-white)', 
										border: '2px solid var(--color-black)', 
										borderRadius: '4px',
										color: 'var(--color-black)',
										fontSize: 'var(--font-size-sm)'
									}}>
										{error}
									</div>
								)}

								<button
									type="submit"
									className="btn"
									disabled={loading}
									style={{ width: '100%' }}
								>
									{loading ? 'Loading...' : viewMode === 'login' ? 'Sign In' : 'Create Account'}
								</button>
							</form>

							<p style={{ 
								marginTop: '24px', 
								fontSize: 'var(--font-size-xs)', 
								color: 'var(--color-black)', 
								opacity: 0.7,
								textAlign: 'center'
							}}>
								This is a local-only authentication system. Your data is stored on your device. Cloud sync will be available soon.
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	)
}


