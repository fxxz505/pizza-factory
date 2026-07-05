// 核心响应式游戏状态：defaultState/mergeState/load/save/reset/export/import。
//
// 存档兼容性说明（重要）：
// 原版 RECIPES 是手写的 24 条、id 形如 'farmhouse'/'hawaiian' 的固定配方表。
// 本迁移版把 RECIPES 换成了构建期生成的 21679 条记录，id 形如 'r1_mushroompepp'，
// 与旧 id 体系完全不同。因此旧存档（localStorage 里 digitalPizzaFactory_v2）
// 里 state.dex / state.hints 用旧配方 id 作为 key 的记录，在新版本里不会匹配到
// 任何新配方 —— 相当于图鉴发现进度、配方线索、以及由图鉴驱动的 collectionBonus/
// 相关成就（craftMatch/craftLegend/dex12/dexAll 等）会在读取旧档后"表现为归零"。
// 这是本次迁移的既定、已知行为，不是 bug：mergeState 仍会正常合并旧存档的其余
// 字段（bytes/gens/inventory/achDone 等），不会抛错或崩溃，只是 dex/hints 部分
// 实质上从空白重新开始积累。
import { reactive } from 'vue'
import { GEN_DEFS } from '../data/genDefs.js'
import { MAX_SLOTS, START_SLOTS, SAVE_KEY } from '../data/constants.js'

export function defaultState() {
  const gens = {}
  GEN_DEFS.forEach(g => { gens[g.key] = 0 })
  return {
    saveVersion: 3,
    bytes: 0,
    clickLevel: 1,
    critChanceLv: 0,
    critMultLv: 0,
    overclockLv: 0,
    research: {},
    skillPoints: 0,
    totalSkillPointsEarned: 0,
    skillPointRecipes: {},
    prestigeLevel: 0,
    prestigeRecipeBaseline: 0,
    prestigePointBaseline: 0,
    gens,
    inventory: {},
    knownIngredients: {},
    gachaHistory: [],
    craftSlots: [null, null, null, null, null],
    slots: START_SLOTS,
    dex: {},
    hints: {},
    achDone: {},
    unlocked: { gacha: false, kitchen: false, dex: false, skills: true },
    seenNew: { gacha: false, kitchen: false, dex: false, skills: true },
    uiAchOpen: false,
    stats: {
      totalClicks: 0, totalEarned: 0, ingredientPulls: 0, legendaryIngPulls: 0,
      gachaSpent: 0, rarePulls: 0, bestPullTier: -1,
      pullsSinceEpic: 0, bakesTotal: 0, offlineClaims: 0, goldenCaught: 0, hintsBought: 0, critHits: 0,
    },
    collectionBonus: 0,
    buffUntil: 0, buffMult: 1,
    clickBuffUntil: 0, clickBuffAdd: 0,
    lastSeen: Date.now(),
  }
}

export function mergeState(parsed) {
  const fresh = defaultState()
  return Object.assign(fresh, parsed, {
    gens: Object.assign(fresh.gens, parsed.gens || {}),
    research: Object.assign(fresh.research, parsed.research || {}),
    skillPoints: Math.max(0, Math.floor(parsed.skillPoints || 0)),
    totalSkillPointsEarned: Math.max(0, Math.floor(parsed.totalSkillPointsEarned || 0)),
    skillPointRecipes: Object.assign({}, parsed.skillPointRecipes || {}),
    prestigeLevel: Math.max(0, Math.floor(parsed.prestigeLevel || 0)),
    prestigeRecipeBaseline: Math.max(0, Math.floor(parsed.prestigeRecipeBaseline || 0)),
    prestigePointBaseline: Math.max(0, Math.floor(parsed.prestigePointBaseline || 0)),
    stats: Object.assign(fresh.stats, parsed.stats || {}),
    unlocked: Object.assign(fresh.unlocked, parsed.unlocked || {}),
    seenNew: Object.assign(fresh.seenNew, parsed.seenNew || {}),
    inventory: Object.assign({}, parsed.inventory || {}),
    knownIngredients: Object.assign({}, parsed.knownIngredients || {}),
    gachaHistory: Array.isArray(parsed.gachaHistory) ? parsed.gachaHistory.slice(-8) : fresh.gachaHistory,
    hints: Object.assign({}, parsed.hints || {}),
    dex: Object.assign({}, parsed.dex || {}),
    achDone: Object.assign({}, parsed.achDone || {}),
    craftSlots: Array.isArray(parsed.craftSlots) ? parsed.craftSlots.slice(0, MAX_SLOTS) : fresh.craftSlots,
  })
}

function loadStateRaw() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return defaultState()
    return mergeState(JSON.parse(raw))
  } catch (e) { return defaultState() }
}

export const state = reactive(loadStateRaw())

export function saveState() {
  state.lastSeen = Date.now()
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
}

export function resetState() {
  try { localStorage.removeItem(SAVE_KEY) } catch (e) { /* ignore */ }
  Object.assign(state, defaultState())
}

export function encodeSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))))
}

export function importSave(rawCode) {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(rawCode))))
  if (typeof parsed !== 'object' || parsed === null || typeof parsed.bytes !== 'number' || !parsed.stats) {
    throw new Error('bad shape')
  }
  Object.assign(state, mergeState(parsed))
  saveState()
}
