// 全局 200ms tick：驱动挂机产出结算 + 依赖 Date.now() 的 UI（倒计时、按钮可购性等）刷新。
import { reactive } from 'vue'
import { bytesPerSecond } from './useEconomy.js'
import { saveState } from './useGameState.js'

// tickClock.now 每 200ms 更新一次，供组件里对时间敏感的 computed 依赖，
// 从而不需要各组件各自起 setInterval。
export const tickClock = reactive({ now: Date.now() })

let lastTick = Date.now()
let tickTimer = null
let saveTimer = null

export function startGameLoop(state) {
  lastTick = Date.now()
  tickTimer = setInterval(() => {
    const now = Date.now()
    const dt = (now - lastTick) / 1000
    lastTick = now
    const bps = bytesPerSecond(state)
    if (bps > 0) {
      state.bytes += bps * dt
      state.stats.totalEarned += Math.max(0, bps * dt)
    }
    tickClock.now = now
  }, 200)
  saveTimer = setInterval(saveState, 8000)

  const onBeforeUnload = () => saveState()
  const onVisibility = () => { if (document.hidden) saveState() }
  window.addEventListener('beforeunload', onBeforeUnload)
  document.addEventListener('visibilitychange', onVisibility)

  return () => {
    clearInterval(tickTimer)
    clearInterval(saveTimer)
    window.removeEventListener('beforeunload', onBeforeUnload)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
