import { GEN_DEFS } from '../data/genDefs.js'
import { MAX_SLOTS, START_SLOTS } from '../data/constants.js'
import { fmt, totalSpentSkillPoints } from './useEconomy.js'

export const PRESTIGE_MIN_DISCOVERIES = 12
export const PRESTIGE_MIN_SKILL_POINTS = 18

export function totalEarnedSkillPoints(state) {
  return Math.max(0, Math.floor(state.totalSkillPointsEarned || 0))
}

export function uniqueSkillRecipeCount(state) {
  return Object.keys(state.skillPointRecipes || {}).length
}

export function awardSkillPointsForRecipe(state, recipe, stars) {
  state.skillPointRecipes ||= {}
  if (!recipe || state.skillPointRecipes[recipe.id]) {
    return { gained: 0, total: totalEarnedSkillPoints(state), isFirstSkillPoint: false }
  }
  const gained = Math.max(0, Math.floor(stars || 0))
  state.skillPointRecipes[recipe.id] = gained
  state.skillPoints = Math.max(0, Math.floor(state.skillPoints || 0)) + gained
  state.totalSkillPointsEarned = totalEarnedSkillPoints(state) + gained
  return { gained, total: totalEarnedSkillPoints(state), isFirstSkillPoint: true }
}

export function prestigeReady(state) {
  const newRecipes = uniqueSkillRecipeCount(state) - Math.max(0, Math.floor(state.prestigeRecipeBaseline || 0))
  const newPoints = totalEarnedSkillPoints(state) - Math.max(0, Math.floor(state.prestigePointBaseline || 0))
  return newRecipes >= PRESTIGE_MIN_DISCOVERIES &&
    newPoints >= PRESTIGE_MIN_SKILL_POINTS
}

export function prestigePreview(state) {
  const current = Math.max(0, Math.floor(state.prestigeLevel || 0))
  const next = current + 1
  return {
    current,
    next,
    ready: prestigeReady(state),
    discoveries: Math.max(0, uniqueSkillRecipeCount(state) - Math.max(0, Math.floor(state.prestigeRecipeBaseline || 0))),
    requiredDiscoveries: PRESTIGE_MIN_DISCOVERIES,
    points: Math.max(0, totalEarnedSkillPoints(state) - Math.max(0, Math.floor(state.prestigePointBaseline || 0))),
    requiredPoints: PRESTIGE_MIN_SKILL_POINTS,
    currentBonusPct: Math.round((current * 0.08) * 100),
    nextBonusPct: Math.round((next * 0.08) * 100),
    spentSkillPoints: totalSpentSkillPoints(state),
  }
}

export function performPrestige(state) {
  if (!prestigeReady(state)) return null
  const keptResearch = Object.assign({}, state.research || {})
  const keptSkillPoints = Math.max(0, Math.floor(state.skillPoints || 0))
  const keptTotalSkillPoints = totalEarnedSkillPoints(state)
  const keptSkillRecipes = Object.assign({}, state.skillPointRecipes || {})
  const keptPrestigeLevel = Math.max(0, Math.floor(state.prestigeLevel || 0)) + 1
  const nextRecipeBaseline = uniqueSkillRecipeCount(state)
  const nextPointBaseline = keptTotalSkillPoints
  const keptAchDone = Object.assign({}, state.achDone || {})

  const gens = {}
  GEN_DEFS.forEach(g => { gens[g.key] = 0 })
  state.bytes = 0
  state.clickLevel = 1
  state.critChanceLv = 0
  state.critMultLv = 0
  state.overclockLv = 0
  state.research = keptResearch
  state.skillPoints = keptSkillPoints
  state.totalSkillPointsEarned = keptTotalSkillPoints
  state.skillPointRecipes = keptSkillRecipes
  state.prestigeLevel = keptPrestigeLevel
  state.prestigeRecipeBaseline = nextRecipeBaseline
  state.prestigePointBaseline = nextPointBaseline
  state.gens = gens
  state.inventory = {}
  state.knownIngredients = {}
  state.gachaHistory = []
  state.craftSlots = [null, null, null, null, null]
  state.slots = START_SLOTS
  state.dex = {}
  state.hints = {}
  state.achDone = keptAchDone
  state.unlocked = { gacha: false, kitchen: false, dex: false }
  state.seenNew = { gacha: false, kitchen: false, dex: false }
  state.stats = {
    totalClicks: 0, totalEarned: 0, ingredientPulls: 0, legendaryIngPulls: 0,
    gachaSpent: 0, rarePulls: 0, bestPullTier: -1,
    pullsSinceEpic: 0, bakesTotal: 0, offlineClaims: 0, goldenCaught: 0, hintsBought: 0, critHits: 0,
  }
  state.collectionBonus = 0
  state.buffUntil = 0
  state.buffMult = 1
  state.clickBuffUntil = 0
  state.clickBuffAdd = 0
  state.lastSeen = Date.now()

  return {
    level: keptPrestigeLevel,
    bonusText: '+' + fmt(keptPrestigeLevel * 8) + '%',
  }
}
