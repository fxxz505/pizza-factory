// 离线进度结算：超过 30s 才结算，封顶 8 小时，产出打 0.7 折。
import { bytesPerSecond, fmt, offlineResearchMult } from './useEconomy.js'
import { saveState } from './useGameState.js'
import { checkAchievements } from './useAchievements.js'

const CAP_SEC = 8 * 3600
const OFFLINE_MULT = 0.7
const MIN_SEC = 30

// 返回 null 表示无需展示离线结算弹窗；否则返回展示用的数据。
export function applyOfflineProgress(state) {
  const now = Date.now()
  const last = state.lastSeen || now
  let elapsedSec = (now - last) / 1000
  if (elapsedSec < MIN_SEC) return null
  elapsedSec = Math.min(elapsedSec, CAP_SEC)
  const bps = bytesPerSecond(state)
  const earned = bps * elapsedSec * OFFLINE_MULT * offlineResearchMult(state)
  if (earned <= 0) return null

  state.bytes += earned
  state.stats.totalEarned += Math.max(0, earned)
  state.stats.offlineClaims++
  const newAch = checkAchievements(state, { silent: true })
  const mins = Math.floor(elapsedSec / 60)
  saveState()
  return {
    mins,
    earnedText: fmt(earned),
    achievements: newAch,
  }
}
