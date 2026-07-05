<script setup>
// 工厂面板：点击舞台（含碎片粒子/浮字/震屏）、点击强化、挂机产线、标准技能研究。
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { state } from '../composables/useGameState.js'
import { saveState } from '../composables/useGameState.js'
import {
  clickPower, clickUpgradeCost, critChance, critMultiplier, critChanceCost, critMultCost,
  genCost, fmt, fmtRate, bytesPerSecond,
  RESEARCH_DEFS, canBuyResearch,
  availableSkillPoints, totalSpentSkillPoints, prestigeMult,
} from '../composables/useEconomy.js'
import { CRIT_CHANCE_CAP } from '../data/constants.js'
import { GEN_DEFS } from '../data/genDefs.js'
import { RECIPES } from '../data/recipes.js'
import { ING_MAP } from '../data/ingredients.js'
import { drawPizza } from '../composables/utils/pixelArt.js'
import { ensureAudio, sfxClick, sfxCrit, sfxBuy, haptic } from '../composables/useAudio.js'
import { triggerScreenShake } from '../composables/useFeedback.js'
import { checkUnlocks } from '../composables/useUnlocks.js'
import { checkAchievements } from '../composables/useAchievements.js'
import { goldenPizzaState, catchGoldenPizza } from '../composables/useGoldenPizza.js'
import { prestigePreview } from '../composables/usePrestige.js'
import PizzaCanvas from './PizzaCanvas.vue'

const emit = defineEmits(['switch-tab'])

const stageEl = ref(null)
const clickCanvas = ref(null)
const floatersEl = ref(null)
const debrisLayerEl = ref(null)
const goldenCanvas = ref(null)

const stageShakeClass = ref('')
const stageFxClass = ref('')
const punchClass = ref(false)
const impactBursts = reactive([])
const buyFeedback = reactive({})
const BUY_FEEDBACK_MS = 360

let currentClickIngKeys = ['pepperoni', 'mushroom']
let impactSeq = 0

function replayBuyButton(key) {
  buyFeedback[key] = false
  requestAnimationFrame(() => {
    buyFeedback[key] = true
    setTimeout(() => { buyFeedback[key] = false }, BUY_FEEDBACK_MS)
  })
}

function playBuyFeedback(key, level = 'medium') {
  ensureAudio()
  replayBuyButton(key)
  triggerScreenShake(level)
  haptic(level === 'strong' ? [12, 28, 22] : [10, 18, 12])
  sfxBuy()
}

function rerollClickStagePizza() {
  const idx = Math.floor(state.stats.totalClicks / 30) % RECIPES.length
  currentClickIngKeys = RECIPES[idx].ing
  if (clickCanvas.value) drawPizza(clickCanvas.value.getContext('2d'), currentClickIngKeys, clickCanvas.value.width)
}

function pizzaDebrisPalette() {
  const colors = ['#e0a94f', '#b8813a', '#8a1f2b', '#f5d76e']
  currentClickIngKeys.forEach(k => {
    const ing = ING_MAP[k]
    if (ing && ing.pal) colors.push(...Object.values(ing.pal))
  })
  return colors
}

function clickPointFromEvent(e) {
  const rect = stageEl.value.getBoundingClientRect()
  if (e && typeof e.clientX === 'number' && (e.clientX || e.clientY)) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  const cRect = clickCanvas.value.getBoundingClientRect()
  return { x: cRect.left - rect.left + cRect.width / 2, y: cRect.top - rect.top + cRect.height / 2 }
}

function spawnImpactBurst(pt, isCrit) {
  const id = ++impactSeq
  impactBursts.push({ id, x: pt.x, y: pt.y, isCrit })
  setTimeout(() => {
    const idx = impactBursts.findIndex(b => b.id === id)
    if (idx !== -1) impactBursts.splice(idx, 1)
  }, isCrit ? 620 : 480)
}

