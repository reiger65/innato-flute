import { useState, useEffect } from 'react'
import type { User } from '../lib/authService'
import { signUp, signIn, signInWithMagicLink, signOut, getCurrentUser } from '../lib/authService'

interface LoginPanelProps {
	onClose: () => void
	onAuthChange: (user: User | null) => void
}

type ViewMode = 'login' | 'signup' | 'magiclink'

export function LoginPanel({ onClose, onAuthChange }: LoginPanelProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('login')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [username, setUsername] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [magicLinkSent, setMagicLinkSent] = useState(false)
	const [currentUser, setCurrentUser] = useState<User | null>(null)

	// Check for existing session on mount
	useEffect(() => {
		const user = getCurrentUser()
		setCurrentUser(user)
		onAuthChange(user)
	}, [onAuthChange])

	// Handle magic link callback from URL
	useEffect(() => {
		const handleMagicLinkCallback = async () => {
			const urlParams = new URLSearchParams(window.location.search)
			const accessToken = urlParams.get('access_token')
			const type = urlParams.get('type')
			
			if (accessToken && type === 'magiclink') {
				// User clicked magic link, they're now authenticated
				const user = getCurrentUser()
				if (user) {
					setCurrentUser(user)
					onAuthChange(user)
					// Clean up URL
					window.history.replaceState({}, document.title, window.location.pathname)
				}
			}
		}
		
		handleMagicLinkCallback()
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

		const result = await signUp(email, password, username)
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

		try {
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
		} catch (error) {
			console.error('Login error:', error)
			setLoading(false)
			setError('An error occurred during login. Please try again.')
		}
	}

	const handleMagicLink = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!email) {
			setError('Please enter your email address')
			setLoading(false)
			return
		}

		const result = await signInWithMagicLink(email)
		setLoading(false)

		if (result.success) {
			setMagicLinkSent(true)
		} else {
			setError(result.error || 'Failed to send magic link')
		}
	}

	const handleSignOut = async () => {
		await signOut()
		setCurrentUser(null)
		onAuthChange(null)
	}

	const switchMode = (mode: ViewMode) => {
		setViewMode(mode)
		setError('')
		setEmail('')
		setPassword('')
		setUsername('')
		setMagicLinkSent(false)
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
							<div style={{ 
								marginBottom: 'var(--space-4)', 
								padding: 'var(--space-4)', 
								border: 'var(--border-2) solid var(--color-black)', 
								borderRadius: 'var(--radius-2)',
								background: 'var(--color-white)'
							}}>
								<p style={{ 
									marginBottom: 'var(--space-2)', 
									fontSize: 'var(--font-size-xs)', 
									fontWeight: 'var(--font-weight-semibold)',
									textTransform: 'uppercase',
									letterSpacing: '0.5px',
									color: 'rgba(0, 0, 0, 0.6)'
								}}>Logged in as</p>
								<p style={{ 
									marginBottom: 'var(--space-1)', 
									fontSize: 'var(--font-size-base)', 
									fontWeight: 'var(--font-weight-semibold)'
								}}>{currentUser.username || currentUser.email}</p>
								<p style={{ 
									fontSize: 'var(--font-size-sm)', 
									color: 'rgba(0, 0, 0, 0.7)'
								}}>{currentUser.email}</p>
							</div>
							<button
								className="btn"
								onClick={handleSignOut}
								style={{ width: '100%' }}
							>
								Sign Out
							</button>
						</div>
					) : magicLinkSent ? (
						// Magic link sent confirmation
						<div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
							<div style={{ 
								marginBottom: 'var(--space-4)',
								width: '64px',
								height: '64px',
								margin: '0 auto var(--space-4)',
								borderRadius: '50%',
								background: 'var(--color-black)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								color: 'var(--color-white)'
							}}>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
									<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
									<polyline points="22,6 12,13 2,6"></polyline>
								</svg>
							</div>
							<h3 style={{ 
								fontSize: 'var(--font-size-lg)', 
								fontWeight: 'var(--font-weight-bold)',
								marginBottom: 'var(--space-2)'
							}}>Check your email</h3>
							<p style={{ 
								fontSize: 'var(--font-size-sm)', 
								color: 'rgba(0, 0, 0, 0.7)',
								marginBottom: 'var(--space-4)',
								lineHeight: 1.6
							}}>
								We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
							</p>
							<button
								className="btn-sm"
								onClick={() => switchMode('login')}
								style={{ width: '100%' }}
							>
								Back to login
							</button>
						</div>
					) : (
						// Login/Signup/Magic Link view
						<div>
							{/* Tab Navigation */}
							<div style={{ 
								display: 'flex', 
								gap: 'var(--space-1)', 
								marginBottom: 'var(--space-4)', 
								borderBottom: 'var(--border-2) solid var(--color-black)',
								paddingBottom: 'var(--space-2)'
							}}>
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
								<button
									className={`tab ${viewMode === 'magiclink' ? 'is-active' : ''}`}
									onClick={() => switchMode('magiclink')}
									style={{ flex: 1 }}
									title="Passwordless login"
								>
									Magic Link
								</button>
							</div>

							{/* Form */}
							<form onSubmit={
								viewMode === 'magiclink' ? handleMagicLink :
								viewMode === 'login' ? handleSignIn : handleSignUp
							}>
								{viewMode === 'signup' && (
									<div style={{ marginBottom: 'var(--space-3)' }}>
										<label style={{ 
											display: 'block', 
											marginBottom: 'var(--space-1)', 
											fontSize: 'var(--font-size-xs)', 
											fontWeight: 'var(--font-weight-semibold)',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
											color: 'rgba(0, 0, 0, 0.7)'
										}}>
											Username (optional)
										</label>
										<input
											type="text"
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											placeholder="Choose a username"
											className="modal-input"
										/>
									</div>
								)}

								<div style={{ marginBottom: 'var(--space-3)' }}>
									<label style={{ 
										display: 'block', 
										marginBottom: 'var(--space-1)', 
										fontSize: 'var(--font-size-xs)', 
										fontWeight: 'var(--font-weight-semibold)',
										textTransform: 'uppercase',
										letterSpacing: '0.5px',
										color: 'rgba(0, 0, 0, 0.7)'
									}}>
										Email
									</label>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="your@email.com"
										required
										className="modal-input"
										autoComplete="email"
									/>
								</div>

								{viewMode !== 'magiclink' && (
									<div style={{ marginBottom: 'var(--space-4)' }}>
										<label style={{ 
											display: 'block', 
											marginBottom: 'var(--space-1)', 
											fontSize: 'var(--font-size-xs)', 
											fontWeight: 'var(--font-weight-semibold)',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
											color: 'rgba(0, 0, 0, 0.7)'
										}}>
											Password
										</label>
										<input
											type="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											required
											minLength={6}
											className="modal-input"
											autoComplete={viewMode === 'signup' ? 'new-password' : 'current-password'}
										/>
										{viewMode === 'signup' && (
											<p style={{ 
												marginTop: 'var(--space-1)', 
												fontSize: 'var(--font-size-xs)', 
												color: 'rgba(0, 0, 0, 0.6)'
											}}>
												Minimum 6 characters
											</p>
										)}
									</div>
								)}

								{viewMode === 'magiclink' && (
									<div style={{ 
										marginBottom: 'var(--space-4)',
										padding: 'var(--space-3)',
										background: 'rgba(0, 0, 0, 0.05)',
										borderRadius: 'var(--radius-2)',
										border: 'var(--border-1) solid rgba(0, 0, 0, 0.1)'
									}}>
										<p style={{ 
											fontSize: 'var(--font-size-xs)', 
											color: 'rgba(0, 0, 0, 0.7)',
											margin: 0,
											lineHeight: 1.5
										}}>
											✨ No password needed! We'll send you a secure link to sign in.
										</p>
									</div>
								)}

								{error && (
									<div style={{ 
										marginBottom: 'var(--space-3)', 
										padding: 'var(--space-3)', 
										background: 'var(--color-white)', 
										border: 'var(--border-2) solid var(--color-black)', 
										borderRadius: 'var(--radius-2)',
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
									style={{ width: '100%', marginBottom: 'var(--space-3)' }}
								>
									{loading ? 'Loading...' : 
									 viewMode === 'magiclink' ? 'Send Magic Link' :
									 viewMode === 'login' ? 'Sign In' : 'Create Account'}
								</button>

								{viewMode === 'magiclink' && (
									<div style={{ 
										marginTop: 'var(--space-4)',
										paddingTop: 'var(--space-4)',
										borderTop: 'var(--border-1) solid rgba(0, 0, 0, 0.2)'
									}}>
										<button
											type="button"
											className="btn-sm"
											onClick={() => switchMode('login')}
											style={{ width: '100%' }}
										>
											Use password instead
										</button>
									</div>
								)}
							</form>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
