<script setup>
// 工厂面板：点击舞台（含碎片粒子/浮字/震屏）、点击强化、挂机产线、标准技能研究。
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { state } from '../composables/useGameState.js'
import { saveState } from '../composables/useGameState.js'
import {
  clickPower, clickUpgradeCost, critChance, critMultiplier, critChanceCost, critMultCost,
  genCost, fmt, fmtRate, bytesPerSecond,
  RESEARCH_DEFS, researchCost, researchLevel,
} from '../composables/useEconomy.js'
import { CRIT_CHANCE_CAP } from '../data/constants.js'
import { GEN_DEFS } from '../data/genDefs.js'
import { RECIPES } from '../data/recipes.js'
import { ING_MAP } from '../data/ingredients.js'
import { drawPizza } from '../composables/utils/pixelArt.js'
import { ensureAudio, sfxClick, sfxCrit, sfxBuy, haptic } from '../composables/useAudio.js'
import { checkUnlocks } from '../composables/useUnlocks.js'
import { checkAchievements } from '../composables/useAchievements.js'
import { tickClock } from '../composables/useTick.js'
import { goldenPizzaState, catchGoldenPizza } from '../composables/useGoldenPizza.js'
import PizzaCanvas from './PizzaCanvas.vue'

const stageEl = ref(null)
const clickCanvas = ref(null)
const floatersEl = ref(null)
const debrisLayerEl = ref(null)
const goldenCanvas = ref(null)

const stageShakeClass = ref('')
const punchClass = ref(false)

let currentClickIngKeys = ['pepperoni', 'mushroom']

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

function spawnClickImpact(pt, isCrit) {
  const layer = debrisLayerEl.value
  const palette = pizzaDebrisPalette()
  const n = isCrit ? (10 + Math.floor(Math.random() * 5)) : (4 + Math.floor(Math.random() * 3))
  for (let i = 0; i < n; i++) {
    const chip = document.createElement('div')
    chip.className = 'debris-chip'
    const size = 4 + Math.random() * 5
    chip.style.width = size.toFixed(1) + 'px'
    chip.style.height = size.toFixed(1) + 'px'
    chip.style.left = (pt.x - size / 2).toFixed(1) + 'px'
    chip.style.top = (pt.y - size / 2).toFixed(1) + 'px'
    chip.style.background = palette[Math.floor(Math.random() * palette.length)]
    const angle = Math.random() * Math.PI * 2
    const dist = (isCrit ? 34 : 20) + Math.random() * (isCrit ? 30 : 18)
    const dx = Math.cos(angle) * dist
    const dy = Math.sin(angle) * dist * 0.6 - 6
    const dur = 480 + Math.random() * 220
    chip.style.setProperty('--dx', dx.toFixed(1) + 'px')
    chip.style.setProperty('--dy', dy.toFixed(1) + 'px')
    chip.style.setProperty('--fx', (dx * 1.15).toFixed(1) + 'px')
    chip.style.setProperty('--fy', (dy + 26 + Math.random() * 14).toFixed(1) + 'px')
    chip.style.setProperty('--rot', Math.floor(Math.random() * 360 - 180) + 'deg')
    chip.style.setProperty('--rot2', Math.floor(Math.random() * 540 - 270) + 'deg')
    chip.style.animationDuration = dur.toFixed(0) + 'ms'
    layer.appendChild(chip)
    setTimeout(() => chip.remove(), dur + 80)
  }
  punchClass.value = false
  requestAnimationFrame(() => { punchClass.value = true })
  stageShakeClass.value = ''
  requestAnimationFrame(() => { stageShakeClass.value = isCrit ? 'click-shake-big' : 'click-shake' })
}

const floaters = reactive([])
let floaterSeq = 0
function spawnFloater(text, isCrit) {
  const id = ++floaterSeq
  floaters.push({
    id, text, isCrit,
    left: (35 + Math.random() * 40) + '%',
    top: (25 + Math.random() * 30) + '%',
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
  if (isCrit) { sfxCrit(); haptic([10, 30, 18]) } else { sfxClick(); haptic(6) }
  spawnFloater(isCrit ? ('💥 +' + fmt(power)) : ('+' + fmt(power)), isCrit)
  if (state.stats.totalClicks % 30 === 0) rerollClickStagePizza()
  checkUnlocks(state)
  checkAchievements(state)
}

function onStageClick(e) {
  if (e.target.closest && e.target.closest('.golden-pizza-btn')) return
  doClick(e)
}
function onCanvasKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doClick() }
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
  sfxBuy()
  saveState()
}
function buyCritChance() {
  if (critChance(state) >= CRIT_CHANCE_CAP) return
  const cost = critChanceCost(state)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.critChanceLv++
  sfxBuy()
  saveState()
}
function buyCritMult() {
  const cost = critMultCost(state)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.critMultLv++
  sfxBuy()
  saveState()
}
function buyResearch(def) {
  const lv = researchLevel(state, def.key)
  if (lv >= def.max) return
  const cost = researchCost(state, def)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.research ||= {}
  state.research[def.key] = lv + 1
  sfxBuy()
  checkAchievements(state)
  saveState()
}
function buyGenerator(idx) {
  const def = GEN_DEFS[idx]
  const cost = genCost(state, idx)
  if (state.bytes < cost) return
  state.bytes -= cost
  state.gens[def.key]++
  sfxBuy()
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
        :class="stageShakeClass"
        @animationend="stageShakeClass = ''"
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
            <button class="gen-buy" :disabled="state.bytes < genCost(state, idx)" @click="buyGenerator(idx)">
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
          <button class="gen-buy" :disabled="state.bytes < clickCost" @click="buyClickUpgrade">
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
          <button class="gen-buy" :disabled="ccMaxed || state.bytes < ccCost" @click="buyCritChance">
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
          <button class="gen-buy" :disabled="state.bytes < cmCost" @click="buyCritMult">
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
          <div class="factory-metric"><span>暴击倍率</span><b>x{{ critMultiplier(state).toFixed(1) }}</b></div>
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
        <h2><span class="dot"></span>技能研究</h2>
        <div class="research-grid">
          <div class="research-node" v-for="def in researchDefs" :key="def.key">
            <div class="research-icon">{{ def.icon }}</div>
            <div class="research-info">
              <div class="research-branch">{{ def.branch }}</div>
              <div class="name">{{ def.name }} Lv.{{ researchLevel(state, def.key) }}/{{ def.max }}</div>
              <div class="sub">{{ def.desc }}</div>
              <div class="research-effect">{{ def.effect(researchLevel(state, def.key)) }}</div>
            </div>
            <button
              class="gen-buy research-buy"
              :disabled="researchLevel(state, def.key) >= def.max || state.bytes < researchCost(state, def)"
              @click="buyResearch(def)"
            >
              <span>{{ researchLevel(state, def.key) >= def.max ? '满级' : '研究' }}</span>
              <span class="cost">{{ researchLevel(state, def.key) >= def.max ? 'MAX' : fmt(researchCost(state, def)) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
