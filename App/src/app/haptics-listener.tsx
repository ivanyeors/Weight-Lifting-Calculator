"use client"

import { useEffect } from 'react'
import { haptic } from '@/lib/haptics'

export function HapticsListener() {
	useEffect(() => {
		function onPointerDown(e: PointerEvent) {
			try {
				const target = e.target as HTMLElement | null
				if (!target) return
				const el = target.closest('[data-haptic]') as HTMLElement | null
				if (!el) return
				const val = el.getAttribute('data-haptic') as 'light' | 'medium' | 'heavy' | null
				haptic(val ?? 'light')
			} catch {}
		}

		document.addEventListener('pointerdown', onPointerDown, { passive: true })
		return () => document.removeEventListener('pointerdown', onPointerDown)
	}, [])

	return null
}