function spawnClickImpact(pt, isCrit) {
  const layer = debrisLayerEl.value
  const palette = pizzaDebrisPalette()
  spawnImpactBurst(pt, isCrit)
  if (layer) {
    const n = isCrit ? (14 + Math.floor(Math.random() * 7)) : (7 + Math.floor(Math.random() * 5))
    for (let i = 0; i < n; i++) {
      const chip = document.createElement('div')
      chip.className = 'debris-chip'
      const size = (isCrit ? 5 : 4) + Math.random() * (isCrit ? 7 : 5)
      chip.style.width = size.toFixed(1) + 'px'
      chip.style.height = size.toFixed(1) + 'px'
      chip.style.left = (pt.x - size / 2).toFixed(1) + 'px'
      chip.style.top = (pt.y - size / 2).toFixed(1) + 'px'
      chip.style.background = palette[Math.floor(Math.random() * palette.length)]
      const angle = Math.random() * Math.PI * 2
      const dist = (isCrit ? 44 : 26) + Math.random() * (isCrit ? 42 : 24)
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist * 0.62 - (isCrit ? 10 : 6)
      const dur = (isCrit ? 560 : 440) + Math.random() * 240
      chip.style.setProperty('--dx', dx.toFixed(1) + 'px')
      chip.style.setProperty('--dy', dy.toFixed(1) + 'px')
      chip.style.setProperty('--fx', (dx * 1.22).toFixed(1) + 'px')
      chip.style.setProperty('--fy', (dy + 30 + Math.random() * 18).toFixed(1) + 'px')
      chip.style.setProperty('--rot', Math.floor(Math.random() * 360 - 180) + 'deg')
      chip.style.setProperty('--rot2', Math.floor(Math.random() * 620 - 310) + 'deg')
      chip.style.animationDuration = dur.toFixed(0) + 'ms'
      layer.appendChild(chip)
      setTimeout(() => chip.remove(), dur + 80)
    }
  }
  punchClass.value = false
  requestAnimationFrame(() => { punchClass.value = true })
  stageShakeClass.value = ''
  stageFxClass.value = ''
  requestAnimationFrame(() => {
    stageShakeClass.value = isCrit ? 'click-shake-big' : 'click-shake'
    stageFxClass.value = isCrit ? 'stage-impact-crit' : 'stage-impact-hit'
  })
}

const floaters = reactive([])
let floaterSeq = 0
function spawnFloater(text, isCrit, pt) {
  const id = ++floaterSeq
  floaters.push({
    id, text, isCrit,
    left: pt ? (pt.x + (Math.random() * 18 - 9)).toFixed(1) + 'px' : (35 + Math.random() * 40) + '%',
    top: pt ? (pt.y + (Math.random() * 12 - 8)).toFixed(1) + 'px' : (25 + Math.random() * 30) + '%',
  })
  setTimeout(() => {
    const idx = floaters.findIndex(f => f.id === id)
    if (idx !== -1) floaters.splice(idx, 1)
  }, 950)
}

function doClick(e) {
  ensureAudio()
  const base = clickPower(state)
  const isCrit = Math.random() < critChance(state)
  const power = isCrit ? Math.round(base * critMultiplier(state)) : base
  state.bytes += power
  state.stats.totalEarned += Math.max(0, power)
  state.stats.totalClicks++
  if (isCrit) state.stats.critHits = (state.stats.critHits || 0) + 1
  const pt = clickPointFromEvent(e)
  spawnClickImpact(pt, isCrit)
  triggerScreenShake(isCrit ? 'soft' : 'stage')
  if (isCrit) { sfxCrit(); haptic([8, 18, 10]) } else { sfxClick(); haptic(4) }
  spawnFloater(isCrit ? ('💥 +' + fmt(power)) : ('+' + fmt(power)), isCrit, pt)
  if (state.stats.totalClicks % 30 === 0) rerollClickStagePizza()
  checkUnlocks(state)
  checkAchievements(state)
}

function onStageClick(e) {
  if (e.target.closest && e.target.closest('.golden-pizza-btn')) return
  doClick(e)
}
function preventStageTextSelection(e) {
  e.preventDefault()
}
function onCanvasKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doClick() }
}
function onStageAnimationEnd(e) {
  if (e.target !== stageEl.value) return
  stageShakeClass.value = ''
  stageFxClass.value = ''
}

