import { ING_MAP } from '../../data/ingredients.js'

export const COOK_TIME_MIN_MS = 2400
export const COOK_TIME_MAX_MS = 14000

export function cookingTimeForIngredients(ingKeys) {
  const keys = Array.isArray(ingKeys) ? ingKeys.filter(Boolean) : []
  if (!keys.length) return 0

  const tiers = keys.map(k => ING_MAP[k]?.tier ?? 0)
  const totalTier = tiers.reduce((sum, tier) => sum + tier, 0)
  const maxTier = Math.max(...tiers)
  const extraIngredientCost = Math.max(0, keys.length - 2) * 500
  const rarityCost = totalTier * 650 + maxTier * 900
  const duration = COOK_TIME_MIN_MS + extraIngredientCost + rarityCost

  return Math.min(COOK_TIME_MAX_MS, Math.round(duration))
}

export function formatCookTime(ms) {
  if (!ms) return '0.0秒'
  return (ms / 1000).toFixed(1) + '秒'
}
