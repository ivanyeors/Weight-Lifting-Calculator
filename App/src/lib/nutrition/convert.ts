import type { Quantity, Unit } from './types'

type UnitKind = 'mass' | 'volume' | 'count'

const MASS_FACTORS: Record<Unit, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  lb: 453.59237,
  oz: 28.349523125,
  ml: NaN as unknown as number,
  l: NaN as unknown as number,
  tsp: NaN as unknown as number,
  tbsp: NaN as unknown as number,
  cup: NaN as unknown as number,
  piece: NaN as unknown as number
}

const VOLUME_FACTORS_ML: Record<Unit, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 240,
  g: NaN as unknown as number,
  kg: NaN as unknown as number,
  mg: NaN as unknown as number,
  lb: NaN as unknown as number,
  oz: NaN as unknown as number,
  piece: NaN as unknown as number
}

export function getUnitKind(unit: Unit): UnitKind {
  if (unit === 'piece') return 'count'
  if (unit === 'ml' || unit === 'l' || unit === 'tsp' || unit === 'tbsp' || unit === 'cup') return 'volume'
  return 'mass'
}

// Converts any supported unit to base: grams (for mass) or milliliters (for volume)
export function convertToBase(amount: number, unit: Unit): { value: number; kind: UnitKind } {
  const kind = getUnitKind(unit)
  if (kind === 'mass') {
    const factor = MASS_FACTORS[unit]
    return { value: amount * factor, kind }
  }
  if (kind === 'volume') {
    const factor = VOLUME_FACTORS_ML[unit]
    return { value: amount * factor, kind }
  }
  return { value: amount, kind }
}

export function toQuantity(amount: number, unit: Unit): Quantity {
  return { amount, unit }
}

export function formatQuantityBase(value: number, kind: UnitKind): string {
  if (kind === 'count') return `${value.toFixed(0)} pcs`
  if (kind === 'mass') {
    if (value >= 1000) return `${(value / 1000).toFixed(2)} kg`
    return `${value.toFixed(0)} g`
  }
  // volume
  if (value >= 1000) return `${(value / 1000).toFixed(2)} L`
  return `${value.toFixed(0)} ml`
}


