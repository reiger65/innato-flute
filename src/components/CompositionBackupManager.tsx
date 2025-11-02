/**
 * Composition Backup Manager
 * 
 * Allows users to view and restore from automatic backups
 */

import { useState, useEffect } from 'react'
import { getCompositionBackups, restoreCompositionsFromBackup } from '../lib/autoBackup'

interface BackupManagerProps {
	isOpen: boolean
	onClose: () => void
	onRestore: () => void
}

export function CompositionBackupManager({ isOpen, onClose, onRestore }: BackupManagerProps) {
	const [backups, setBackups] = useState<Array<{ key: string; timestamp: number; data: string }>>([])

	useEffect(() => {
		if (isOpen) {
			setBackups(getCompositionBackups())
		}
	}, [isOpen])

	if (!isOpen) return null

	const handleRestore = (backupKey: string) => {
		if (confirm('Restore compositions from this backup? Current compositions will be replaced.')) {
			if (restoreCompositionsFromBackup(backupKey)) {
				alert('Backup restored! Refreshing...')
				onRestore()
				onClose()
				window.location.reload()
			} else {
				alert('Failed to restore backup')
			}
		}
	}

	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
					<h2>Composition Backups</h2>
					<button className="icon-btn-sm" onClick={onClose} aria-label="Close">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>
				
				{backups.length === 0 ? (
					<p>No backups available</p>
				) : (
					<>
						<p style={{ marginBottom: 'var(--space-4)' }}>
							Found {backups.length} backup(s). Select one to restore.
						</p>
						<div style={{ maxHeight: '400px', overflowY: 'auto' }}>
							{backups.map((backup) => {
								try {
									const parsed = JSON.parse(backup.data)
									const count = Array.isArray(parsed) ? parsed.length : 0
									const date = new Date(backup.timestamp).toLocaleString()
									
									return (
										<div
											key={backup.key}
											style={{
												padding: 'var(--space-3)',
												border: 'var(--border-2) solid var(--color-black)',
												borderRadius: 'var(--radius-2)',
												marginBottom: 'var(--space-2)',
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center'
											}}
										>
											<div>
												<strong>{count} composition(s)</strong>
												<br />
												<small>{date}</small>
											</div>
											<button
												className="btn-sm"
												onClick={() => handleRestore(backup.key)}
											>
												Restore
											</button>
										</div>
									)
								} catch {
									return null
								}
							})}
						</div>
					</>
				)}
			</div>
		</div>
	)
}