function onCatchGolden(e) {
  e.stopPropagation()
  catchGoldenPizza(state)
}
watch(() => goldenPizzaState.visible, (v) => {
  if (v) {
    requestAnimationFrame(() => {
      if (goldenCanvas.value) drawPizza(goldenCanvas.value.getContext('2d'), ['goldflake', 'quantumcheese'], 48)
    })
  }
})

/* ---- Click upgrades ---- */
const clickCost = computed(() => clickUpgradeCost(state))
const ccCost = computed(() => critChanceCost(state))
const ccMaxed = computed(() => critChance(state) >= CRIT_CHANCE_CAP)
const cmCost = computed(() => critMultCost(state))
const bps = computed(() => bytesPerSecond(state))
const researchDefs = RESEARCH_DEFS
const skillPoints = computed(() => availableSkillPoints(state))
const spentSkillPoints = computed(() => totalSpentSkillPoints(state))
const prestige = computed(() => prestigePreview(state))
const readyResearch = computed(() => researchDefs.filter(def => canBuyResearch(state, def)))
const ownedGeneratorCount = computed(() => GEN_DEFS.reduce((sum, def) => sum + (state.gens[def.key] || 0), 0))
const nextGenerator = computed(() => GEN_DEFS.find((def, idx) => state.bytes < genCost(state, idx)) || GEN_DEFS[GEN_DEFS.length - 1])
const nextGeneratorCost = computed(() => {
  const idx = GEN_DEFS.findIndex(def => def.key === nextGenerator.value.key)
  return idx >= 0 ? genCost(state, idx) : 0
})
const factoryLoadPct = computed(() => Math.min(100, Math.round((ownedGeneratorCount.value / 18) * 100)))
const clickHeatPct = computed(() => Math.min(100, Math.round((state.stats.totalClicks % 30) / 30 * 100)))
const nextRerollClicks = computed(() => 30 - (state.stats.totalClicks % 30 || 30))
const stageMode = computed(() => {
  if (goldenPizzaState.visible) return '金色披萨信号'
  if (clickHeatPct.value >= 80) return '核心过热'
  if (bps.value > 0) return '自动烘焙同步'
  return '手动点火'
})

function buyClickUpgrade() {
  const cost = clickUpgradeCost(state)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.clickLevel++
  playBuyFeedback('click-upgrade', 'medium')
  saveState()
}
function buyCritChance() {
  if (critChance(state) >= CRIT_CHANCE_CAP) return
  const cost = critChanceCost(state)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.critChanceLv++
  playBuyFeedback('crit-chance', 'medium')
  saveState()
}
function buyCritMult() {
  const cost = critMultCost(state)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.critMultLv++
  playBuyFeedback('crit-mult', 'strong')
  saveState()
}
function buyGenerator(idx) {
  const def = GEN_DEFS[idx]
  const cost = genCost(state, idx)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.gens[def.key]++
  playBuyFeedback('generator-' + def.key, idx >= 2 ? 'medium' : 'soft')
  checkAchievements(state)
  saveState()
}

onMounted(() => { rerollClickStagePizza() })

defineExpose({ getStageSize: () => ({ width: stageEl.value?.clientWidth || 0, height: stageEl.value?.clientHeight || 0 }) })
</script>

