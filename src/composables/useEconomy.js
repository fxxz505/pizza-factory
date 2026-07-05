// 纯函数经济公式集合 —— 与原版数值/曲线完全一致，均显式接收 state 参数。
import { GEN_DEFS } from '../data/genDefs.js'
import {
  CRIT_CHANCE_BASE, CRIT_CHANCE_PER_LV, CRIT_CHANCE_CAP,
  CRIT_CHANCE_BASE_COST, CRIT_CHANCE_GROWTH,
  CRIT_MULT_BASE, CRIT_MULT_PER_LV, CRIT_MULT_BASE_COST, CRIT_MULT_GROWTH,
  OVERCLOCK_BASE_COST, OVERCLOCK_GROWTH, OVERCLOCK_LV_MULT,
  GACHA_BASE_COST, GACHA_GROWTH, HINT_BASE_COST, HINT_GROWTH,
  CLICK_UPGRADE_BASE_COST, CLICK_UPGRADE_GROWTH,
  PITY_THRESHOLD,
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
    cost: (lv) => 1 + Math.floor(lv / 2),
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
    key: 'critOven',
    branch: '点击核心',
    icon: '💥',
    name: '爆裂烤痕',
    desc: '提升暴击时的字节倍率',
    max: 4,
    row: 3,
    col: 1,
    cost: (lv) => 2 + lv,
    req: { key: 'critSpark', level: 2 },
    effect: (lv) => `暴击倍率 +${(lv * 0.25).toFixed(2)}`,
  },
  {
    key: 'clickFever',
    branch: '点击核心',
    icon: '🔥',
    name: '连点炉温',
    desc: '让点击收益获得额外稳定加成',
    max: 5,
    row: 4,
    col: 1,
    cost: (lv) => 3 + lv,
    req: { key: 'critOven', level: 2 },
    effect: (lv) => `点击 +${lv * 6}%`,
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
    cost: (lv) => 1 + Math.floor(lv / 2),
    req: null,
    effect: (lv) => `挂机 x${(1 + lv * 0.08).toFixed(2)}`,
  },
  {
    key: 'lineMatrix',
    branch: '挂机产线',
    icon: '🧱',
    name: '模块化输送带',
    desc: '继续提高产线吞吐效率',
    max: 5,
    row: 2,
    col: 2,
    cost: 2,
    req: { key: 'autoLine', level: 2 },
    effect: (lv) => `挂机 +${lv * 6}%`,
  },
  {
    key: 'offlineOven',
    branch: '挂机产线',
    icon: '🌙',
    name: '保温烤箱',
    desc: '每级让离线结算效率提高 5%',
    max: 5,
    row: 3,
    col: 2,
    cost: 2,
    req: { key: 'lineMatrix', level: 2 },
    effect: (lv) => `离线 +${lv * 5}%`,
  },
  {
    key: 'idleMemory',
    branch: '挂机产线',
    icon: '🧠',
    name: '空闲记忆体',
    desc: '同时强化挂机和离线收益',
    max: 4,
    row: 4,
    col: 2,
    cost: (lv) => 3 + lv,
    req: { key: 'offlineOven', level: 2 },
    effect: (lv) => `挂机/离线 +${lv * 8}%`,
  },
  {
    key: 'gachaTuning',
    branch: '原料抽卡',
    icon: '🎲',
    name: '原料扫描仪',
    desc: '每级降低抽卡成本 3%',
    max: 5,
    row: 1,
    col: 3,
    cost: (lv) => 1 + Math.floor(lv / 2),
    req: null,
    effect: (lv) => `抽卡 -${Math.round(gachaDiscount(lv) * 100)}%`,
  },
  {
    key: 'scannerArray',
    branch: '原料抽卡',
    icon: '📡',
    name: '保底天线阵列',
    desc: '缩短史诗保底所需抽数',
    max: 4,
    row: 2,
    col: 3,
    cost: 2,
    req: { key: 'gachaTuning', level: 2 },
    effect: (lv) => `保底 -${lv * 3} 抽`,
  },
  {
    key: 'rareMagnet',
    branch: '原料抽卡',
    icon: '🧲',
    name: '稀有磁场',
    desc: '提高稀有及以上原料的抽取权重',
    max: 5,
    row: 3,
    col: 3,
    cost: (lv) => 2 + lv,
    req: { key: 'scannerArray', level: 2 },
    effect: (lv) => `稀有权重 +${lv * 8}%`,
  },
  {
    key: 'goldScanner',
    branch: '原料抽卡',
    icon: '✨',
    name: '金色信标',
    desc: '提高金色披萨事件奖励',
    max: 4,
    row: 4,
    col: 3,
    cost: (lv) => 3 + lv,
    req: { key: 'rareMagnet', level: 2 },
    effect: (lv) => `金色奖励 +${lv * 15}%`,
  },
  {
    key: 'kitchenMaster',
    branch: '厨房图鉴',
    icon: '🍕',
    name: '主厨手册',
    desc: '每级让烘焙奖励提高 10%',
    max: 5,
    row: 1,
    col: 4,
    cost: (lv) => 1 + Math.floor(lv / 2),
    req: null,
    effect: (lv) => `烘焙 x${(1 + lv * 0.1).toFixed(2)}`,
  },
  {
    key: 'starPlating',
    branch: '厨房图鉴',
    icon: '⭐',
    name: '星级摆盘',
    desc: '继续提高披萨出炉奖励',
    max: 5,
    row: 2,
    col: 4,
    cost: 2,
    req: { key: 'kitchenMaster', level: 2 },
    effect: (lv) => `烘焙 +${lv * 8}%`,
  },
  {
    key: 'recipeRadar',
    branch: '厨房图鉴',
    icon: '📖',
    name: '配方雷达',
    desc: '降低购买配方线索的字节成本',
    max: 5,
    row: 3,
    col: 4,
    cost: (lv) => 2 + lv,
    req: { key: 'starPlating', level: 2 },
    effect: (lv) => `线索 -${lv * 5}%`,
  },
  {
    key: 'spiceChain',
    branch: '厨房图鉴',
    icon: '🌶️',
    name: '香料连锁',
    desc: '让所有产出获得小幅综合提升',
    max: 4,
    row: 4,
    col: 4,
    cost: (lv) => 3 + lv,
    req: { key: 'recipeRadar', level: 2 },
    effect: (lv) => `全产出 +${lv * 3}%`,
  },
  {
    key: 'prestigeForge',
    branch: '转生炉心',
    icon: '🔁',
    name: '重启协议',
    desc: '每级让转生加成额外提高 3%',
    max: 4,
    row: 3,
    col: 5,
    cost: 3,
    req: { any: [
      { key: 'critSpark', level: 2 },
      { key: 'offlineOven', level: 2 },
      { key: 'kitchenMaster', level: 2 },
    ] },
    effect: (lv) => `转生 +${lv * 3}%`,
  },
  {
    key: 'legacyCache',
    branch: '转生炉心',
    icon: '💾',
    name: '遗产缓存',
    desc: '让转生后的基础产出成长更明显',
    max: 4,
    row: 4,
    col: 5,
    cost: (lv) => 4 + lv,
    req: { key: 'prestigeForge', level: 2 },
    effect: (lv) => `转生 +${lv * 4}%`,
  },
  {
    key: 'pixelSingularity',
    branch: '终局核心',
    icon: '🌟',
    name: '像素奇点',
    desc: '综合强化点击、挂机与厨房收益',
    max: 3,
    row: 5,
    col: 3,
    cost: (lv) => 5 + lv * 2,
    req: { any: [
      { key: 'clickFever', level: 3 },
      { key: 'idleMemory', level: 3 },
      { key: 'goldScanner', level: 3 },
      { key: 'spiceChain', level: 3 },
      { key: 'legacyCache', level: 2 },
    ] },
    effect: (lv) => `核心 x${(1 + lv * 0.05).toFixed(2)}`,
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
export function globalResearchMult(state) {
  return 1 + researchLevel(state, 'spiceChain') * 0.03 + researchLevel(state, 'pixelSingularity') * 0.05
}
export function prestigeMult(state) {
  const base = 1 + Math.max(0, Math.floor(state.prestigeLevel || 0)) * 0.08
  return base + researchLevel(state, 'prestigeForge') * 0.03 + researchLevel(state, 'legacyCache') * 0.04
}
export function clickResearchMult(state) {
  return (1 + researchLevel(state, 'clickCore') * 0.1 + researchLevel(state, 'clickFever') * 0.06) * prestigeMult(state) * globalResearchMult(state)
}
export function generatorResearchMult(state) {
  return (1 + researchLevel(state, 'autoLine') * 0.08 + researchLevel(state, 'lineMatrix') * 0.06 + researchLevel(state, 'idleMemory') * 0.08) * prestigeMult(state) * globalResearchMult(state)
}
export function offlineResearchMult(state) {
  return 1 + researchLevel(state, 'offlineOven') * 0.05 + researchLevel(state, 'idleMemory') * 0.08
}
export function gachaResearchMult(state) {
  const discount = gachaDiscount(researchLevel(state, 'gachaTuning')) + researchLevel(state, 'scannerArray') * 0.015
  return 1 - Math.min(0.25, discount)
}
export function craftRewardResearchMult(state) {
  return (1 + researchLevel(state, 'kitchenMaster') * 0.1 + researchLevel(state, 'starPlating') * 0.08) * globalResearchMult(state)
}
export function hintResearchMult(state) {
  return 1 - Math.min(0.25, researchLevel(state, 'recipeRadar') * 0.05)
}
export function gachaRareBoost(state) {
  return 1 + researchLevel(state, 'rareMagnet') * 0.08
}
export function gachaPityThreshold(state) {
  return Math.max(24, PITY_THRESHOLD - researchLevel(state, 'scannerArray') * 3)
}
export function goldenRewardResearchMult(state) {
  return 1 + researchLevel(state, 'goldScanner') * 0.15 + researchLevel(state, 'pixelSingularity') * 0.05
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
  return CRIT_MULT_BASE + CRIT_MULT_PER_LV * state.critMultLv + researchLevel(state, 'critOven') * 0.25
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
  return Math.max(1, Math.round(HINT_BASE_COST * Math.pow(HINT_GROWTH, state.stats.hintsBought) * hintResearchMult(state)))
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
