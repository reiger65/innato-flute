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

	// Load shared items
	useEffect(() => {
		const loadItems = () => {
			const ranked = getRankedSharedItems()
			setSharedItems(ranked)
		}

		loadItems()
		// Refresh every 5 seconds (later: real-time updates from backend)
		const interval = setInterval(loadItems, 5000)
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

		return items.filter(item => item.sharedAt >= cutoffTime)
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
		const isFavorited = isSharedItemFavorited(itemId, itemType)
		if (isFavorited) {
			removeSharedFavorite(itemId, itemType)
		} else {
			addSharedFavorite(itemId, itemType)
		}
		
		// Reload items to update favorite counts
		const ranked = getRankedSharedItems()
		setSharedItems(ranked)
	}

	const sortedItems = getSortedItems()

	// If not authenticated, show introduction and login prompt
	if (!isAuthenticated) {
		return (
			<div className="community-view">
				<div className="section-title">Community</div>
				<div className="section-desc" style={{ marginBottom: 'var(--space-4)' }}>
					Discover and share your favorite progressions and compositions with other INNATO players. Explore what the community has created and let others enjoy your musical explorations.
				</div>
				<div style={{
					textAlign: 'center',
					padding: 'var(--space-6) var(--space-4)',
					border: 'var(--border-2) solid var(--color-black)',
					borderRadius: 'var(--radius-2)',
					background: 'var(--color-white)',
					marginTop: 'var(--space-4)'
				}}>
					<h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
						Free Account Required
					</h3>
					<p style={{ fontSize: 'var(--font-size-base)', color: 'rgba(0, 0, 0, 0.7)', marginBottom: 'var(--space-4)', lineHeight: '1.5' }}>
						Create a free account to unlock the Community section. Share your progressions and compositions, discover what others have created, and build your musical library together with the INNATO community.
					</p>
					<div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
						<button
							className="btn-sm is-active"
							onClick={() => {
								if (onShowLogin) {
									onShowLogin()
								}
							}}
							style={{ minWidth: '140px' }}
						>
							Create Free Account
						</button>
					</div>
				</div>
			</div>
		)
	}

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

			{/* Items Grid */}
			{sortedItems.length === 0 ? (
				<div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'rgba(0, 0, 0, 0.6)' }}>
					<p>No shared items yet. Be the first to share something!</p>
					<p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>
						Mark progressions as favorite or share compositions to see them here.
					</p>
				</div>
			) : (
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
										className={`community-favorite-btn ${isFavorited ? 'is-favorited' : ''}`}
										onClick={(e) => {
											e.stopPropagation()
											handleToggleFavorite(item.id, isProgression ? 'progression' : 'composition')
										}}
										aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
										title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
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

