// 厨房逻辑：购买合成格、放入/取出原料、烘焙。
// 数据层改动的直接后果：RECIPE_SIG_MAP.get(sig) 现在覆盖全部 2~5 件原料组合，
// 因此必然命中 —— 原版 doBake/actuallyBake 里"未收录配方 → creativeReward()"
// 的 else 分支在本版本中已被删除，只保留"命中配方"这一条路径。
import { ING_MAP } from '../data/ingredients.js'
import { RARITIES } from '../data/rarities.js'
import { RECIPE_SIG_MAP } from '../data/recipes.js'
import { CRAFT_REWARD, FIRST_DISCOVERY_MULT, COLLECTION_BONUS, SLOT_UNLOCK_COST, MAX_SLOTS } from '../data/constants.js'
import { cookingTimeForIngredients } from './utils/cookingTime.js'
import { craftRewardResearchMult } from './useEconomy.js'
import { awardSkillPointsForRecipe } from './usePrestige.js'
import { triggerScreenShake } from './useFeedback.js'
import { saveState } from './useGameState.js'
import { showToast, showConfirm } from './useToast.js'
import { ensureAudio, sfxBuy, sfxRemove, sfxPlace, sfxTier, sfxCookStart, sfxCookDone, haptic } from './useAudio.js'
import { checkAchievements } from './useAchievements.js'
import { checkUnlocks } from './useUnlocks.js'

export function buySlot(state, slotNum) {
  const cost = SLOT_UNLOCK_COST[slotNum]
  if (!cost || state.bytes < cost || state.slots >= slotNum) return
  state.bytes -= cost
  state.slots = slotNum
  sfxBuy()
  triggerScreenShake('soft')
  showToast('合成格解锁', '现在可以使用 ' + slotNum + ' 个原料同时合成，尝试更复杂的配方吧。')
  checkAchievements(state)
  saveState()
}

export function removeFromSlot(state, i) {
  const key = state.craftSlots[i]
  if (!key) return
  state.inventory[key] = (state.inventory[key] || 0) + 1
  state.craftSlots[i] = null
  ensureAudio()
  sfxRemove()
  triggerScreenShake('soft')
  saveState()
}

export function placeIntoFirstEmptySlot(state, key) {
  if ((state.inventory[key] || 0) <= 0) return
  const idx = state.craftSlots.slice(0, state.slots).findIndex(s => s === null)
  if (idx === -1) { showToast('格子已满', '先移出一个原料，或购买新的合成格。'); return }
  state.craftSlots[idx] = key
  state.inventory[key]--
  if (state.inventory[key] <= 0) delete state.inventory[key]
  ensureAudio()
  sfxPlace()
  triggerScreenShake('soft')
  saveState()
}

// requestBake：若含稀有原料(tier>=3)先弹确认框，确认后由 UI 进入烹调倒计时。
export function requestBake(state, onConfirmed) {
  const filled = state.craftSlots.slice(0, state.slots).filter(Boolean)
  if (!filled.length) return false
  const payload = {
    filled,
    names: filled.map(k => ING_MAP[k].name),
    durationMs: cookingTimeForIngredients(filled),
  }
  const begin = () => {
    ensureAudio()
    sfxCookStart()
    haptic(18)
    triggerScreenShake('soft')
    if (onConfirmed) onConfirmed(payload)
  }
  const rares = filled.filter(k => ING_MAP[k].tier >= 3)
  if (rares.length) {
    const names = rares.map(k => ING_MAP[k].name).join('、')
    showConfirm('消耗稀有原料', '本次烘焙将消耗稀有原料：' + names + '。确定继续吗？', '开始烘焙', begin)
  } else {
    begin()
  }
  return true
}

// doBake 保留给旧调用路径：确认后立即出炉。
export function doBake(state, onResult) {
  return requestBake(state, () => actuallyBake(state, onResult))
}

export function actuallyBake(state, onResult) {
  const filled = state.craftSlots.slice(0, state.slots).filter(Boolean)
  if (!filled.length) return
  ensureAudio()
  state.stats.bakesTotal++
  const sig = filled.slice().sort().join('+')
  const recipe = RECIPE_SIG_MAP.get(sig)
  const names = filled.map(k => ING_MAP[k].name)

  // sig 由本次放入的 2~5 件原料排序拼接而成，生成表覆盖了全部这类组合，
  // 因此 recipe 理论上必然存在；万一出现异常输入（比如放入非法 key），
  // 也不再回退到"创意披萨"，直接跳过本次烘焙以避免展示错误数据。
  if (!recipe) return

  const rarityIdx = recipe.rarity
  const isNew = !state.dex[recipe.id]
  const stars = RARITIES[rarityIdx].stars
  const reward = Math.round(CRAFT_REWARD[rarityIdx] * (isNew ? FIRST_DISCOVERY_MULT : 1) * craftRewardResearchMult(state))
  let skillPointGain = { gained: 0, total: state.totalSkillPointsEarned || 0, isFirstSkillPoint: false }
  if (isNew) {
    state.dex[recipe.id] = { ts: Date.now(), rarity: rarityIdx }
    state.collectionBonus += COLLECTION_BONUS[rarityIdx]
    skillPointGain = awardSkillPointsForRecipe(state, recipe, stars)
  }
  const title = recipe.name + (isNew ? '（新配方发现！）' : '')

  state.bytes += reward
  state.stats.totalEarned += Math.max(0, reward)

  sfxCookDone()
  sfxTier(rarityIdx)
  if (rarityIdx >= 3 || isNew) triggerScreenShake(rarityIdx === 4 ? 'strong' : 'medium')
  if (rarityIdx === 4) haptic([30, 40, 60]); else if (isNew) haptic(25)

  for (let i = 0; i < state.slots; i++) state.craftSlots[i] = null

  saveState()
  checkUnlocks(state)
  checkAchievements(state)

  if (onResult) {
    onResult({
      recipe, filled, names, rarityIdx, isNew, reward, title,
      skillPointGain: skillPointGain.gained,
      totalSkillPointsEarned: skillPointGain.total,
      rarityColor: RARITIES[rarityIdx].color,
      rarityLabel: RARITIES[rarityIdx].label,
      stars,
    })
  }
}

