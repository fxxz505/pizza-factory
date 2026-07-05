// 纯函数经济公式集合 —— 与原版数值/曲线完全一致，均显式接收 state 参数。
import { GEN_DEFS } from '../data/genDefs.js'
import {
  CRIT_CHANCE_BASE, CRIT_CHANCE_PER_LV, CRIT_CHANCE_CAP,
  CRIT_CHANCE_BASE_COST, CRIT_CHANCE_GROWTH,
  CRIT_MULT_BASE, CRIT_MULT_PER_LV, CRIT_MULT_BASE_COST, CRIT_MULT_GROWTH,
  OVERCLOCK_BASE_COST, OVERCLOCK_GROWTH, OVERCLOCK_LV_MULT,
  GACHA_BASE_COST, GACHA_GROWTH, HINT_BASE_COST, HINT_GROWTH,
  CLICK_UPGRADE_BASE_COST, CLICK_UPGRADE_GROWTH,
} from '../data/constants.js'

export const RESEARCH_DEFS = [
  {
    key: 'clickCore',
    branch: '点击核心',
    icon: '👆',
    name: '脉冲手套',
    desc: '每级让点击收益提高 10%',
    max: 5,
    row: 1,
    col: 1,
    cost: 1,
    req: null,
    effect: (lv) => `点击 x${(1 + lv * 0.1).toFixed(2)}`,
  },
  {
    key: 'critSpark',
    branch: '点击核心',
    icon: '🎯',
    name: '暴击火花',
    desc: '每级让暴击率额外提高 1%',
    max: 5,
    row: 2,
    col: 1,
    cost: 2,
    req: { key: 'clickCore', level: 2 },
    effect: (lv) => `暴击 +${lv}%`,
  },
  {
    key: 'autoLine',
    branch: '挂机产线',
    icon: '⚙️',
    name: '流水线校准',
    desc: '每级让全部挂机产出提高 8%',
    max: 5,
    row: 1,
    col: 2,
    cost: 1,
    req: null,
    effect: (lv) => `挂机 x${(1 + lv * 0.08).toFixed(2)}`,
  },
  {
    key: 'offlineOven',
    branch: '挂机产线',
    icon: '🌙',
    name: '保温烤箱',
    desc: '每级让离线结算效率提高 5%',
    max: 5,
    row: 2,
    col: 2,
    cost: 2,
    req: { key: 'autoLine', level: 2 },
    effect: (lv) => `离线 +${lv * 5}%`,
  },
  {
    key: 'gachaTuning',
    branch: '抽卡烹饪',
    icon: '🎲',
    name: '原料扫描仪',
    desc: '每级降低抽卡成本 3%',
    max: 5,
    row: 1,
    col: 3,
    cost: 1,
    req: null,
    effect: (lv) => `抽卡 -${Math.round(gachaDiscount(lv) * 100)}%`,
  },
  {
    key: 'kitchenMaster',
    branch: '抽卡烹饪',
    icon: '🍕',
    name: '主厨手册',
    desc: '每级让烘焙奖励提高 10%',
    max: 5,
    row: 2,
    col: 3,
    cost: 2,
    req: { key: 'gachaTuning', level: 2 },
    effect: (lv) => `烘焙 x${(1 + lv * 0.1).toFixed(2)}`,
  },
  {
    key: 'prestigeForge',
    branch: '转生炉心',
    icon: '🔥',
    name: '重启协议',
    desc: '每级让转生加成额外提高 3%',
    max: 4,
    row: 3,
    col: 2,
    cost: 3,
    req: { any: [
      { key: 'critSpark', level: 2 },
      { key: 'offlineOven', level: 2 },
      { key: 'kitchenMaster', level: 2 },
    ] },
    effect: (lv) => `转生 +${lv * 3}%`,
  },
]

export function researchLevel(state, key) {
  return Math.max(0, Math.floor((state.research && state.research[key]) || 0))
}
export function researchCost(state, def) {
  const lv = researchLevel(state, def.key)
  return typeof def.cost === 'function' ? def.cost(lv) : def.cost
}
export function researchUnlocked(state, def) {
  if (!def.req) return true
  if (def.req.any) return def.req.any.some(req => researchLevel(state, req.key) >= req.level)
  return researchLevel(state, def.req.key) >= def.req.level
}
export function availableSkillPoints(state) {
  return Math.max(0, Math.floor(state.skillPoints || 0))
}
export function canBuyResearch(state, def) {
  return researchUnlocked(state, def) &&
    researchLevel(state, def.key) < def.max &&
    availableSkillPoints(state) >= researchCost(state, def)
}
export function totalSpentSkillPoints(state) {
  return RESEARCH_DEFS.reduce((sum, def) => {
    const lv = researchLevel(state, def.key)
    let spent = 0
    for (let i = 0; i < lv; i++) {
      spent += typeof def.cost === 'function' ? def.cost(i) : def.cost
    }
    return sum + spent
  }, 0)
}
export function gachaDiscount(lv) {
  return Math.min(0.15, lv * 0.03)
}
export function prestigeMult(state) {
  const base = 1 + Math.max(0, Math.floor(state.prestigeLevel || 0)) * 0.08
  return base + researchLevel(state, 'prestigeForge') * 0.03
}
export function clickResearchMult(state) {
  return (1 + researchLevel(state, 'clickCore') * 0.1) * prestigeMult(state)
}
export function generatorResearchMult(state) {
  return (1 + researchLevel(state, 'autoLine') * 0.08) * prestigeMult(state)
}
export function offlineResearchMult(state) {
  return 1 + researchLevel(state, 'offlineOven') * 0.05
}
export function gachaResearchMult(state) {
  return 1 - gachaDiscount(researchLevel(state, 'gachaTuning'))
}
export function craftRewardResearchMult(state) {
  return 1 + researchLevel(state, 'kitchenMaster') * 0.1
}

