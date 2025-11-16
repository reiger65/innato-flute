const STORAGE_KEY = 'innato-lesson-categories'

export function loadCategories(): string[] {
	try {
		const data = localStorage.getItem(STORAGE_KEY)
		if (!data) return []
		const arr = JSON.parse(data)
		return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
	} catch (e) {
		console.error('Error loading categories:', e)
		return []
	}
}

export function saveCategories(categories: string[]): void {
	try {
		const unique = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)))
		localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
	} catch (e) {
		console.error('Error saving categories:', e)
	}
}

export function addCategory(name: string): void {
	const trimmed = name.trim()
	if (!trimmed) return
	const existing = loadCategories()
	if (existing.includes(trimmed)) return
	existing.push(trimmed)
	saveCategories(existing)
}

export function removeCategory(category: string): void {
	const trimmed = category.trim()
	const existing = loadCategories()
	const next = existing.filter((c) => c !== trimmed)
	saveCategories(next)
}

export function renameCategory(oldName: string, newName: string): void {
	const trimmedNew = newName.trim()
	if (!trimmedNew) return
	const existing = loadCategories()
	const next = existing.map((c) => (c === oldName ? trimmedNew : c))
	saveCategories(next)
}







