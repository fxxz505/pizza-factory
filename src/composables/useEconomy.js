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
    max: 8,
    baseCost: 800,
    growth: 2.25,
    effect: (lv) => `点击 x${(1 + lv * 0.1).toFixed(2)}`,
  },
  {
    key: 'autoLine',
    branch: '挂机产线',
    icon: '⚙️',
    name: '流水线校准',
    desc: '每级让全部挂机产出提高 8%',
    max: 8,
    baseCost: 1200,
    growth: 2.35,
    effect: (lv) => `挂机 x${(1 + lv * 0.08).toFixed(2)}`,
  },
  {
    key: 'gachaTuning',
    branch: '抽卡烹饪',
    icon: '🎲',
    name: '原料扫描仪',
    desc: '每级降低抽卡成本 3%',
    max: 6,
    baseCost: 1800,
    growth: 2.5,
    effect: (lv) => `抽卡 -${Math.round(gachaDiscount(lv) * 100)}%`,
  },
  {
    key: 'offlineOven',
    branch: '挂机产线',
    icon: '🌙',
    name: '保温烤箱',
    desc: '每级让离线结算效率提高 5%',
    max: 6,
    baseCost: 2400,
    growth: 2.6,
    effect: (lv) => `离线 +${lv * 5}%`,
  },
]

export function researchLevel(state, key) {
  return Math.max(0, Math.floor((state.research && state.research[key]) || 0))
}
export function researchCost(state, def) {
  return Math.floor(def.baseCost * Math.pow(def.growth, researchLevel(state, def.key)))
}
export function gachaDiscount(lv) {
  return Math.min(0.18, lv * 0.03)
}
export function clickResearchMult(state) {
  return 1 + researchLevel(state, 'clickCore') * 0.1
}
export function generatorResearchMult(state) {
  return 1 + researchLevel(state, 'autoLine') * 0.08
}
export function offlineResearchMult(state) {
  return 1 + researchLevel(state, 'offlineOven') * 0.05
}
export function gachaResearchMult(state) {
  return 1 - gachaDiscount(researchLevel(state, 'gachaTuning'))
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
  return Math.min(CRIT_CHANCE_CAP, CRIT_CHANCE_BASE + CRIT_CHANCE_PER_LV * state.critChanceLv)
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