export function clickPower(state) {
  let base = state.clickLevel
  if (Date.now() < state.clickBuffUntil) base += state.clickBuffAdd
  return Math.max(1, Math.round(base * clickResearchMult(state)))
}
export function clickUpgradeCost(state) {
  return Math.floor(CLICK_UPGRADE_BASE_COST * Math.pow(CLICK_UPGRADE_GROWTH, state.clickLevel - 1))
}
export function critChance(state) {
  return Math.min(CRIT_CHANCE_CAP, CRIT_CHANCE_BASE + CRIT_CHANCE_PER_LV * state.critChanceLv + researchLevel(state, 'critSpark') * 0.01)
}
export function critMultiplier(state) {
  return CRIT_MULT_BASE + CRIT_MULT_PER_LV * state.critMultLv
}
export function critChanceCost(state) {
  return Math.floor(CRIT_CHANCE_BASE_COST * Math.pow(CRIT_CHANCE_GROWTH, state.critChanceLv))
}
export function critMultCost(state) {
  return Math.floor(CRIT_MULT_BASE_COST * Math.pow(CRIT_MULT_GROWTH, state.critMultLv))
}
export function overclockMult(state) {
  return Math.pow(OVERCLOCK_LV_MULT, state.overclockLv)
}
export function overclockCost(state) {
  return Math.floor(OVERCLOCK_BASE_COST * Math.pow(OVERCLOCK_GROWTH, state.overclockLv))
}
export function genCost(state, defIdx) {
  const def = GEN_DEFS[defIdx]
  return Math.floor(def.baseCost * Math.pow(def.growth, state.gens[def.key]))
}
export function bytesPerSecond(state) {
  let total = 0
  GEN_DEFS.forEach(def => { total += def.baseProd * state.gens[def.key] })
  total *= (1 + state.collectionBonus)
  total *= generatorResearchMult(state)
  total *= overclockMult(state)
  if (Date.now() < state.buffUntil) total *= state.buffMult
  return total
}
export function gachaSingleCost(pullsDone) {
  return Math.round(GACHA_BASE_COST * Math.pow(GACHA_GROWTH, pullsDone))
}
export function gachaSingleCostForState(state, pullsDone = state.stats.ingredientPulls) {
  return Math.max(1, Math.round(gachaSingleCost(pullsDone) * gachaResearchMult(state)))
}
export function gacha10Cost(state) {
  let total = 0
  const p = state.stats.ingredientPulls
  for (let i = 0; i < 10; i++) { total += gachaSingleCost(p + i) }
  total *= gachaResearchMult(state)
  return Math.round(total * 0.95)
}
export function hintCost(state) {
  return Math.round(HINT_BASE_COST * Math.pow(HINT_GROWTH, state.stats.hintsBought))
}

/* ---- Formatting ---- */
export function fmt(n) {
  n = Math.floor(n)
  const sign = n < 0 ? '-' : ''
  n = Math.abs(n)
  if (n < 1000) return sign + String(n)
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']
  let u = 0, v = n
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++ }
  return sign + v.toFixed(v < 10 ? 2 : (v < 100 ? 1 : 0)) + units[u]
}
export function fmtRate(n) {
  const sign = n < 0 ? '-' : ''
  n = Math.abs(n)
  if (n < 1000) {
    if (Math.abs(n - Math.round(n)) < 0.005) return sign + String(Math.round(n))
    const s = n.toFixed(n < 10 ? 2 : 1)
    return sign + s.replace(/0+$/, '').replace(/\.$/, '')
  }
  const units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi']
  let u = 0, v = n
  while (v >= 1000 && u < units.length - 1) { v /= 1000; u++ }
  return sign + v.toFixed(v < 10 ? 2 : (v < 100 ? 1 : 0)) + units[u]
}
export function pad2(n) { return n < 10 ? '0' + n : '' + n }
