/**
 * Automatic Backup System
 * 
 * Creates automatic backups of:
 * - Compositions (every save/update)
 * - CSS file (before modifications)
 * 
 * This prevents data loss during development.
 */

const COMPOSITION_BACKUP_PREFIX = 'innato-composition-backup-'
const MAX_BACKUPS = 50

/**
 * Create a backup of compositions to localStorage
 * Stores backup with timestamp in localStorage
 */
export function backupCompositions(): void {
	try {
		const compositions = localStorage.getItem('innato-compositions')
		if (compositions) {
			const timestamp = Date.now()
			const backupKey = `${COMPOSITION_BACKUP_PREFIX}${timestamp}`
			localStorage.setItem(backupKey, compositions)
			console.log('[AutoBackup] Created composition backup:', backupKey)
			
			// Clean old backups (keep last MAX_BACKUPS)
			cleanOldBackups()
		}
	} catch (error) {
		console.error('[AutoBackup] Error creating backup:', error)
	}
}

/**
 * Clean old backups, keep only the last MAX_BACKUPS
 */
function cleanOldBackups(): void {
	try {
		const backupKeys: string[] = []
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(COMPOSITION_BACKUP_PREFIX)) {
				backupKeys.push(key)
			}
		}
		
		// Sort by timestamp (newest first)
		backupKeys.sort((a, b) => {
			const timestampA = parseInt(a.replace(COMPOSITION_BACKUP_PREFIX, ''))
			const timestampB = parseInt(b.replace(COMPOSITION_BACKUP_PREFIX, ''))
			return timestampB - timestampA
		})
		
		// Remove old backups
		if (backupKeys.length > MAX_BACKUPS) {
			const toRemove = backupKeys.slice(MAX_BACKUPS)
			toRemove.forEach(key => {
				localStorage.removeItem(key)
			})
			console.log(`[AutoBackup] Removed ${toRemove.length} old backups`)
		}
	} catch (error) {
		console.error('[AutoBackup] Error cleaning backups:', error)
	}
}

/**
 * Get all available backups
 */
export function getCompositionBackups(): Array<{ key: string; timestamp: number; data: string }> {
	const backups: Array<{ key: string; timestamp: number; data: string }> = []
	
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i)
			if (key && key.startsWith(COMPOSITION_BACKUP_PREFIX)) {
				const data = localStorage.getItem(key)
				if (data) {
					const timestamp = parseInt(key.replace(COMPOSITION_BACKUP_PREFIX, ''))
					backups.push({ key, timestamp, data })
				}
			}
		}
		
		// Sort by timestamp (newest first)
		backups.sort((a, b) => b.timestamp - a.timestamp)
	} catch (error) {
		console.error('[AutoBackup] Error getting backups:', error)
	}
	
	return backups
}

/**
 * Restore compositions from a backup
 */
export function restoreCompositionsFromBackup(backupKey: string): boolean {
	try {
		const backupData = localStorage.getItem(backupKey)
		if (backupData) {
			// Validate it's valid JSON
			const parsed = JSON.parse(backupData)
			if (Array.isArray(parsed)) {
				localStorage.setItem('innato-compositions', backupData)
				console.log('[AutoBackup] Restored compositions from backup:', backupKey)
				return true
			}
		}
		return false
	} catch (error) {
		console.error('[AutoBackup] Error restoring backup:', error)
		return false
	}
}








