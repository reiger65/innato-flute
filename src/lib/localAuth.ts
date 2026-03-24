/**
 * Local Authentication Service
 * 
 * Simple local authentication using localStorage.
 * This will be replaced with Supabase authentication later.
 */

export interface User {
	id: string
	email: string
	username?: string
	role?: 'user' | 'admin'
	createdAt: number
}

const STORAGE_KEY_USER = 'innato-user'
const STORAGE_KEY_SESSION = 'innato-session'

/**
 * Sign up a new user (local storage)
 */
export function signUp(email: string, _password: string, username?: string): { success: boolean; user?: User; error?: string } {
	try {
		// Check if user already exists
		const existingUsers = getStoredUsers()
		const existingUser = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase())
		
		if (existingUser) {
			return { success: false, error: 'Email already registered' }
		}

		// Check if this is an admin email
		const adminEmails = ['info@stonewhistle.com']
		const isAdminEmail = adminEmails.includes(email.toLowerCase())

		// Create new user
		const newUser: User = {
			id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			email: email.toLowerCase(),
			username: username || email.split('@')[0],
			role: isAdminEmail ? 'admin' : 'user', // Set admin role for admin emails
			createdAt: Date.now()
		}

		// Store user (in a real app, password would be hashed)
		// For local storage, we'll just store email -> user mapping
		existingUsers.push(newUser)
		localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(existingUsers))

		// Create session
		createSession(newUser)

		return { success: true, user: newUser }
	} catch (error) {
		console.error('Sign up error:', error)
		return { success: false, error: 'Failed to create account' }
	}
}

// Admin password hash (simple SHA-256 hash of the password)
// For production, this should be stored securely in database
// This is a hash of a secure random password
// Default admin password: "InnatoAdmin2024!" (CHANGE IN PRODUCTION)
// To generate new hash, use: await hashPassword('your-secure-password')
const ADMIN_PASSWORD_HASH = 'a43b9fa79b17fc84ef41114b84158e7588596430d9e77747556aea6886f82abd'

/**
 * Hash a password using SHA-256 (simple implementation for local storage)
 * In production, use bcrypt/argon2 with salt
 */
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder()
	const data = encoder.encode(password)
	const hashBuffer = await crypto.subtle.digest('SHA-256', data)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
	const passwordHash = await hashPassword(password)
	return passwordHash === hash
}

/**
 * Sign in user (local storage)
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
	try {
		const users = getStoredUsers()
		const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

		if (!user) {
			return { success: false, error: 'Invalid email or password' }
		}

		// Check if user is admin
		const adminEmails = ['info@stonewhistle.com']
		const isAdminUser = adminEmails.includes(user.email.toLowerCase()) ||
		                   user.role === 'admin'

		if (isAdminUser) {
			// For admin users, verify password against hash
			const isValid = await verifyPassword(password, ADMIN_PASSWORD_HASH)
			if (!isValid) {
				return { success: false, error: 'Invalid email or password' }
			}
		} else {
			// For regular users, accept any password (temporary for local storage)
			// In production, all users should have password verification
		}

		createSession(user)
		return { success: true, user }
	} catch (error) {
		console.error('Sign in error:', error)
		return { success: false, error: 'Failed to sign in' }
	}
}

/**
 * Sign out current user
 */
export function signOut(): void {
	localStorage.removeItem(STORAGE_KEY_SESSION)
}

/**
 * Get current logged in user
 */
export function getCurrentUser(): User | null {
	try {
		const sessionData = localStorage.getItem(STORAGE_KEY_SESSION)
		if (!sessionData) return null

		const session = JSON.parse(sessionData)
		if (!session.userId || !session.expiresAt || Date.now() > session.expiresAt) {
			signOut()
			return null
		}

		const users = getStoredUsers()
		return users.find(u => u.id === session.userId) || null
	} catch (error) {
		console.error('Get current user error:', error)
		return null
	}
}

/**
 * Check if user is logged in
 */
export function isAuthenticated(): boolean {
	return getCurrentUser() !== null
}

/**
 * Get all stored users (for local storage)
 */
function getStoredUsers(): User[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY_USER)
		return data ? JSON.parse(data) : []
	} catch (error) {
		console.error('Error loading users:', error)
		return []
	}
}

/**
 * Create session for user
 */
function createSession(user: User): void {
	const session = {
		userId: user.id,
		expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
	}
	localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session))
}

