import { nextTick, ref } from 'vue'
import { saveState } from './useGameState.js'
import { canBuyResearch, researchCost, researchLevel, researchUnlocked } from './useEconomy.js'
import { showToast } from './useToast.js'
import { ensureAudio, haptic, sfxError, sfxSkillUpgrade } from './useAudio.js'
import { triggerScreenShake } from './useFeedback.js'
import { checkAchievements } from './useAchievements.js'

export function useResearchActions(state) {
  const pulseKey = ref('')
  const burstKey = ref('')

  function replayPulse(key) {
    pulseKey.value = ''
    burstKey.value = ''
    nextTick(() => {
      pulseKey.value = key
      burstKey.value = key
    })
  }

  function clearPulse(key) {
    if (pulseKey.value === key) pulseKey.value = ''
  }

  function buyResearch(def) {
    const lv = researchLevel(state, def.key)
    if (lv >= def.max) return false
    const cost = researchCost(state, def)
    if (!researchUnlocked(state, def)) {
      ensureAudio()
      sfxError()
      haptic([12, 30, 12])
      triggerScreenShake('soft')
      showToast('技能未解锁', '先点亮前置技能，再研究这个节点。')
      return false
    }
    if (!canBuyResearch(state, def)) {
      ensureAudio()
      sfxError()
      haptic(16)
      triggerScreenShake('soft')
      showToast('技能点不足', '首次烘焙新披萨会按星级获得技能点，重复配方不增加。')
      return false
    }
    state.skillPoints -= cost
    state.research ||= {}
    state.research[def.key] = lv + 1
    replayPulse(def.key)
    ensureAudio()
    sfxSkillUpgrade(Math.min(5, lv + 1))
    haptic([16, 22, 36, 18])
    triggerScreenShake(lv + 1 >= def.max ? 'medium' : 'soft')
    showToast('技能升级', `${def.name} 提升至 Lv.${lv + 1}`, { life: 3600 })
    checkAchievements(state)
    saveState()
    return true
  }

  return {
    pulseKey,
    burstKey,
    buyResearch,
    clearPulse,
  }
}
