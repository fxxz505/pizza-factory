// 成就检定：遍历 ACHIEVEMENTS，新达成的写入 state.achDone 并（非静默时）提示。
import { ACHIEVEMENTS } from '../data/achievements.js'
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'
import { sfxAchievement, haptic } from './useAudio.js'

export function checkAchievements(state, opts) {
  const silent = opts && opts.silent
  const newly = []
  ACHIEVEMENTS.forEach(a => {
    if (!state.achDone[a.id] && a.check(state)) {
      state.achDone[a.id] = true
      newly.push(a)
      if (!silent) {
        sfxAchievement()
        haptic(20)
        showToast('成就解锁：' + a.name, typeof a.desc === 'function' ? a.desc() : a.desc)
      }
    }
  })
  if (newly.length) saveState()
  return newly
}
