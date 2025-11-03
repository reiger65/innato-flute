# Delete All Compositions and Progressions

## Option 1: Browser Console (Easiest)

1. Open your app in the browser
2. Open the browser console (F12 or right-click → Inspect → Console)
3. Copy and paste this code:

```javascript
(async () => {
	console.log('Starting deletion...')
	
	// Import the functions
	const compModule = await import('./src/lib/compositionService.ts')
	const progModule = await import('./src/lib/progressionService.ts')
	
	// Delete all compositions
	const compsDeleted = await compModule.deleteAllCompositions()
	console.log(`Deleted ${compsDeleted} compositions`)
	
	// Delete all progressions  
	const progsDeleted = await progModule.deleteAllProgressions()
	console.log(`Deleted ${progsDeleted} progressions`)
	
	// Clear sync flags
	sessionStorage.clear()
	
	// Clear deleted IDs tracking
	localStorage.removeItem('deleted-composition-ids')
	
	console.log('Done! Reloading page...')
	alert(`Deleted ${compsDeleted} compositions and ${progsDeleted} progressions. Reloading...`)
	window.location.reload()
})()
```

4. Press Enter to execute
5. The page will reload automatically

## Option 2: Direct Supabase Deletion

If you have access to Supabase dashboard, you can run this SQL:

```sql
-- Delete all compositions for current user (replace YOUR_USER_ID)
DELETE FROM compositions WHERE user_id = 'YOUR_USER_ID';

-- Delete all progressions for current user
DELETE FROM progressions WHERE user_id = 'YOUR_USER_ID';
```

## Option 3: Clear localStorage and sessionStorage

1. Open browser console (F12)
2. Run:
```javascript
localStorage.clear()
sessionStorage.clear()
window.location.reload()
```

Note: This only clears browser storage, not Supabase data.

