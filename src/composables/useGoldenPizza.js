// 金色披萨限时事件：25-50s 随机间隔生成，工厂可见时直接在舞台上出现，
// 否则弹出可点击 toast 跳转到工厂并生成。4.2s 内未点击则自动消失。
import { reactive } from 'vue'
import { clickPower, goldenRewardResearchMult } from './useEconomy.js'
import { fmt } from './useEconomy.js'
import { pullOne } from './useGacha.js'
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'
import { ensureAudio, sfxGolden, haptic } from './useAudio.js'
import { checkAchievements } from './useAchievements.js'
import { checkUnlocks } from './useUnlocks.js'

export const goldenPizzaState = reactive({
  visible: false,
  x: 0,
  y: 0,
  caught: false,
})

let despawnTimer = null
let scheduleTimer = null

function randomPositionWithin(width, height) {
  const maxX = Math.max(10, width - 70)
  const maxY = Math.max(10, height - 70)
  return { x: Math.max(6, Math.random() * maxX), y: Math.max(6, Math.random() * maxY) }
}

export function spawnGoldenOnStage(stageSize) {
  const { x, y } = randomPositionWithin(stageSize.width, stageSize.height)
  goldenPizzaState.visible = true
  goldenPizzaState.caught = false
  goldenPizzaState.x = x
  goldenPizzaState.y = y
  clearTimeout(despawnTimer)
  despawnTimer = setTimeout(() => {
    if (!goldenPizzaState.caught) goldenPizzaState.visible = false
  }, 4200)
}

export function catchGoldenPizza(state) {
  if (goldenPizzaState.caught || !goldenPizzaState.visible) return
  goldenPizzaState.caught = true
  ensureAudio()
  const bonus = Math.round(Math.max(50, clickPower(state) * 15) * goldenRewardResearchMult(state))
  state.bytes += bonus
  state.stats.totalEarned += Math.max(0, bonus)
  state.stats.goldenCaught++
  const pull = pullOne(state)
  sfxGolden()
  haptic(30)
  showToast('抓到了金色披萨！', '获得 ' + fmt(bonus) + ' 字节，以及一份「' + pull.ing.name + '」原料。')
  goldenPizzaState.visible = false
  saveState()
  checkUnlocks(state)
  checkAchievements(state)
}

// isFactoryVisible: () => boolean —— 由调用方（App.vue）判断当前是否在工厂面板 / 桌面双栏布局
export function scheduleGoldenPizza(state, isFactoryVisible, getStageSize, switchToFactory) {
  scheduleTimer = setTimeout(function spawn() {
    if (isFactoryVisible()) {
      spawnGoldenOnStage(getStageSize())
    } else {
      showToast('⚡ 金色披萨出现！', '点这里去工厂抓住它 →', {
        actionable: true, life: 4000,
        onClick: () => { switchToFactory(); spawnGoldenOnStage(getStageSize()) },
      })
    }
    scheduleTimer = setTimeout(spawn, 25000 + Math.random() * 25000)
  }, 25000 + Math.random() * 25000)
  return () => { clearTimeout(scheduleTimer); clearTimeout(despawnTimer) }
}
