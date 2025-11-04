import { useState, useEffect } from 'react'
import { getCurrentUser, isAdmin, type User } from '../lib/authService'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient'

interface ManageUsersModalProps {
	isOpen: boolean
	onClose: () => void
	onShowToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number) => void
}

interface UserWithStats extends User {
	compositionsCount?: number
	progressionsCount?: number
	sharedItemsCount?: number
	completedLessonsCount?: number
	lastSignIn?: string
}

export function ManageUsersModal({ isOpen, onClose, onShowToast }: ManageUsersModalProps) {
	const [users, setUsers] = useState<UserWithStats[]>([])
	const [loading, setLoading] = useState(false)
	const [currentUser, setCurrentUser] = useState<User | null>(null)
	const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)

	// Check admin status and prevent non-admins from accessing
	useEffect(() => {
		const user = getCurrentUser()
		setCurrentUser(user)
		
		if (isOpen) {
			if (!user || !isAdmin(user)) {
				onShowToast?.('You must be an admin to manage users', 'error')
				onClose()
				return
			}
			// Only load users once when modal opens
			loadUsers()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen])

	const loadUsers = async () => {
		if (!isSupabaseConfigured()) {
			onShowToast?.('Supabase is not configured. User management requires Supabase.', 'error')
			return
		}

		const supabase = getSupabaseClient()
		if (!supabase) {
			onShowToast?.('Supabase client not available', 'error')
			return
		}

		setLoading(true)
		try {
			// Note: supabase.auth.admin methods require service role key (server-side only)
			// In browser, we can only get users from our own tables
			// Strategy: Try to get ALL users from profiles table first, then supplement with users from content tables
			
			// Try to get users from profiles table first if it exists
			// This should contain all registered users
			let profilesResult: any = null
			try {
				const { data, error } = await supabase.from('profiles').select('id, email, username, role, created_at')
				if (error) {
					console.warn('[ManageUsersModal] Profiles table query error:', error)
					// If profiles table doesn't exist, try to get emails from auth.users via a function
					// But we can't do this from browser without admin API
				} else {
					profilesResult = { data, error: null }
				}
			} catch (err) {
				// Profiles table might not exist, that's okay
				console.log('[ManageUsersModal] Profiles table not found or not accessible:', err)
			}
			
			// Try to get user emails from compositions table if they have user_email field
			// This is a fallback if profiles table doesn't exist
			let compositionsWithEmails: any[] = []
			try {
				const { data: compsData } = await supabase.from('compositions').select('user_id, user_email').limit(1000)
				if (compsData) {
					compositionsWithEmails = compsData.filter((c: any) => c.user_email)
				}
			} catch (err) {
				// Ignore - compositions might not have user_email field
			}

			// Get users from all tables that might have user references
			// This helps us find users who have created content even if profiles table doesn't exist
			const [compositionsResult, progressionsResult, sharedItemsResult, userProgressResult] = await Promise.all([
				supabase.from('compositions').select('user_id').limit(1000),
				supabase.from('progressions').select('user_id').limit(1000),
				supabase.from('shared_items').select('user_id').limit(1000),
				supabase.from('user_progress').select('user_id').limit(1000)
			])

			// Log any errors but don't fail completely
			if (compositionsResult.error) {
				console.warn('[ManageUsersModal] Error loading compositions:', compositionsResult.error)
			}
			if (progressionsResult.error) {
				console.warn('[ManageUsersModal] Error loading progressions:', progressionsResult.error)
			}
			if (sharedItemsResult.error) {
				console.warn('[ManageUsersModal] Error loading shared_items:', sharedItemsResult.error)
			}
			if (userProgressResult.error) {
				console.warn('[ManageUsersModal] Error loading user_progress:', userProgressResult.error)
			}

			// Get unique user IDs from all sources
			const userIds = new Set<string>()
			
			// PRIORITY 1: Add users from profiles table (should have all registered users)
			if (profilesResult?.data && Array.isArray(profilesResult.data)) {
				profilesResult.data.forEach((profile: any) => {
					if (profile.id) userIds.add(profile.id)
				})
				console.log(`[ManageUsersModal] Found ${profilesResult.data.length} user(s) in profiles table`)
			}
			
			// PRIORITY 2: Add users from compositions/progressions (users who created content)
			let contentUserCount = 0
			compositionsResult.data?.forEach(comp => {
				if (comp.user_id && !userIds.has(comp.user_id)) {
					userIds.add(comp.user_id)
					contentUserCount++
				}
			})
			progressionsResult.data?.forEach(prog => {
				if (prog.user_id && !userIds.has(prog.user_id)) {
					userIds.add(prog.user_id)
					contentUserCount++
				}
			})
			
			// PRIORITY 3: Add users from shared_items
			sharedItemsResult.data?.forEach(item => {
				if (item.user_id && !userIds.has(item.user_id)) {
					userIds.add(item.user_id)
					contentUserCount++
				}
			})
			
			// PRIORITY 4: Add users from user_progress (users who completed lessons)
			userProgressResult.data?.forEach(progress => {
				if (progress.user_id && !userIds.has(progress.user_id)) {
					userIds.add(progress.user_id)
					contentUserCount++
				}
			})
			
			if (contentUserCount > 0) {
				console.log(`[ManageUsersModal] Found ${contentUserCount} additional user(s) from content tables`)
			}

			// PRIORITY 5: Always add the currently logged-in user to the list, even if they haven't created content
			const { data: { session } } = await supabase.auth.getSession()
			if (session?.user?.id && !userIds.has(session.user.id)) {
				userIds.add(session.user.id)
				console.log(`[ManageUsersModal] Added current logged-in user: ${session.user.email}`)
			}
			
			if (userIds.size === 0) {
				setUsers([])
				setLoading(false)
				onShowToast?.('No users found. Users will appear here once they create content or make progress in lessons.', 'info')
				return
			}

			// Build user list
			const usersList: UserWithStats[] = []
			const profilesMap = new Map<string, any>()
			
			// Create map from profiles data
			if (profilesResult?.data) {
				profilesResult.data.forEach((profile: any) => {
					if (profile.id) {
						profilesMap.set(profile.id, profile)
					}
				})
			}
			
			// Create user objects
			for (const userId of userIds) {
				try {
					// Try to get user info from profiles table first
					const profile = profilesMap.get(userId)
					
					let user: UserWithStats
					if (profile) {
						// Use profile data
						user = {
							id: profile.id,
							email: profile.email || `User ${userId.substring(0, 8)}...`,
							username: profile.username,
							role: profile.role || 'user',
							createdAt: profile.created_at ? new Date(profile.created_at).getTime() : Date.now()
						}
					} else {
						// Create basic user object
						// First, try to get email from current session if this is the logged-in user
						let userEmail = `user-${userId.substring(0, 8)}@...`
						
						if (session && session.user?.id === userId) {
							// Current logged-in user - we have their email
							userEmail = session.user.email || userEmail
						} else {
							// Check if we have email from compositions table (if user_email field exists)
							const compWithEmail = compositionsWithEmails.find((c: any) => c.user_id === userId)
							if (compWithEmail?.user_email) {
								userEmail = compWithEmail.user_email
							}
						}
						
						user = {
							id: userId,
							email: userEmail,
							role: 'user',
							createdAt: Date.now()
						}
						
						// If this is the current user, we know their email from session
						if (session && session.user?.id === userId) {
							user.email = session.user.email || userEmail
							user.username = session.user.user_metadata?.username
							user.role = session.user.user_metadata?.role || 'user'
						}
					}
					
					usersList.push(user)
				} catch (err) {
					console.warn(`[ManageUsersModal] Could not process user ${userId}:`, err)
				}
			}

			// Load stats for each user
			for (const user of usersList) {
				const [compCount, progCount, sharedCount, progressCount] = await Promise.all([
					supabase.from('compositions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
					supabase.from('progressions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
					supabase.from('shared_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
					supabase.from('user_progress').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true)
				])

				user.compositionsCount = compCount.count || 0
				user.progressionsCount = progCount.count || 0
				user.sharedItemsCount = sharedCount.count || 0
				user.completedLessonsCount = progressCount.count || 0
			}

			setUsers(usersList)
			
			if (usersList.length > 0 && usersList.some(u => u.email === u.id)) {
				onShowToast?.('Note: Some user emails may not be available. Full user management requires server-side admin API.', 'info')
			}
			
			// Show info about why some users might not appear
			if (usersList.length > 0) {
				console.log(`[ManageUsersModal] Loaded ${usersList.length} user(s). Note: Only users who have created content or made progress appear here.`)
			}
		} catch (error) {
			console.error('[ManageUsersModal] Error loading users:', error)
			onShowToast?.('Failed to load users. Check console for details.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteUser = async (_user: UserWithStats) => {
		onShowToast?.('User deletion requires server-side admin API. This feature is not available in the browser.', 'error')
		// Note: supabase.auth.admin methods require service role key (server-side only)
		// This would need to be implemented via a server endpoint or Edge Function
	}

	if (!isOpen) return null

	return (
		<div className="library-overlay" onClick={onClose}>
			<div className="library-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
				<div className="panel-header">
					<h2 className="panel-title">Manage Users</h2>
					<div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
						<button
							className="icon-btn-sm"
							onClick={loadUsers}
							disabled={loading}
							aria-label="Refresh users"
							title="Refresh users"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
								<polyline points="23 4 23 10 17 10"></polyline>
								<polyline points="1 20 1 14 7 14"></polyline>
								<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
							</svg>
						</button>
						<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							</svg>
						</button>
					</div>
				</div>

				<div className="guide-content">
					{loading ? (
						<div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
							<p>Loading users...</p>
						</div>
					) : users.length === 0 ? (
						<div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
							<p style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--font-weight-semibold)' }}>No users found.</p>
							<p style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.7)', lineHeight: 1.6 }}>
								Users will appear here once they create compositions, progressions, share items, or make progress in lessons.
							</p>
							<p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.5)', marginTop: 'var(--space-3)' }}>
								Note: Full user management (viewing all users regardless of activity) requires server-side admin API access.
							</p>
						</div>
					) : (
						<div>
							<div style={{ marginBottom: 'var(--space-4)' }}>
								<p style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.7)' }}>
									Total users: {users.length}
								</p>
							</div>

							<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
								{users.map((user) => (
									<div
										key={user.id}
										style={{
											padding: 'var(--space-3)',
											border: 'var(--border-2) solid var(--color-black)',
											borderRadius: 'var(--radius-2)',
											background: selectedUser?.id === user.id ? 'rgba(0, 0, 0, 0.05)' : 'var(--color-white)',
											cursor: 'pointer',
											transition: 'background 0.2s ease',
											display: 'flex',
											gap: 'var(--space-3)',
											alignItems: 'flex-start'
										}}
										onClick={() => setSelectedUser(user)}
									>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1, minWidth: 0, gap: 'var(--space-3)' }}>
											<div style={{ flex: 1, minWidth: 0 }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', flexWrap: 'wrap' }}>
													<h3 style={{ 
														margin: 0, 
														fontSize: 'var(--font-size-base)', 
														fontWeight: 'var(--font-weight-semibold)',
														wordBreak: 'break-word',
														overflowWrap: 'break-word'
													}}>
														{user.email.includes('@') ? user.email : (
															<span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>
																{user.email}
															</span>
														)}
													</h3>
													{user.role === 'admin' && (
														<span style={{
															padding: '2px 8px',
															background: 'var(--color-black)',
															color: 'var(--color-white)',
															borderRadius: 'var(--radius-1)',
															fontSize: 'var(--font-size-xs)',
															fontWeight: 'var(--font-weight-semibold)',
															textTransform: 'uppercase',
															whiteSpace: 'nowrap'
														}}>
															Admin
														</span>
													)}
												</div>
												{user.username && (
													<p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'rgba(0, 0, 0, 0.6)' }}>
														Username: {user.username}
													</p>
												)}
												<div style={{ 
													marginTop: 'var(--space-2)', 
													display: 'flex', 
													flexWrap: 'wrap',
													gap: 'var(--space-3)', 
													fontSize: 'var(--font-size-xs)', 
													color: 'rgba(0, 0, 0, 0.6)' 
												}}>
													<span>Compositions: {user.compositionsCount || 0}</span>
													<span>Progressions: {user.progressionsCount || 0}</span>
													<span>Shared: {user.sharedItemsCount || 0}</span>
													<span>Completed Lessons: {user.completedLessonsCount || 0}</span>
												</div>
												{user.lastSignIn && (
													<p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.5)' }}>
														Last sign in: {new Date(user.lastSignIn).toLocaleDateString()}
													</p>
												)}
											</div>
											<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end', flexShrink: 0 }}>
												{user.id !== currentUser?.id && (
													<button
														className="btn-sm"
														onClick={(e) => {
															e.stopPropagation()
															handleDeleteUser(user)
														}}
														disabled={loading}
														style={{
															border: '2px solid #dc2626',
															color: '#dc2626',
															background: 'transparent',
															whiteSpace: 'nowrap',
															minWidth: '80px'
														}}
													>
														Delete
													</button>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