<template>
  <section class="panel" data-panel="factory">
    <div class="factory-left-stack">
      <div
        class="card stage factory-stage-card"
        ref="stageEl"
        :class="[stageShakeClass, stageFxClass]"
        @animationend="onStageAnimationEnd"
        @dblclick="preventStageTextSelection"
        @click="onStageClick"
      >
        <span class="scanline-tag">LIVE FEED // ID:PIZZA-CORE</span>
        <canvas
          ref="clickCanvas"
          id="clickCanvas"
          width="160" height="160"
          aria-label="点击生成虚拟披萨字节" role="button" tabindex="0"
          :class="{ 'pizza-punch': punchClass }"
          @animationend="punchClass = false"
          @keydown="onCanvasKeydown"
        ></canvas>
        <div class="hint">点击任意位置，用意念烘焙数据字节</div>
        <div class="impact-layer">
          <span
            v-for="burst in impactBursts"
            :key="burst.id"
            class="impact-burst"
            :class="{ crit: burst.isCrit }"
            :style="{ left: burst.x + 'px', top: burst.y + 'px' }"
          ></span>
        </div>
        <div class="floaters" ref="floatersEl">
          <div
            v-for="f in floaters" :key="f.id"
            class="floater" :class="{ crit: f.isCrit }"
            :style="{ left: f.left, top: f.top }"
          >{{ f.text }}</div>
        </div>
        <div class="debris-layer" ref="debrisLayerEl"></div>
        <button
          v-if="goldenPizzaState.visible"
          class="golden-pizza-btn"
          aria-label="限时金色披萨，点击获取奖励"
          :style="{ left: goldenPizzaState.x + 'px', top: goldenPizzaState.y + 'px' }"
          @click="onCatchGolden"
        >
          <canvas ref="goldenCanvas" width="48" height="48"></canvas>
        </button>
      </div>

      <div class="card factory-click-data-card">
        <h2><span class="dot"></span>点击数据</h2>
        <div class="stage-hud">
          <div class="stage-hud-stat">
            <span>点击收益</span>
            <b>+{{ fmt(clickPower(state)) }}</b>
          </div>
          <div class="stage-hud-stat">
            <span>暴击率</span>
            <b>{{ Math.round(critChance(state) * 100) }}%</b>
          </div>
          <div class="stage-hud-stat">
            <span>核心状态</span>
            <b>{{ stageMode }}</b>
          </div>
        </div>
        <div class="stage-heat">
          <div class="stage-heat-head">
            <span>点击热度</span>
            <b>{{ clickHeatPct }}%</b>
          </div>
          <div class="stage-heat-track"><div :style="{ width: clickHeatPct + '%' }"></div></div>
          <div class="stage-heat-note">再点击 {{ nextRerollClicks }} 次刷新披萨外观</div>
        </div>
      </div>

      <div class="card factory-generator-card">
        <h2><span class="dot"></span>虚拟产线（挂机）</h2>
        <div class="gen-scroll-list">
          <div class="gen-row" v-for="(def, idx) in GEN_DEFS" :key="def.key">
            <div class="gen-icon">{{ def.icon }}</div>
            <div class="gen-info">
              <div class="name">{{ def.name }} <span style="color:var(--muted)">×{{ state.gens[def.key] }}</span></div>
              <div class="sub">单台 {{ fmtRate(def.baseProd) }} 字节/秒</div>
            </div>
            <button
              class="gen-buy"
              :class="{ 'btn-shake buy-success-pop': buyFeedback['generator-' + def.key] }"
              :disabled="state.bytes < genCost(state, idx)"
              @click="buyGenerator(idx)"
              @animationend="buyFeedback['generator-' + def.key] = false"
            >
              <span>购买</span>
              <span class="cost">{{ fmt(genCost(state, idx)) }}</span>
              <span class="own">拥有 {{ state.gens[def.key] }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="factory-right-stack">
      <div class="card factory-upgrade-card">
        <h2><span class="dot"></span>点击强化</h2>
        <div class="gen-row">
          <div class="gen-icon">👆</div>
          <div class="gen-info">
            <div class="name">意念强度 Lv.{{ state.clickLevel }}</div>
            <div class="sub">每次点击 +{{ clickPower(state) }} 字节</div>
          </div>
          <button
            class="gen-buy"
            :class="{ 'btn-shake buy-success-pop': buyFeedback['click-upgrade'] }"
            :disabled="state.bytes < clickCost"
            @click="buyClickUpgrade"
            @animationend="buyFeedback['click-upgrade'] = false"
          >
            <span>升级</span>
            <span class="cost">{{ fmt(clickCost) }}</span>
          </button>
        </div>
        <div class="gen-row">
          <div class="gen-icon">🎯</div>
          <div class="gen-info">
            <div class="name">暴击几率 {{ Math.round(critChance(state) * 100) }}%</div>
            <div class="sub">点击有几率触发暴击，产生更大的震动和碎片</div>
          </div>
          <button
            class="gen-buy"
            :class="{ 'btn-shake buy-success-pop': buyFeedback['crit-chance'] }"
            :disabled="ccMaxed || state.bytes < ccCost"
            @click="buyCritChance"
            @animationend="buyFeedback['crit-chance'] = false"
          >
            <span>升级</span>
            <span class="cost">{{ ccMaxed ? '已满级' : fmt(ccCost) }}</span>
          </button>
        </div>
        <div class="gen-row">
          <div class="gen-icon">💥</div>
          <div class="gen-info">
            <div class="name">暴击倍率 x{{ critMultiplier(state).toFixed(1) }}</div>
            <div class="sub">暴击时的字节倍率</div>
          </div>
          <button
            class="gen-buy"
            :class="{ 'btn-shake buy-success-pop': buyFeedback['crit-mult'] }"
            :disabled="state.bytes < cmCost"
            @click="buyCritMult"
            @animationend="buyFeedback['crit-mult'] = false"
          >
            <span>升级</span>
            <span class="cost">{{ fmt(cmCost) }}</span>
          </button>
        </div>
      </div>

      <div class="card factory-monitor-card">
        <h2><span class="dot"></span>运行监控</h2>
        <div class="factory-metric-grid">
          <div class="factory-metric"><span>实时产出</span><b>{{ fmtRate(bps) }}/秒</b></div>
          <div class="factory-metric"><span>点击功率</span><b>{{ fmt(clickPower(state)) }}</b></div>
          <div class="factory-metric"><span>产线节点</span><b>{{ ownedGeneratorCount }}</b></div>
          <div class="factory-metric"><span>转生加成</span><b>x{{ prestigeMult(state).toFixed(2) }}</b></div>
        </div>
        <div class="factory-load">
          <div class="factory-load-head"><span>披萨核心负载</span><b>{{ factoryLoadPct }}%</b></div>
          <div class="factory-load-track"><div :style="{ width: factoryLoadPct + '%' }"></div></div>
        </div>
        <div class="factory-next-line">
          <span>下一产线</span>
          <b>{{ nextGenerator.name }}</b>
          <em>{{ fmt(nextGeneratorCost) }} 字节</em>
        </div>
        <div class="factory-log">
          <span>SYS</span> 烤箱阵列稳定；像素披萨核心等待下一次点击脉冲。
        </div>
      </div>

      <div class="card factory-research-card">
        <h2><span class="dot"></span>技能控制台 <span class="sidenote">可用 {{ skillPoints }} 点 / 已投入 {{ spentSkillPoints }} 点</span></h2>
        <div class="skill-tree-meta">
          <div><span>转生等级</span><b>{{ prestige.current }}</b></div>
          <div><span>下一次重启</span><b>{{ prestige.discoveries }}/{{ prestige.requiredDiscoveries }} 配方</b></div>
          <div><span>永久图鉴点</span><b>{{ prestige.points }}/{{ prestige.requiredPoints }}</b></div>
        </div>
        <div class="factory-skill-console">
          <div class="factory-skill-radar">
            <span v-for="n in 12" :key="n"></span>
          </div>
          <div class="factory-skill-copy">
            <b>{{ readyResearch.length ? readyResearch.length + ' 个技能可升级' : '等待新技能点' }}</b>
            <p v-if="readyResearch.length">{{ readyResearch.slice(0, 3).map(def => def.name).join(' / ') }}</p>
            <p v-else>首次烘焙新披萨会按星级发放技能点，重复配方不会重复加点。</p>
          </div>
          <button class="btn secondary small" type="button" @click="emit('switch-tab', 'skills')">
            打开技能树
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
