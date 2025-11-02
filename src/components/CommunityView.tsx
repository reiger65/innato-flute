import { useState, useEffect } from 'react'
import type { FluteType, TuningFrequency } from '../lib/fluteData'
import type { SharedProgression, SharedComposition } from '../lib/sharedItemsStorage'
import { CommunityPlayerModal } from './CommunityPlayerModal'
import {
	getRankedSharedItems,
	isSharedItemFavorited,
	addSharedFavorite,
	removeSharedFavorite
} from '../lib/sharedItemsStorage'
import { saveProgression } from '../lib/progressionService'
import { saveComposition } from '../lib/compositionService'

interface CommunityViewProps {
	fluteType: FluteType
	tuning: TuningFrequency
	onOpenComposition?: (composition: SharedComposition) => void
	onOpenProgression?: (progression: SharedProgression) => void
	isAuthenticated?: boolean
	onShowLogin?: () => void
}

type ViewMode = 'all' | 'progressions' | 'compositions'
type SortMode = 'most-favorited' | 'newest' | 'oldest'
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year'

export function CommunityView({ fluteType, tuning, onOpenComposition, onOpenProgression, isAuthenticated = false, onShowLogin }: CommunityViewProps) {
	const [sharedItems, setSharedItems] = useState<{ progressions: SharedProgression[], compositions: SharedComposition[] }>({ progressions: [], compositions: [] })
	const [viewMode, setViewMode] = useState<ViewMode>('all')
	const [sortMode, setSortMode] = useState<SortMode>('most-favorited')
	const [dateFilter, setDateFilter] = useState<DateFilter>('all')
	const [isOffline, setIsOffline] = useState(false)
	const [selectedItem, setSelectedItem] = useState<SharedProgression | SharedComposition | null>(null)
	const [loadingError, setLoadingError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [debugInfo, setDebugInfo] = useState<{ message: string, timestamp: number }[]>([])

	// Load shared items
	useEffect(() => {
		const loadItems = async () => {
			try {
				setIsLoading(true)
				setLoadingError(null)
				setDebugInfo(prev => [...prev, { message: 'Starting to load items...', timestamp: Date.now() }])
				
				// Add more detailed logging for iPhone
				const isIPhone = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
				if (isIPhone) {
					setDebugInfo(prev => [...prev, { message: 'iPhone detected - using REST API', timestamp: Date.now() }])
					console.log('[CommunityView] iPhone detected, checking Supabase config...')
					const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
					const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
					console.log('[CommunityView] iPhone Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
					console.log('[CommunityView] iPhone Supabase Key:', supabaseKey ? 'SET' : 'MISSING')
					setDebugInfo(prev => [...prev, { message: `Supabase URL: ${supabaseUrl ? 'SET' : 'MISSING'}`, timestamp: Date.now() }])
				}
				
				const ranked = await getRankedSharedItems()
				setSharedItems(ranked)
				
				// Log for debugging (visible in UI too)
				const total = ranked.progressions.length + ranked.compositions.length
				const debugMsg = `Loaded: ${ranked.progressions.length} progressions, ${ranked.compositions.length} compositions (total: ${total})`
				console.log('[CommunityView] Loaded items:', {
					progressions: ranked.progressions.length,
					compositions: ranked.compositions.length,
					total
				})
				setDebugInfo(prev => [...prev, { message: debugMsg, timestamp: Date.now() }])
				
				// Only show error if NO items were loaded at all
				// If items exist but are filtered out, don't show error
				if (total === 0) {
					const errorMsg = 'No shared items found. Make sure compositions are shared and marked as public in Supabase.'
					setLoadingError(errorMsg)
					setDebugInfo(prev => [...prev, { message: '⚠️ No items found after loading', timestamp: Date.now() }])
					if (isIPhone) {
						setDebugInfo(prev => [...prev, { message: 'Check console for REST API errors', timestamp: Date.now() }])
					}
				} else {
					setLoadingError(null) // Clear error if items found (even if filtered out)
					setDebugInfo(prev => [...prev, { message: '✅ Items loaded successfully', timestamp: Date.now() }])
				}
			} catch (error) {
				console.error('Error loading shared items:', error)
				const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
				setLoadingError(`Error loading shared items: ${error instanceof Error ? error.message : 'Unknown error'}`)
				setDebugInfo(prev => [...prev, { message: `❌ ${errorMsg}`, timestamp: Date.now() }])
				if (error instanceof Error) {
					console.error('[CommunityView] Error stack:', error.stack || 'No stack trace')
					const stackTrace = error.stack
					if (stackTrace) {
						setDebugInfo(prev => [...prev, { message: `Stack: ${stackTrace.substring(0, 100)}...`, timestamp: Date.now() }])
					}
				}
			} finally {
				setIsLoading(false)
			}
		}

		loadItems()
		// Refresh every 10 seconds (reduced from 5 to avoid too many requests)
		const interval = setInterval(loadItems, 10000)
		return () => clearInterval(interval)
	}, [])

	// Check online/offline status
	useEffect(() => {
		const updateOnlineStatus = () => setIsOffline(!navigator.onLine)
		updateOnlineStatus()
		window.addEventListener('online', updateOnlineStatus)
		window.addEventListener('offline', updateOnlineStatus)
		return () => {
			window.removeEventListener('online', updateOnlineStatus)
			window.removeEventListener('offline', updateOnlineStatus)
		}
	}, [])

	// Filter items by date
	const filterByDate = (items: (SharedProgression | SharedComposition)[]): (SharedProgression | SharedComposition)[] => {
		if (dateFilter === 'all') {
			return items
		}

		const now = Date.now()
		let cutoffTime = 0

		switch (dateFilter) {
			case 'today':
				cutoffTime = now - (24 * 60 * 60 * 1000) // 24 hours
				break
			case 'week':
				cutoffTime = now - (7 * 24 * 60 * 60 * 1000) // 7 days
				break
			case 'month':
				cutoffTime = now - (30 * 24 * 60 * 60 * 1000) // 30 days
				break
			case 'year':
				cutoffTime = now - (365 * 24 * 60 * 60 * 1000) // 365 days
				break
		}

		const filtered = items.filter(item => {
			const itemTime = item.sharedAt || item.createdAt || 0
			const passes = itemTime >= cutoffTime
			if (!passes) {
				console.log('[CommunityView] Item filtered out by date:', {
					name: item.name,
					sharedAt: new Date(item.sharedAt).toISOString(),
					cutoffTime: new Date(cutoffTime).toISOString(),
					dateFilter
				})
			}
			return passes
		})
		
		return filtered
	}

	// Sort items based on selected mode
	const getSortedItems = () => {
		let items: (SharedProgression | SharedComposition)[] = []

		if (viewMode === 'all') {
			items = [...sharedItems.progressions, ...sharedItems.compositions]
		} else if (viewMode === 'progressions') {
			items = [...sharedItems.progressions]
		} else {
			items = [...sharedItems.compositions]
		}

		// Filter by date
		items = filterByDate(items)

		if (sortMode === 'most-favorited') {
			// Already sorted by getRankedSharedItems
			return items
		} else if (sortMode === 'newest') {
			return [...items].sort((a, b) => b.sharedAt - a.sharedAt)
		} else {
			return [...items].sort((a, b) => a.sharedAt - b.sharedAt)
		}
	}


	const handleSaveProgression = async (progression: SharedProgression) => {
		const saved = await saveProgression({
			name: progression.name,
			chordIds: progression.chordIds
		})
		alert(`Progression "${saved.name}" saved to your library!`)
	}

	const handleSaveComposition = async (composition: SharedComposition) => {
		const saved = await saveComposition({
			name: composition.name,
			chords: composition.chords,
			tempo: composition.tempo,
			timeSignature: composition.timeSignature,
			fluteType: composition.fluteType as FluteType,
			tuning: composition.tuning as TuningFrequency
		})
		alert(`Composition "${saved.name}" saved to your library!`)
	}


	const handleToggleFavorite = (itemId: string, itemType: 'progression' | 'composition') => {
		if (!isAuthenticated) {
			// Prompt to login
			if (onShowLogin) {
				onShowLogin()
			}
			return
		}
		
		const isFavorited = isSharedItemFavorited(itemId, itemType)
		if (isFavorited) {
			removeSharedFavorite(itemId, itemType)
		} else {
			addSharedFavorite(itemId, itemType)
		}
		
		// Reload items to update favorite counts
		getRankedSharedItems().then(ranked => setSharedItems(ranked))
	}

	const sortedItems = getSortedItems()
	
	// Debug: Log what's happening with filtering
	console.log('[CommunityView] Filtering state:', {
		viewMode,
		dateFilter,
		sortMode,
		totalItems: sharedItems.progressions.length + sharedItems.compositions.length,
		sortedItemsCount: sortedItems.length,
		progressions: sharedItems.progressions.length,
		compositions: sharedItems.compositions.length
	})

	return (
		<div className="community-view">
			{/* Header */}
			<div className="section-title">Community</div>
			<div className="section-desc">
				Discover and share your favorite progressions and compositions with other INNATO players. Explore what the community has created and let others enjoy your musical explorations.
				{isOffline && (
					<span style={{ display: 'block', marginTop: 'var(--space-2)', color: 'rgba(0, 0, 0, 0.6)', fontSize: 'var(--font-size-sm)' }}>
						Offline mode: Only showing local shared items
					</span>
				)}
				{!isAuthenticated && (
					<span style={{ display: 'block', marginTop: 'var(--space-2)', color: 'rgba(0, 0, 0, 0.6)', fontSize: 'var(--font-size-sm)' }}>
						Viewing public items. <button onClick={() => onShowLogin?.()} style={{ textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Login</button> to share and favorite.
					</span>
				)}
				{isAuthenticated && (
					<span style={{ display: 'block', marginTop: 'var(--space-2)', color: 'rgba(0, 0, 0, 0.6)', fontSize: 'var(--font-size-sm)' }}>
						Logged in: {sharedItems.progressions.length + sharedItems.compositions.length} shared items found
					</span>
				)}
			</div>

			{/* Filters */}
			<div className="controls" style={{ marginBottom: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
				<div className="pills" style={{ flexWrap: 'wrap' }}>
					<button
						className={`pill ${viewMode === 'all' ? 'is-active' : ''}`}
						onClick={() => setViewMode('all')}
						style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
					>
						All
					</button>
					<button
						className={`pill ${viewMode === 'progressions' ? 'is-active' : ''}`}
						onClick={() => setViewMode('progressions')}
						style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
							<line x1="3" y1="8" x2="21" y2="8"></line>
							<line x1="3" y1="12" x2="21" y2="12"></line>
							<line x1="3" y1="16" x2="21" y2="16"></line>
						</svg>
						Progressions
					</button>
					<button
						className={`pill ${viewMode === 'compositions' ? 'is-active' : ''}`}
						onClick={() => setViewMode('compositions')}
						style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
							<path d="M9 18V5l12-2v13"></path>
							<circle cx="6" cy="18" r="3"></circle>
							<circle cx="18" cy="16" r="3"></circle>
							<line x1="12" y1="5" x2="12" y2="19"></line>
						</svg>
						Compositions
					</button>
				</div>

				<div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
					<select
						className="btn-sm"
						value={sortMode}
						onChange={(e) => setSortMode(e.target.value as SortMode)}
						style={{ minWidth: '140px' }}
					>
						<option value="most-favorited">Most Favorited</option>
						<option value="newest">Newest First</option>
						<option value="oldest">Oldest First</option>
					</select>

					<select
						className="btn-sm"
						value={dateFilter}
						onChange={(e) => setDateFilter(e.target.value as DateFilter)}
						style={{ minWidth: '120px' }}
					>
						<option value="all">All Time</option>
						<option value="today">Today</option>
						<option value="week">This Week</option>
						<option value="month">This Month</option>
						<option value="year">This Year</option>
					</select>
				</div>
			</div>

			{/* Loading/Error Status */}
			{isLoading && (
				<div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'rgba(0, 0, 0, 0.6)' }}>
					<p>Loading shared items...</p>
					{debugInfo.length > 0 && (
						<div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', textAlign: 'left', maxWidth: '400px', margin: 'var(--space-2) auto 0' }}>
							{debugInfo.slice(-3).map((info, i) => (
								<div key={i} style={{ marginBottom: '4px', opacity: 0.7 }}>
									{info.message}
								</div>
							))}
						</div>
					)}
				</div>
			)}
			
			{loadingError && !isLoading && (
				<div style={{ 
					textAlign: 'center', 
					padding: 'var(--space-4)', 
					color: 'rgba(0, 0, 0, 0.8)',
					background: 'rgba(255, 200, 0, 0.1)',
					border: '2px solid rgba(255, 200, 0, 0.5)',
					borderRadius: 'var(--radius-2)',
					marginBottom: 'var(--space-4)'
				}}>
					<p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
						⚠️ {loadingError}
					</p>
					<p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)', color: 'rgba(0, 0, 0, 0.6)' }}>
						{typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
							<>iPhone detected. Checking console logs for REST API errors. This might be a Safari-specific issue with Supabase queries.</>
						) : (
							<>This might be a network issue. The app will retry automatically. Check your internet connection and try again.</>
						)}
					</p>
					{debugInfo.length > 0 && (
						<div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-xs)', textAlign: 'left', background: 'rgba(0, 0, 0, 0.05)', padding: 'var(--space-2)', borderRadius: 'var(--radius-1)', maxHeight: '200px', overflow: 'auto' }}>
							<strong>Debug Info:</strong>
							{debugInfo.slice(-5).map((info, i) => (
								<div key={i} style={{ marginTop: '4px', fontFamily: 'monospace' }}>
									{info.message}
								</div>
							))}
						</div>
					)}
					<button 
						className="btn-sm"
						onClick={() => {
							setIsLoading(true)
							setLoadingError(null)
							setDebugInfo([])
							getRankedSharedItems()
								.then(ranked => {
									setSharedItems(ranked)
									const total = ranked.progressions.length + ranked.compositions.length
									console.log('[CommunityView] Retry loaded:', total, 'items')
									if (total === 0) {
										setLoadingError('No shared items found. Make sure compositions are shared and marked as public in Supabase.')
									} else {
										setLoadingError(null)
									}
									setIsLoading(false)
								})
								.catch(err => {
									console.error('[CommunityView] Retry error:', err)
									setLoadingError(`Error: ${err instanceof Error ? err.message : 'Failed to load'}`)
									setIsLoading(false)
								})
						}}
					>
						Retry Now
					</button>
				</div>
			)}

			{/* Items Grid */}
			{!isLoading && sortedItems.length === 0 && !loadingError && (
				<div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'rgba(0, 0, 0, 0.6)' }}>
					{sharedItems.progressions.length + sharedItems.compositions.length > 0 ? (
						<>
							<p style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
								Found {sharedItems.progressions.length + sharedItems.compositions.length} item(s), but they don't match your filters.
							</p>
							<p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
								Current filters: View = "{viewMode}", Date = "{dateFilter}"
							</p>
							<button 
								className="btn-sm"
								onClick={() => {
									setViewMode('all')
									setDateFilter('all')
								}}
							>
								Reset Filters
							</button>
						</>
					) : (
						<>
							<p>No shared items yet. Be the first to share something!</p>
							<p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
								Mark progressions as favorite or share compositions to see them here.
							</p>
						</>
					)}
				</div>
			)}
			
			{!isLoading && sortedItems.length > 0 && (
				<div className="community-grid">
					{sortedItems.map((item) => {
						const isProgression = 'chordIds' in item
						const isFavorited = isSharedItemFavorited(item.id, isProgression ? 'progression' : 'composition')

						return (
								<div 
									key={item.id} 
									className="community-card"
									onClick={() => setSelectedItem(item)}
									style={{ cursor: 'pointer' }}
								>
								{/* Card Header */}
								<div className="community-card-header">
									<div style={{ flex: 1, minWidth: 0 }}>
										<h3 className="community-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
											{/* Icon to indicate progression vs composition */}
											<span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
												{isProgression ? (
													// Progression icon: three equal horizontal lines (simple sequence)
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ opacity: 0.6 }}>
														<line x1="3" y1="8" x2="21" y2="8"></line>
														<line x1="3" y1="12" x2="21" y2="12"></line>
														<line x1="3" y1="16" x2="21" y2="16"></line>
													</svg>
												) : (
													// Composition icon: musical note with measure bar (suggests rhythm/timing)
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ opacity: 0.6 }}>
														<path d="M9 18V5l12-2v13"></path>
														<circle cx="6" cy="18" r="3"></circle>
														<circle cx="18" cy="16" r="3"></circle>
														<line x1="12" y1="5" x2="12" y2="19"></line>
													</svg>
												)}
											</span>
											<span>{item.name}</span>
										</h3>
										<p className="community-card-author">
											{item.sharedByUsername}
											{item.version > 1 && (
												<span style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>
													{' '}• v{item.version}
												</span>
											)}
										</p>
									</div>
									<button
										className={`community-favorite-btn ${isFavorited ? 'is-favorited' : ''} ${!isAuthenticated ? 'disabled' : ''}`}
										onClick={(e) => {
											e.stopPropagation()
											handleToggleFavorite(item.id, isProgression ? 'progression' : 'composition')
										}}
										disabled={!isAuthenticated}
										aria-label={!isAuthenticated ? 'Login to favorite' : (isFavorited ? 'Remove from favorites' : 'Add to favorites')}
										title={!isAuthenticated ? 'Login to favorite' : (isFavorited ? 'Remove from favorites' : 'Add to favorites')}
									>
										<svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ flexShrink: 0 }}>
											<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
										</svg>
										{item.favoriteCount > 0 && (
											<span className="community-favorite-count">{item.favoriteCount}</span>
										)}
									</button>
								</div>

								{/* Info (no preview cards) */}
								<div className="community-card-info">
									{isProgression ? (
										<div style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.6)' }}>
											{item.chordIds.length} chord{item.chordIds.length !== 1 ? 's' : ''}
										</div>
									) : (
										<div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'rgba(0, 0, 0, 0.6)' }}>
											<span>{item.chords.length} chord{item.chords.length !== 1 ? 's' : ''}</span>
											<span>•</span>
											<span>{item.tempo} BPM</span>
											<span>•</span>
											<span>{item.timeSignature}</span>
										</div>
									)}
									<div style={{ fontSize: '10px', color: 'rgba(0, 0, 0, 0.5)', marginTop: '2px' }}>
										{new Date(item.sharedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
									</div>
								</div>

								{/* No actions on card - click opens modal */}
							</div>
						)
					})}
				</div>
			)}

			{/* Player Modal */}
			{selectedItem && (
				<CommunityPlayerModal
					item={selectedItem}
					fluteType={fluteType}
					tuning={tuning}
					onClose={() => setSelectedItem(null)}
					onSave={() => {
						const isProg = 'chordIds' in selectedItem
						if (isProg) {
							handleSaveProgression(selectedItem as SharedProgression)
						} else {
							handleSaveComposition(selectedItem as SharedComposition)
						}
						setSelectedItem(null)
					}}
					onOpen={() => {
						const isProg = 'chordIds' in selectedItem
						if (isProg) {
							if (onOpenProgression) {
								onOpenProgression(selectedItem as SharedProgression)
							}
						} else {
							if (onOpenComposition) {
								onOpenComposition(selectedItem as SharedComposition)
							}
						}
						setSelectedItem(null)
					}}
				/>
			)}
		</div>
	)
}

