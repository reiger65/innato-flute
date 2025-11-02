/**
 * Supabase Authentication Service
 * 
 * Supabase implementation of authentication.
 * Falls back to localStorage if Supabase is not configured.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import type { User, AuthResult } from './authService'
import { 
	getCurrentUser as localGetCurrentUser,
	signUp as localSignUp,
	signIn as localSignIn,
	signOut as localSignOut
} from './localAuth'

/**
 * Check if current user is an admin
 * For Supabase: checks user metadata or role
 * Falls back to local check if Supabase not configured
 */
export function isAdmin(user: User | null): boolean {
	if (!user) return false
	
	// If Supabase is configured, check user metadata
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			// Admin check will be implemented via Supabase user metadata
			// For now, check email (can be moved to database later)
			const adminEmails = ['admin@innato.com', 'hanshoukes@gmail.com', 'info@stonewhistle.com']
			return adminEmails.includes(user.email.toLowerCase())
		}
	}
	
	// Fallback to local check
	const adminEmails = ['admin@innato.com', 'hanshoukes@gmail.com', 'info@stonewhistle.com']
	const adminUsernames = ['admin', 'hanshoukes']
	return adminEmails.includes(user.email.toLowerCase()) || 
	       (user.username && adminUsernames.includes(user.username.toLowerCase())) ||
	       user.role === 'admin'
}

// Cache voor Supabase session (wordt gezet na sign in)
let cachedSupabaseUser: User | null = null

/**
 * Get current user from Supabase session or localStorage
 * Note: This checks cached session first, then localStorage
 * For real-time updates, use onAuthStateChange listener
 */
export function getCurrentUser(): User | null {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			// Return cached user if available
			if (cachedSupabaseUser) {
				return cachedSupabaseUser
			}
			
			// Try to get from Supabase's localStorage
			// Supabase stores session in: sb-<project-ref>-auth-token
			try {
				const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
				if (supabaseUrl) {
					const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
					if (projectRef) {
						const storageKey = `sb-${projectRef}-auth-token`
						const sessionData = localStorage.getItem(storageKey)
						if (sessionData) {
							try {
								const parsed = JSON.parse(sessionData)
								// Supabase stores session in different formats, check both
								const session = parsed?.currentSession || parsed
								if (session?.user) {
									const userData = session.user
									const user: User = {
										id: userData.id,
										email: userData.email || '',
										username: userData.user_metadata?.username,
										role: userData.user_metadata?.role,
										createdAt: new Date(userData.created_at).getTime()
									}
									cachedSupabaseUser = user
									return user
								}
							} catch (e) {
								// Ignore parse errors
							}
						}
					}
				}
			} catch (error) {
				console.error('Error getting Supabase session:', error)
			}
			
			// Also try async getSession as fallback (but we need sync, so this is just for initialization)
			// In practice, we should use onAuthStateChange listener to update cache
		}
	}
	
	// Fallback to localStorage
	return localGetCurrentUser() as User | null
}

/**
 * Update cached user (call after sign in/up)
 */
export function setCachedUser(user: User | null): void {
	cachedSupabaseUser = user
}

/**
 * Sign up with Supabase or localStorage
 */
export async function signUp(email: string, password: string, username?: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			try {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: username || email.split('@')[0]
						}
					}
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				if (data.user) {
					const user: User = {
						id: data.user.id,
						email: data.user.email || email,
						username: data.user.user_metadata?.username || username,
						role: data.user.user_metadata?.role,
						createdAt: Date.now()
					}
					setCachedUser(user)
					return { success: true, user }
				}
			} catch (error) {
				console.error('Supabase signup error:', error)
				return { success: false, error: 'Sign up failed. Please try again.' }
			}
		}
	}
	
	// Fallback to localStorage
	return localSignUp(email, password, username)
}

/**
 * Sign in with Supabase or localStorage
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	console.log('🔍 signIn called, checking Supabase config...')
	console.log('   - isSupabaseConfigured:', isSupabaseConfigured())
	
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		console.log('   - supabase client:', supabase ? 'found' : 'null')
		
		if (supabase) {
			try {
				console.log('   - Attempting Supabase signInWithPassword...')
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password
				})
				console.log('   - Supabase response received:', { hasData: !!data, hasError: !!error })
				
				if (error) {
					console.error('Supabase signin error details:', {
						message: error.message,
						status: error.status,
						name: error.name
					})
					
					// More specific error messages
					if (error.message.includes('Invalid login credentials') || error.message.includes('invalid')) {
						return { success: false, error: 'Invalid email or password' }
					} else if (error.message.includes('email') && error.message.includes('confirm')) {
						return { success: false, error: 'Please check your email to confirm your account' }
					}
					return { success: false, error: error.message || 'Login failed. Please check your credentials.' }
				}
				
				if (data.user && data.session) {
					const user: User = {
						id: data.user.id,
						email: data.user.email || email,
						username: data.user.user_metadata?.username,
						role: data.user.user_metadata?.role,
						createdAt: new Date(data.user.created_at).getTime()
					}
					setCachedUser(user)
					console.log('✅ Login successful:', user.email)
					return { success: true, user }
				} else if (data.user && !data.session) {
					// User exists but needs email confirmation
					console.warn('⚠️ User exists but no session - email not confirmed?')
					return { success: false, error: 'Please check your email to confirm your account. If you already confirmed, try resetting your password.' }
				}
				
				console.error('❌ Login failed: No user or session returned')
				return { success: false, error: 'Login failed. Please try again.' }
			} catch (error) {
				console.error('Supabase signin error:', error)
				return { success: false, error: 'Sign in failed. Please try again.' }
			}
		}
	}
	
	// Fallback to localStorage
	console.log('   - Using localStorage fallback (Supabase not configured)')
	return await localSignIn(email, password)
}

/**
 * Sign out from Supabase or localStorage
 */
export async function signOut(): Promise<void> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			try {
				await supabase.auth.signOut()
				setCachedUser(null)
			} catch (error) {
				console.error('Supabase signout error:', error)
			}
		}
	}
	
	// Always also sign out from local storage
	localSignOut()
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return getCurrentUser() !== null
}

