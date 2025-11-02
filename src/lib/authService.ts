/**
 * Authentication Service
 * 
 * Abstraction layer for authentication.
 * Currently uses localStorage, will migrate to Supabase later.
 * 
 * This service provides a consistent interface that can be swapped
 * for database-backed authentication without changing consuming code.
 */

import { 
	getCurrentUser as localGetCurrentUser,
	signUp as localSignUp,
	signIn as localSignIn,
	signOut as localSignOut
} from './localAuth'

export interface User {
	id: string
	email: string
	username?: string
	role?: 'user' | 'admin' // For future admin role management
	createdAt: number
}

export interface AuthResult {
	success: boolean
	user?: User
	error?: string
}

/**
 * Check if current user is an admin
 * For now: check email or username
 * Later: check database role or permissions
 */
export function isAdmin(user: User | null): boolean {
	if (!user) return false
	
	// For now, simple check - can be extended with database role check
	// Admin emails (can be moved to database config later)
	const adminEmails = ['admin@innato.com', 'hanshoukes@gmail.com', 'info@stonewhistle.com'] // TODO: Move to database
	const adminUsernames = ['admin', 'hanshoukes'] // TODO: Move to database
	
	return adminEmails.includes(user.email.toLowerCase()) || 
	       (user.username && adminUsernames.includes(user.username.toLowerCase())) ||
	       user.role === 'admin'
}

/**
 * Get current user (delegates to auth implementation)
 */
export function getCurrentUser(): User | null {
	return localGetCurrentUser() as User | null
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return getCurrentUser() !== null
}

/**
 * Sign up (delegates to auth implementation)
 */
export function signUp(email: string, password: string, username?: string): AuthResult {
	return localSignUp(email, password, username)
}

/**
 * Sign in (delegates to auth implementation)
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	return await localSignIn(email, password)
}

/**
 * Sign out (delegates to auth implementation)
 */
export function signOut(): void {
	localSignOut()
}

