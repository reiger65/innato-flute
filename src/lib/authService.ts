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
	signInWithMagicLink as supabaseSignInWithMagicLink,
	resetPassword as supabaseResetPassword,
	updatePassword as supabaseUpdatePassword,
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
 * Returns false if user is null or undefined
 */
export function isAdmin(user: User | null | undefined): boolean {
	if (!user) return false // Explicitly handle null and undefined
	
	if (isSupabaseConfigured()) {
		return supabaseIsAdmin(user)
	}
	
	// Fallback to local check
	const adminEmails = ['info@stonewhistle.com']
	return adminEmails.includes(user.email.toLowerCase()) || 
	       user.role === 'admin'
}

/**
 * Get current user (delegates to auth implementation)
 * Uses Supabase session when available, falls back to localStorage
 */
export function getCurrentUser(): User | null {
	if (isSupabaseConfigured()) {
		return supabaseGetCurrentUser()
	}
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
	if (isSupabaseConfigured()) {
		return await supabaseSignIn(email, password)
	}
	return await localSignIn(email, password)
}

/**
 * Sign in with magic link (passwordless)
 * Uses Supabase when available
 */
export async function signInWithMagicLink(email: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		return await supabaseSignInWithMagicLink(email)
	}
	return { success: false, error: 'Magic link not available. Please use password login.' }
}

/**
 * Reset password (send password reset email)
 * Uses Supabase when available
 */
export async function resetPassword(email: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		return await supabaseResetPassword(email)
	}
	return { success: false, error: 'Password reset not available. Please use magic link login.' }
}

/**
 * Update password after password reset
 * Uses Supabase when available
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
	if (isSupabaseConfigured()) {
		return await supabaseUpdatePassword(newPassword)
	}
	return { success: false, error: 'Password update not available.' }
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

