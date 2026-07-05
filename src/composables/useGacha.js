// 抽卡逻辑：weightedIndex/pullOne/单抽/十连（含保底、十连稀有度保证、抽卡历史与新食材标记）。
import { INGREDIENT_WEIGHTS } from '../data/constants.js'
import { ING_BY_TIER } from '../data/ingredients.js'
import { RARITIES } from '../data/rarities.js'
import { gachaSingleCostForState, gacha10Cost, fmt, gachaPityThreshold, gachaRareBoost } from './useEconomy.js'
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'
import { ensureAudio, sfxError } from './useAudio.js'
import { triggerScreenShake } from './useFeedback.js'
import { checkAchievements } from './useAchievements.js'
import { checkUnlocks } from './useUnlocks.js'

const HISTORY_LIMIT = 8

export function weightedIndex(weights, roll) {
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  for (let i = 0; i < weights.length; i++) { acc += weights[i] / total; if (roll < acc) return i }
  return weights.length - 1
}

function tunedIngredientWeights(state) {
  const boost = gachaRareBoost(state)
  return INGREDIENT_WEIGHTS.map((weight, idx) => idx >= 2 ? weight * boost : weight)
}

function ensureGachaState(state) {
  state.knownIngredients ||= {}
  state.gachaHistory ||= []
  state.stats.gachaSpent ||= 0
  state.stats.rarePulls ||= 0
  if (typeof state.stats.bestPullTier !== 'number') state.stats.bestPullTier = -1
}

function addInventory(state, ing) {
  state.inventory[ing.key] = (state.inventory[ing.key] || 0) + 1
}

function removeInventory(state, ing) {
  state.inventory[ing.key] = Math.max(0, (state.inventory[ing.key] || 0) - 1)
  if (state.inventory[ing.key] <= 0) delete state.inventory[ing.key]
}

function decoratePull(state, ing, tierIdx, guaranteed = false) {
  ensureGachaState(state)
  const isNew = !state.knownIngredients[ing.key]
  state.knownIngredients[ing.key] = { ts: Date.now(), tier: tierIdx }
  state.stats.bestPullTier = Math.max(state.stats.bestPullTier, tierIdx)
  if (tierIdx >= 2) state.stats.rarePulls++
  return { ing, tierIdx, isNew, guaranteed }
}

export function pullOne(state, options = {}) {
  ensureGachaState(state)
  let forceMin
  if (state.stats.pullsSinceEpic >= gachaPityThreshold(state)) forceMin = 3
  let tierIdx = weightedIndex(tunedIngredientWeights(state), Math.random())
  if (forceMin !== undefined && tierIdx < forceMin) tierIdx = forceMin
  const pool = ING_BY_TIER[tierIdx]
  const ing = pool[Math.floor(Math.random() * pool.length)]
  state.stats.ingredientPulls++
  if (tierIdx >= 3) state.stats.pullsSinceEpic = 0
  else state.stats.pullsSinceEpic++
  if (tierIdx === 4) state.stats.legendaryIngPulls++
  addInventory(state, ing)
  return decoratePull(state, ing, tierIdx, options.guaranteed || forceMin !== undefined)
}

function summarize(results, cost, mode) {
  const maxTier = Math.max(...results.map(r => r.tierIdx))
  const newCount = results.filter(r => r.isNew).length
  const rareCount = results.filter(r => r.tierIdx >= 2).length
  return { cost, mode, maxTier, newCount, rareCount, label: RARITIES[maxTier].label }
}

function rememberPull(state, results, cost, mode) {
  ensureGachaState(state)
  state.stats.gachaSpent += cost
  const summary = summarize(results, cost, mode)
  state.gachaHistory.unshift({
    ts: Date.now(), mode, cost,
    maxTier: summary.maxTier,
    newCount: summary.newCount,
    rareCount: summary.rareCount,
    names: results.slice(0, 5).map(r => r.ing.name),
  })
  state.gachaHistory = state.gachaHistory.slice(0, HISTORY_LIMIT)
  return summary
}

function afterInventoryChange(state) {
  saveState()
  checkUnlocks(state)
  checkAchievements(state)
}

function failPull(cost, state, onFail) {
  sfxError()
  triggerScreenShake('soft')
  if (onFail) onFail()
  showToast('字节不足', '还差 ' + fmt(cost - state.bytes) + ' 字节。回工厂点几下披萨，或等产线攒一会儿。')
}

export function doSinglePull(state, onFail) {
  ensureGachaState(state)
  const cost = gachaSingleCostForState(state)
  if (state.bytes < cost) {
    failPull(cost, state, onFail)
    return null
  }
  ensureAudio()
  state.bytes -= cost
  const results = [pullOne(state)]
  const summary = rememberPull(state, results, cost, 'single')
  afterInventoryChange(state)
  return { results, summary }
}

export function doTenPull(state, onFail) {
  ensureGachaState(state)
  const cost = gacha10Cost(state)
  if (state.bytes < cost) {
    failPull(cost, state, onFail)
    return null
  }
  ensureAudio()
  state.bytes -= cost
  const results = []
  for (let i = 0; i < 10; i++) results.push(pullOne(state))
  if (!results.some(r => r.tierIdx >= 2)) {
    const last = results[results.length - 1]
    removeInventory(state, last.ing)
    if (last.tierIdx === 4) state.stats.legendaryIngPulls = Math.max(0, state.stats.legendaryIngPulls - 1)
    if (last.tierIdx >= 2) state.stats.rarePulls = Math.max(0, state.stats.rarePulls - 1)
    const pool = ING_BY_TIER[2]
    const upgraded = pool[Math.floor(Math.random() * pool.length)]
    addInventory(state, upgraded)
    results[results.length - 1] = decoratePull(state, upgraded, 2, true)
  }
  const summary = rememberPull(state, results, cost, 'ten')
  afterInventoryChange(state)
  return { results, summary }
}
