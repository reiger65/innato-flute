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
			// Get users from compositions/progressions tables
			const [compositionsResult, progressionsResult] = await Promise.all([
				supabase.from('compositions').select('user_id, created_by'),
				supabase.from('progressions').select('user_id, created_by')
			])

			if (compositionsResult.error) {
				console.error('[ManageUsersModal] Error loading compositions:', compositionsResult.error)
			}
			if (progressionsResult.error) {
				console.error('[ManageUsersModal] Error loading progressions:', progressionsResult.error)
			}

			// Get unique user IDs
			const userIds = new Set<string>()
			compositionsResult.data?.forEach(comp => {
				if (comp.user_id) userIds.add(comp.user_id)
				if (comp.created_by) userIds.add(comp.created_by)
			})
			progressionsResult.data?.forEach(prog => {
				if (prog.user_id) userIds.add(prog.user_id)
				if (prog.created_by) userIds.add(prog.created_by)
			})

			if (userIds.size === 0) {
				setUsers([])
				setLoading(false)
				return
			}

			// For each user ID, try to get their email from auth metadata
			// We can't use admin API from browser, so we'll create a basic user list
			// from what we can see in the database
			const usersList: UserWithStats[] = []
			
			// Get current session to see if we can get user info
			const { data: { session } } = await supabase.auth.getSession()
			
			// Try to get user info from profiles table if it exists, or use IDs
			for (const userId of userIds) {
				try {
					// Try to get user info from a profiles table if it exists
					// Otherwise, create a basic user object
					const user: UserWithStats = {
						id: userId,
						email: userId, // Fallback: use ID as email if we can't get email
						role: 'user',
						createdAt: Date.now()
					}
					
					// If this is the current user, we know their email
					if (session?.user?.id === userId) {
						user.email = session.user.email || userId
						user.username = session.user.user_metadata?.username
						user.role = session.user.user_metadata?.role || 'user'
					}
					
					usersList.push(user)
				} catch (err) {
					console.warn(`[ManageUsersModal] Could not process user ${userId}:`, err)
				}
			}

			// Load stats for each user
			for (const user of usersList) {
				const [compCount, progCount, sharedCount] = await Promise.all([
					supabase.from('compositions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
					supabase.from('progressions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
					supabase.from('shared_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
				])

				user.compositionsCount = compCount.count || 0
				user.progressionsCount = progCount.count || 0
				user.sharedItemsCount = sharedCount.count || 0
			}

			setUsers(usersList)
			
			if (usersList.length > 0 && usersList[0].email === usersList[0].id) {
				onShowToast?.('Note: User management requires server-side admin API. Email addresses may not be available.', 'info')
			}
		} catch (error) {
			console.error('[ManageUsersModal] Error loading users:', error)
			onShowToast?.('Failed to load users. Admin API calls require server-side access.', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleToggleAdmin = async (_user: UserWithStats) => {
		onShowToast?.('User role management requires server-side admin API. This feature is not available in the browser.', 'error')
		// Note: supabase.auth.admin methods require service role key (server-side only)
		// This would need to be implemented via a server endpoint or Edge Function
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
							<p>No users found.</p>
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
											transition: 'background 0.2s ease'
										}}
										onClick={() => setSelectedUser(user)}
									>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
											<div style={{ flex: 1 }}>
												<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
													<h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-semibold)' }}>
														{user.email}
													</h3>
													{user.role === 'admin' && (
														<span style={{
															padding: '2px 8px',
															background: 'var(--color-black)',
															color: 'var(--color-white)',
															borderRadius: 'var(--radius-1)',
															fontSize: 'var(--font-size-xs)',
															fontWeight: 'var(--font-weight-semibold)',
															textTransform: 'uppercase'
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
												<div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.6)' }}>
													<span>Compositions: {user.compositionsCount || 0}</span>
													<span>Progressions: {user.progressionsCount || 0}</span>
													<span>Shared: {user.sharedItemsCount || 0}</span>
												</div>
												{user.lastSignIn && (
													<p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.5)' }}>
														Last sign in: {new Date(user.lastSignIn).toLocaleDateString()}
													</p>
												)}
											</div>
											<div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
												<button
													className="btn-sm"
													onClick={(e) => {
														e.stopPropagation()
														handleToggleAdmin(user)
													}}
													disabled={loading || user.id === currentUser?.id}
													style={{
														border: `2px solid ${user.role === 'admin' ? '#dc2626' : '#2563eb'}`,
														color: user.role === 'admin' ? '#dc2626' : '#2563eb',
														background: 'transparent'
													}}
													title={user.id === currentUser?.id ? 'Cannot change your own role' : user.role === 'admin' ? 'Remove admin' : 'Make admin'}
												>
													{user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
												</button>
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
															background: 'transparent'
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

