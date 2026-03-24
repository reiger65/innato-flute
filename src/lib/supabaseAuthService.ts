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
	
	// Strict admin check - only allow specific admin emails
	const adminEmails = ['info@stonewhistle.com']
	
	// If Supabase is configured, check user metadata
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			// Admin check: email must be in whitelist OR role must be explicitly 'admin'
			// But role check is secondary - email whitelist takes precedence
			const isEmailAdmin = adminEmails.includes(user.email.toLowerCase())
			const isRoleAdmin = user.role === 'admin'
			
			// Only return true if email is in whitelist OR role is explicitly admin
			return isEmailAdmin || isRoleAdmin
		}
	}
	
	// Fallback to local check - strict email whitelist
	return adminEmails.includes(user.email.toLowerCase()) || 
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
						},
						emailRedirectTo: `${window.location.origin}`
					}
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				if (data.user) {
					// Check if email confirmation is required
					// If no session is returned, user needs to confirm email
					if (!data.session) {
						// Still return success but with a message about email confirmation
						return { 
							success: true, 
							user: undefined
						}
					}
					
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
 * Update password after password reset
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		
		if (supabase) {
			try {
				const { error } = await supabase.auth.updateUser({
					password: newPassword
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				// Password updated successfully
				const user = getCurrentUser()
				if (user) {
					return { success: true, user }
				}
				return { success: true, user: undefined }
			} catch (error) {
				console.error('Password update error:', error)
				return { success: false, error: 'Failed to update password. Please try again.' }
			}
		}
	}
	
	return { success: false, error: 'Password update not available.' }
}

/**
 * Reset password (send password reset email)
 */
export async function resetPassword(email: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		
		if (supabase) {
			try {
				// Use current origin (works for both localhost and production)
				const redirectTo = `${window.location.origin}?type=recovery`
				const { error } = await supabase.auth.resetPasswordForEmail(email, {
					redirectTo
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				// Password reset email sent successfully
				return { success: true, user: undefined }
			} catch (error) {
				console.error('Password reset error:', error)
				return { success: false, error: 'Failed to send password reset email. Please try again.' }
			}
		}
	}
	
	return { success: false, error: 'Password reset not available. Please use magic link login.' }
}

/**
 * Sign in with magic link (passwordless)
 */
export async function signInWithMagicLink(email: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		
		if (supabase) {
			try {
				const { error } = await supabase.auth.signInWithOtp({
					email,
					options: {
						emailRedirectTo: `${window.location.origin}`,
						shouldCreateUser: true
					}
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				// Magic link sent successfully
				return { success: true, user: undefined }
			} catch (error) {
				console.error('Magic link error:', error)
				return { success: false, error: 'Failed to send magic link. Please try again.' }
			}
		}
	}
	
	return { success: false, error: 'Magic link not available. Please use password login.' }
}

/**
 * Sign in with Supabase or localStorage
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		
		if (supabase) {
			try {
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password
				})
				
				if (error) {
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
					return { success: true, user }
				} else if (data.user && !data.session) {
					// User exists but needs email confirmation
					return { success: false, error: 'Please check your email to confirm your account. If you already confirmed, try resetting your password.' }
				}
				
				return { success: false, error: 'Login failed. Please try again.' }
			} catch (error) {
				console.error('Supabase signin error:', error)
				return { success: false, error: 'Sign in failed. Please try again.' }
			}
		}
	}
	
	// Fallback to localStorage
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

