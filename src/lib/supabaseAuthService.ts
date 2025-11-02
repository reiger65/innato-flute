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

/**
 * Get current user from Supabase session or localStorage
 */
export function getCurrentUser(): User | null {
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			// Get session from Supabase
			// For now, still use localStorage as fallback
			// TODO: Implement full Supabase auth session management
		}
	}
	
	// Fallback to localStorage
	return localGetCurrentUser() as User | null
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
						createdAt: Date.now()
					}
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
	if (isSupabaseConfigured()) {
		const supabase = getSupabaseClient()
		if (supabase) {
			try {
				const { data, error } = await supabase.auth.signInWithPassword({
					email,
					password
				})
				
				if (error) {
					return { success: false, error: error.message }
				}
				
				if (data.user) {
					const user: User = {
						id: data.user.id,
						email: data.user.email || email,
						username: data.user.user_metadata?.username,
						createdAt: new Date(data.user.created_at).getTime()
					}
					return { success: true, user }
				}
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

