// 随机事件调度：每 40s 检定一次，12% 概率触发（与原版一致）。
import { RANDOM_EVENTS } from '../data/randomEvents.js'
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'

const CHECK_INTERVAL_MS = 40000
const TRIGGER_CHANCE = 0.12

export function startRandomEventLoop(state) {
  const timer = setInterval(() => {
    if (Math.random() < TRIGGER_CHANCE) {
      const ev = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
      ev.apply(state)
      showToast('随机事件', ev.text)
      saveState()
    }
  }, CHECK_INTERVAL_MS)
  return () => clearInterval(timer)
}
