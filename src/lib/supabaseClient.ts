/**
 * Supabase Client
 * 
 * Singleton instance of Supabase client for database operations.
 * Falls back to null if Supabase is not configured (for offline/localStorage mode).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

/**
 * Initialize Supabase client if credentials are available
 */
function initSupabaseClient(): SupabaseClient | null {
	// Check if Supabase credentials are configured
	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
	const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		console.warn('Supabase not configured. Running in offline/localStorage mode.')
		return null
	}

	// Create Supabase client
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	})
}

/**
 * Get Supabase client instance
 * Returns null if Supabase is not configured (offline mode)
 */
export function getSupabaseClient(): SupabaseClient | null {
	if (!supabaseClient) {
		supabaseClient = initSupabaseClient()
	}
	return supabaseClient
}

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured(): boolean {
	return getSupabaseClient() !== null
}

/**
 * Reset client (useful for testing or re-initialization)
 */
export function resetSupabaseClient(): void {
	supabaseClient = null
}

