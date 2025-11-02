/**
 * Authentication Service
 * 
 * Abstraction layer for authentication.
 * Uses Supabase when configured, falls back to localStorage otherwise.
 * 
 * This service provides a consistent interface that can be swapped
 * for database-backed authentication without changing consuming code.
 */

import { isSupabaseConfigured } from './supabaseClient'
import {
	getCurrentUser as supabaseGetCurrentUser,
	signUp as supabaseSignUp,
	signIn as supabaseSignIn,
	signOut as supabaseSignOut,
	isAdmin as supabaseIsAdmin
} from './supabaseAuthService'
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
 * Uses Supabase check when available, falls back to local check
 */
export function isAdmin(user: User | null): boolean {
	if (!user) return false
	
	if (isSupabaseConfigured()) {
		return supabaseIsAdmin(user)
	}
	
	// Fallback to local check
	const adminEmails = ['admin@innato.com', 'hanshoukes@gmail.com', 'info@stonewhistle.com']
	const adminUsernames = ['admin', 'hanshoukes']
	return adminEmails.includes(user.email.toLowerCase()) || 
	       (user.username && adminUsernames.includes(user.username.toLowerCase())) ||
	       user.role === 'admin'
}

/**
 * Get current user (delegates to auth implementation)
 * Uses Supabase session when available, falls back to localStorage
 */
export function getCurrentUser(): User | null {
	const isSupabase = isSupabaseConfigured()
	console.log('🔍 getCurrentUser called - isSupabaseConfigured:', isSupabase)
	if (isSupabase) {
		const user = supabaseGetCurrentUser()
		console.log('   Supabase user:', user ? `${user.email} (${user.id})` : 'null')
		return user
	}
	const user = localGetCurrentUser() as User | null
	console.log('   LocalStorage user:', user ? `${user.email} (${user.id})` : 'null')
	return user
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return getCurrentUser() !== null
}

/**
 * Sign up (delegates to auth implementation)
 * Uses Supabase when available, falls back to localStorage
 */
export async function signUp(email: string, password: string, username?: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		return await supabaseSignUp(email, password, username)
	}
	return localSignUp(email, password, username)
}

/**
 * Sign in (delegates to auth implementation)
 * Uses Supabase when available, falls back to localStorage
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	const isSupabase = isSupabaseConfigured()
	console.log('🔍 authService.signIn - isSupabaseConfigured:', isSupabase)
	if (isSupabase) {
		console.log('   → Using Supabase auth')
		return await supabaseSignIn(email, password)
	}
	console.log('   → Using localStorage auth (fallback)')
	return await localSignIn(email, password)
}

/**
 * Sign out (delegates to auth implementation)
 * Uses Supabase when available, falls back to localStorage
 */
export async function signOut(): Promise<void> {
	if (isSupabaseConfigured()) {
		await supabaseSignOut()
	} else {
		localSignOut()
	}
}

