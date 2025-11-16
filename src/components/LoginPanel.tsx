import { useState, useEffect } from 'react'
import type { User } from '../lib/authService'
import { signUp, signIn, signInWithMagicLink, resetPassword, updatePassword, signOut, getCurrentUser, isAdmin } from '../lib/authService'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient'

interface LoginPanelProps {
	onClose: () => void
	onAuthChange: (user: User | null) => void
	onShowManageUsers?: () => void
}

type ViewMode = 'login' | 'signup' | 'magiclink' | 'resetpassword' | 'setnewpassword'

export function LoginPanel({ onClose, onAuthChange, onShowManageUsers }: LoginPanelProps) {
	const [viewMode, setViewMode] = useState<ViewMode>('login')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [username, setUsername] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const [magicLinkSent, setMagicLinkSent] = useState(false)
	const [passwordResetSent, setPasswordResetSent] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [currentUser, setCurrentUser] = useState<User | null>(null)

	// Check for existing session on mount
	useEffect(() => {
		const user = getCurrentUser()
		setCurrentUser(user)
		onAuthChange(user)
	}, [onAuthChange])

	// Handle magic link and password reset callbacks from URL
	useEffect(() => {
		const handleAuthCallback = async () => {
			const urlParams = new URLSearchParams(window.location.search)
			const accessToken = urlParams.get('access_token')
			const type = urlParams.get('type')
			
			if (accessToken && type === 'magiclink') {
				// User clicked magic link, they're now authenticated
				// Get session from Supabase to properly extract user
				if (isSupabaseConfigured()) {
					const supabase = getSupabaseClient()
					if (supabase) {
						try {
							const { data: { session }, error } = await supabase.auth.getSession()
							if (error) {
								console.error('[LoginPanel] Error getting session:', error)
								setError('Failed to authenticate. Please try logging in again.')
								return
							}
							
							if (session?.user) {
								// Create user object from session
								const user: User = {
									id: session.user.id,
									email: session.user.email || '',
									username: session.user.user_metadata?.username,
									role: session.user.user_metadata?.role || 'user',
									createdAt: new Date(session.user.created_at).getTime()
								}
								
								// Verify admin status - only set user if they're actually an admin or regular user
								// This ensures buttons only show for real admins
								setCurrentUser(user)
								onAuthChange(user)
								// Clean up URL
								window.history.replaceState({}, document.title, window.location.pathname)
								// Auto-close after a brief delay
								setTimeout(() => {
									onClose()
								}, 500)
							} else {
								setError('Session not found. Please try logging in again.')
							}
						} catch (error) {
							console.error('[LoginPanel] Error handling magic link callback:', error)
							setError('Failed to authenticate. Please try logging in again.')
						}
					} else {
						// Fallback to sync getCurrentUser
						const user = getCurrentUser()
						if (user) {
							setCurrentUser(user)
							onAuthChange(user)
							window.history.replaceState({}, document.title, window.location.pathname)
							// Auto-close after a brief delay
							setTimeout(() => {
								onClose()
							}, 500)
						}
					}
				} else {
					// Fallback to sync getCurrentUser
					const user = getCurrentUser()
					if (user) {
						setCurrentUser(user)
						onAuthChange(user)
						window.history.replaceState({}, document.title, window.location.pathname)
						// Auto-close after a brief delay
						setTimeout(() => {
							onClose()
						}, 500)
					}
				}
			} else if (accessToken && type === 'recovery') {
				// User clicked password reset link - show password reset form
				// Check if we have a session (user is authenticated via the reset link)
				if (isSupabaseConfigured()) {
					const supabase = getSupabaseClient()
					if (supabase) {
						try {
							const { data: { session }, error } = await supabase.auth.getSession()
							if (!error && session?.user) {
								setViewMode('setnewpassword')
								setEmail(session.user.email || '')
								window.history.replaceState({}, document.title, window.location.pathname)
								return
							}
						} catch (error) {
							console.error('[LoginPanel] Error getting session for password reset:', error)
						}
					}
				}
				
				// Fallback: wait a bit for session to be established
				setTimeout(() => {
					const userAfterDelay = getCurrentUser()
					if (userAfterDelay) {
						setViewMode('setnewpassword')
						setEmail(userAfterDelay.email)
					} else {
						setError('Invalid or expired password reset link. Please request a new one.')
					}
				}, 500)
				// Clean up URL
				window.history.replaceState({}, document.title, window.location.pathname)
			}
		}
		
		handleAuthCallback()
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

		if (result.success) {
			if (result.user) {
				// User created and logged in immediately (no email confirmation required)
				setCurrentUser(result.user)
				onAuthChange(result.user)
				setEmail('')
				setPassword('')
				setUsername('')
				// Auto-close after a brief delay to show success
				setTimeout(() => {
					onClose()
				}, 1000)
			} else {
				// User created but email confirmation required
				setError('Account created! Please check your email to confirm your account before logging in.')
				// Switch to login view after a delay
				setTimeout(() => {
					switchMode('login')
					setError('')
				}, 3000)
			}
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
				// Auto-close after a brief delay to show success
				setTimeout(() => {
					onClose()
				}, 1000)
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

	const handlePasswordReset = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!email) {
			setError('Please enter your email address')
			setLoading(false)
			return
		}

		const result = await resetPassword(email)
		setLoading(false)

		if (result.success) {
			setPasswordResetSent(true)
		} else {
			setError(result.error || 'Failed to send password reset email')
		}
	}

	const handleSetNewPassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (!newPassword || newPassword.length < 6) {
			setError('Password must be at least 6 characters')
			setLoading(false)
			return
		}

		if (newPassword !== confirmPassword) {
			setError('Passwords do not match')
			setLoading(false)
			return
		}

		const result = await updatePassword(newPassword)
		setLoading(false)

		if (result.success) {
			// Password updated successfully
			const user = getCurrentUser()
			if (user) {
				setCurrentUser(user)
				onAuthChange(user)
				setNewPassword('')
				setConfirmPassword('')
				setViewMode('login')
				// Auto-close after a brief delay to show success
				setTimeout(() => {
					onClose()
				}, 1000)
			} else {
				setError('Password updated, but login failed. Please try logging in.')
			}
		} else {
			setError(result.error || 'Failed to update password')
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
		setNewPassword('')
		setConfirmPassword('')
		setMagicLinkSent(false)
		setPasswordResetSent(false)
		setShowPassword(false)
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
								style={{ width: '100%', marginBottom: 'var(--space-2)' }}
							>
								Sign Out
							</button>
							{currentUser && isAdmin(currentUser) && onShowManageUsers && (
								<button
									className="btn-sm"
									onClick={() => {
										onClose()
										onShowManageUsers()
									}}
									style={{ 
										width: '100%',
										border: '2px solid #dc2626',
										color: '#dc2626',
										background: 'transparent',
										marginBottom: 'var(--space-4)'
									}}
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
										<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
										<circle cx="9" cy="7" r="4"></circle>
										<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
										<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
									</svg>
									Manage Users
								</button>
							)}

							{/* Support Information */}
							<div style={{ 
								marginTop: 'var(--space-4)',
								paddingTop: 'var(--space-4)',
								borderTop: 'var(--border-1) solid rgba(0, 0, 0, 0.2)',
								textAlign: 'center',
								paddingBottom: 'var(--space-2)'
							}}>
								<p style={{ 
									fontSize: 'var(--font-size-sm)', 
									color: 'rgba(0, 0, 0, 0.7)',
									margin: 0,
									lineHeight: 1.6
								}}>
									Need support? Contact us at{' '}
									<a 
										href="mailto:support@stonewhistle.com" 
										style={{ 
											color: 'var(--color-black)', 
											textDecoration: 'underline',
											fontWeight: 'var(--font-weight-semibold)'
										}}
									>
										support@stonewhistle.com
									</a>
								</p>
							</div>
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
					) : passwordResetSent ? (
						// Password reset sent confirmation
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
								We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to set a new password.
							</p>
							<button
								className="btn-sm"
								onClick={() => switchMode('login')}
								style={{ width: '100%' }}
							>
								Back to login
							</button>
						</div>
					) : viewMode === 'setnewpassword' ? (
						// Set new password form (after clicking reset link)
						<div>
							<div style={{ 
								marginBottom: 'var(--space-4)',
								padding: 'var(--space-3)',
								background: 'rgba(0, 0, 0, 0.05)',
								borderRadius: 'var(--radius-2)',
								border: 'var(--border-1) solid rgba(0, 0, 0, 0.1)'
							}}>
								<p style={{ 
									fontSize: 'var(--font-size-sm)', 
									color: 'rgba(0, 0, 0, 0.7)',
									margin: 0,
									lineHeight: 1.5
								}}>
									Enter your new password below. Make sure it's at least 6 characters long.
								</p>
							</div>
							<form onSubmit={handleSetNewPassword}>
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
										New Password
									</label>
									<div style={{ position: 'relative' }}>
										<input
											type={showPassword ? 'text' : 'password'}
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											placeholder="••••••••"
											required
											minLength={6}
											className="modal-input"
											autoComplete="new-password"
											style={{ paddingRight: '40px' }}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											style={{
												position: 'absolute',
												right: '8px',
												top: '50%',
												transform: 'translateY(-50%)',
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												padding: '4px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'rgba(0, 0, 0, 0.5)',
												transition: 'color 0.2s ease'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'
											}}
											aria-label={showPassword ? 'Hide password' : 'Show password'}
											title={showPassword ? 'Hide password' : 'Show password'}
										>
											{showPassword ? (
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
													<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
													<line x1="1" y1="1" x2="23" y2="23"></line>
												</svg>
											) : (
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
													<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
													<circle cx="12" cy="12" r="3"></circle>
												</svg>
											)}
										</button>
									</div>
								</div>

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
										Confirm Password
									</label>
									<div style={{ position: 'relative' }}>
										<input
											type={showPassword ? 'text' : 'password'}
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											placeholder="••••••••"
											required
											minLength={6}
											className="modal-input"
											autoComplete="new-password"
											style={{ paddingRight: '40px' }}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											style={{
												position: 'absolute',
												right: '8px',
												top: '50%',
												transform: 'translateY(-50%)',
												background: 'none',
												border: 'none',
												cursor: 'pointer',
												padding: '4px',
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												color: 'rgba(0, 0, 0, 0.5)',
												transition: 'color 0.2s ease'
											}}
											onMouseEnter={(e) => {
												e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'
											}}
											onMouseLeave={(e) => {
												e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'
											}}
											aria-label={showPassword ? 'Hide password' : 'Show password'}
											title={showPassword ? 'Hide password' : 'Show password'}
										>
											{showPassword ? (
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
													<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
													<line x1="1" y1="1" x2="23" y2="23"></line>
												</svg>
											) : (
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
													<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
													<circle cx="12" cy="12" r="3"></circle>
												</svg>
											)}
										</button>
									</div>
								</div>

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
									{loading ? 'Updating...' : 'Set New Password'}
								</button>

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
										Back to login
									</button>
								</div>
							</form>
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
								viewMode === 'resetpassword' ? handlePasswordReset :
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

								{viewMode !== 'magiclink' && viewMode !== 'resetpassword' && (
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
										<div style={{ position: 'relative' }}>
											<input
												type={showPassword ? 'text' : 'password'}
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												placeholder="••••••••"
												required
												minLength={6}
												className="modal-input"
												autoComplete={viewMode === 'signup' ? 'new-password' : 'current-password'}
												style={{ paddingRight: '40px' }}
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												style={{
													position: 'absolute',
													right: '8px',
													top: '50%',
													transform: 'translateY(-50%)',
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													padding: '4px',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													color: 'rgba(0, 0, 0, 0.5)',
													transition: 'color 0.2s ease'
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'
												}}
												aria-label={showPassword ? 'Hide password' : 'Show password'}
												title={showPassword ? 'Hide password' : 'Show password'}
											>
												{showPassword ? (
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
														<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
														<line x1="1" y1="1" x2="23" y2="23"></line>
													</svg>
												) : (
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
														<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
														<circle cx="12" cy="12" r="3"></circle>
													</svg>
												)}
											</button>
										</div>
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

								{viewMode === 'login' && (
									<div style={{ marginBottom: 'var(--space-3)', textAlign: 'right' }}>
										<button
											type="button"
											onClick={() => switchMode('resetpassword')}
											style={{
												background: 'none',
												border: 'none',
												color: 'rgba(0, 0, 0, 0.7)',
												fontSize: 'var(--font-size-xs)',
												cursor: 'pointer',
												textDecoration: 'underline',
												padding: 0
											}}
										>
											Forgot password?
										</button>
									</div>
								)}

								{viewMode === 'resetpassword' && (
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
											Enter your email address and we'll send you a link to reset your password.
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
									 viewMode === 'resetpassword' ? 'Send Reset Link' :
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

								{viewMode === 'resetpassword' && (
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
											Back to login
										</button>
									</div>
								)}
							</form>

							{/* Support Information */}
							<div style={{ 
								marginTop: 'var(--space-4)',
								paddingTop: 'var(--space-4)',
								borderTop: 'var(--border-1) solid rgba(0, 0, 0, 0.2)',
								textAlign: 'center',
								paddingBottom: 'var(--space-2)'
							}}>
								<p style={{ 
									fontSize: 'var(--font-size-sm)', 
									color: 'rgba(0, 0, 0, 0.7)',
									margin: 0,
									lineHeight: 1.6
								}}>
									Need support? Contact us at{' '}
									<a 
										href="mailto:support@stonewhistle.com" 
										style={{ 
											color: 'var(--color-black)', 
											textDecoration: 'underline',
											fontWeight: 'var(--font-weight-semibold)'
										}}
									>
										support@stonewhistle.com
									</a>
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}
