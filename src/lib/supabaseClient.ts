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
	// TEMPORARY FIX: Hardcode for testing (remove after env vars work)
	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
	const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmcWdmaXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzUyNTMsImV4cCI6MjA3NzY1MTI1M30.6tc8sr8lpTnXX3HLntWyrnqd8f_8XKeP-aP3lhkAciA'

	// Always log - even in production
	const logInfo = {
		hasUrl: !!supabaseUrl,
		hasKey: !!supabaseAnonKey,
		urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'none',
		urlValue: supabaseUrl || 'UNDEFINED',
		keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'UNDEFINED',
		source: import.meta.env.VITE_SUPABASE_URL ? 'env' : 'hardcoded'
	}
	
	// Use alert in production if not configured (for debugging)
	if (!supabaseUrl || !supabaseAnonKey) {
		console.error('❌❌❌ SUPABASE NOT CONFIGURED ❌❌❌')
		console.error('⚠️ Supabase not configured. Running in offline/localStorage mode.')
		console.error('   - VITE_SUPABASE_URL:', supabaseUrl || 'MISSING')
		console.error('   - VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING')
		console.error('   - Full env check:', logInfo)
		
		// In production, show alert to help debug
		if (import.meta.env.PROD && typeof window !== 'undefined') {
			console.error('🔴 PRODUCTION MODE: Supabase env vars missing!')
		}
		
		return null
	}

	// Create Supabase client
	console.log('✅ Creating Supabase client:', logInfo)
	const client = createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	})
	
	console.log('✅ Supabase client created successfully')
	return client
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

