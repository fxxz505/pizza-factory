// 面板解锁判定：抽卡(点击>=5) / 厨房(拥有原料) / 图鉴(完成过烘焙)。
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'

export function checkUnlocks(state) {
  let changed = false
  if (!state.unlocked.gacha && state.stats.totalClicks >= 5) {
    state.unlocked.gacha = true; changed = true
    showToast('新功能解锁：抽卡', '消耗字节抽取披萨原料，去厨房合成配方吧。')
  }
  if (!state.unlocked.kitchen && Object.values(state.inventory).some(c => c > 0)) {
    state.unlocked.kitchen = true; changed = true
    showToast('新功能解锁：厨房', '把抽到的原料放进合成格，烘焙出你的第一块披萨。')
  }
  if (!state.unlocked.dex && state.stats.bakesTotal >= 1) {
    state.unlocked.dex = true; changed = true
    showToast('新功能解锁：图鉴', '所有发现过的配方都会被记录在这里。')
  }
  if (changed) saveState()
  return changed
}
