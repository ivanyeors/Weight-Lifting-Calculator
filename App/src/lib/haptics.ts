export type HapticIntensity = 'light' | 'medium' | 'heavy'

let cachedSupport: boolean | null = null

function isCoarsePointer(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
	try {
		return window.matchMedia('(pointer: coarse)').matches
	} catch {
		return false
	}
}

function supportsVibrate(): boolean {
	if (cachedSupport !== null) return cachedSupport
	if (typeof navigator === 'undefined') return false
	// @ts-expect-error - vibrate may not exist
	cachedSupport = typeof navigator.vibrate === 'function'
	return cachedSupport
}

function patternFor(intensity: HapticIntensity): number | number[] {
	switch (intensity) {
		case 'light':
			return 10
		case 'medium':
			return 20
		case 'heavy':
			return 35
	}
}

export function haptic(intensity: HapticIntensity = 'light'): void {
	if (!isCoarsePointer()) return
	if (!supportsVibrate()) return
	try {
		// @ts-expect-error - vibrate may not exist
		navigator.vibrate(patternFor(intensity))
	} catch {
		// no-op
	}
}

export function hapticOnPress(intensity: HapticIntensity = 'light') {
	return (event?: Event | React.SyntheticEvent) => {
		try {
			if (event && 'preventDefault' in event) {
				// Do not block default; just ensure it runs quickly
			}
			haptic(intensity)
		} catch {}
	}
}
