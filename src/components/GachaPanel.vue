<script setup>
// 抽卡面板：单抽/十连、保底提示、短揭晓节奏、抽取结果总结和最近记录。
import { ref, computed } from 'vue'
import { state } from '../composables/useGameState.js'
import { gachaSingleCostForState, gacha10Cost, fmt, gachaPityThreshold, gachaRareBoost } from '../composables/useEconomy.js'
import { RARITIES } from '../data/rarities.js'
import { INGREDIENT_WEIGHTS } from '../data/constants.js'
import { doSinglePull, doTenPull } from '../composables/useGacha.js'
import { sfxTier, haptic } from '../composables/useAudio.js'
import { triggerScreenShake } from '../composables/useFeedback.js'
import IngredientIcon from './IngredientIcon.vue'

const emit = defineEmits(['switch-tab'])

const gachaBtnShake = ref(false)
const gacha10BtnShake = ref(false)
const isRevealing = ref(false)
const revealMode = ref('single')
const revealSummary = ref(null)

const c1 = computed(() => gachaSingleCostForState(state))
const c10 = computed(() => gacha10Cost(state))
const shortfall = computed(() => state.bytes < c1.value ? ('还差 ' + fmt(c1.value - state.bytes) + ' 字节可单抽') : '')
const pityThreshold = computed(() => gachaPityThreshold(state))
const pityLeft = computed(() => Math.max(0, pityThreshold.value - state.stats.pullsSinceEpic))
const pityPct = computed(() => Math.min(100, state.stats.pullsSinceEpic / pityThreshold.value * 100))
const bestTierLabel = computed(() => state.stats.bestPullTier >= 0 ? RARITIES[state.stats.bestPullTier].label : '暂无')
const totalSpentText = computed(() => fmt(state.stats.gachaSpent || 0))
const weightText = computed(() => RARITIES.map((r, i) => {
  const weight = i >= 2 ? Math.round(INGREDIENT_WEIGHTS[i] * gachaRareBoost(state)) : INGREDIENT_WEIGHTS[i]
  return r.label + ' ' + weight + '%'
}).join(' · '))
const canGoKitchen = computed(() => state.unlocked.kitchen && Object.values(state.inventory).some(count => count > 0))

const revealVisible = ref(false)
const revealResults = ref([])
const revealFlash = ref(false)
const revealShake = ref(false)
const revealStageEl = ref(null)

function failShake(which) {
  const target = which === 'ten' ? gacha10BtnShake : gachaBtnShake
  target.value = false
  requestAnimationFrame(() => { target.value = true })
}

function playReveal(payload, mode) {
  if (!payload || isRevealing.value) return
  revealMode.value = mode
  revealVisible.value = true
  revealResults.value = []
  revealSummary.value = payload.summary
  isRevealing.value = true
  requestAnimationFrame(() => {
    revealStageEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })

  const results = payload.results
  const maxTier = payload.summary.maxTier
  const perCardDelay = mode === 'ten' ? 95 : 180
  results.forEach((result, index) => {
    window.setTimeout(() => {
      revealResults.value.push(result)
      if (result.tierIdx >= 2 || result.isNew) haptic(result.tierIdx >= 3 ? 22 : 10)
    }, 180 + index * perCardDelay)
  })

  window.setTimeout(() => {
    isRevealing.value = false
    sfxTier(maxTier)
    triggerScreenShake(maxTier === 4 ? 'strong' : (maxTier >= 3 || payload.summary.newCount > 0 ? 'medium' : 'soft'))
    if (maxTier >= 3 || payload.summary.newCount > 0) {
      revealFlash.value = false
      requestAnimationFrame(() => { revealFlash.value = true })
      revealShake.value = false
      requestAnimationFrame(() => { revealShake.value = true })
    }
    if (maxTier === 4) haptic([30, 40, 60]); else if (maxTier === 3) haptic(25)
  }, 220 + results.length * perCardDelay)
}

function onSingle() {
  if (isRevealing.value) return
  const payload = doSinglePull(state, () => failShake('single'))
  if (payload) playReveal(payload, 'single')
}
function onTen() {
  if (isRevealing.value) return
  const payload = doTenPull(state, () => failShake('ten'))
  if (payload) playReveal(payload, 'ten')
}
</script>

<template>
  <section class="panel" data-panel="gacha">
    <div v-if="!state.unlocked.gacha">
      <div class="lock-card">
        <div class="ico">🔒</div>
        <div class="t">原料抽取 · 未解锁</div>
        <div class="d">再点击几次披萨即可解锁这个功能</div>
      </div>
    </div>
    <div v-else class="gacha-layout">
      <div class="gacha-left-stack">
        <div class="card gacha-console-card">
          <h2><span class="dot"></span>随机原料抽取</h2>
          <div class="gacha-status-grid">
            <div class="gacha-stat"><span>抽取次数</span><b>{{ state.stats.ingredientPulls }}</b></div>
            <div class="gacha-stat"><span>累计消耗</span><b>{{ totalSpentText }}</b></div>
            <div class="gacha-stat"><span>最高记录</span><b>{{ bestTierLabel }}</b></div>
          </div>
          <p class="gacha-copy">消耗字节抽取披萨原料。新食材会被标记并保存，十连至少包含一份稀有级以上原料。</p>
          <div class="pity-wrap enhanced">
            <div class="pity-label"><span>史诗保底进度</span><span>{{ state.stats.pullsSinceEpic }} / {{ pityThreshold }}</span></div>
            <div class="pity-track"><div class="pity-fill" :style="{ width: pityPct + '%' }"></div></div>
            <div class="pity-hint">{{ pityLeft === 0 ? '下一抽将触发史诗保底' : '距离史诗保底还差 ' + pityLeft + ' 抽' }}</div>
          </div>
          <div class="gacha-rate-line">{{ weightText }}</div>
          <div class="row-2">
            <button
              class="btn" :class="{ unaffordable: state.bytes < c1, 'btn-shake': gachaBtnShake }"
              :disabled="isRevealing"
              @animationend="gachaBtnShake = false"
              @click="onSingle"
            >{{ isRevealing && revealMode === 'single' ? '扫描中…' : '单抽 · ' + fmt(c1) }}</button>
            <button
              class="btn secondary" :class="{ unaffordable: state.bytes < c10, 'btn-shake': gacha10BtnShake }"
              :disabled="isRevealing"
              @animationend="gacha10BtnShake = false"
              @click="onTen"
            >{{ isRevealing && revealMode === 'ten' ? '十连展开中…' : '十连 · ' + fmt(c10) }}</button>
          </div>
          <div class="shortfall">{{ shortfall }}</div>
        </div>

        <div class="card gacha-history-card" v-if="state.gachaHistory && state.gachaHistory.length">
          <h2><span class="dot"></span>最近抽取记录</h2>
          <div class="gacha-history-list">
            <div v-for="item in state.gachaHistory" :key="item.ts" class="gacha-history-row">
              <span :class="'rarity-' + RARITIES[item.maxTier].color">{{ item.mode === 'ten' ? '十连' : '单抽' }} · {{ RARITIES[item.maxTier].label }}</span>
              <span>{{ item.newCount }} 新 / {{ item.rareCount }} 稀有+</span>
              <span class="history-names">{{ item.names.join('、') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="gacha-right-stack">
        <div class="card gacha-result-card" v-if="revealVisible">
          <h2><span class="dot"></span>抽取结果 <span class="sidenote" v-if="revealSummary">{{ revealSummary.label }} · {{ revealSummary.newCount }} 个新食材</span></h2>
          <div class="reveal-stage gacha-reveal-stage" ref="revealStageEl">
            <div class="reveal-flash" :class="{ fire: revealFlash }" @animationend="revealFlash = false"></div>
            <div class="gacha-scanner" v-if="isRevealing"><span></span><b>INGREDIENT SCAN</b></div>
            <div :class="{ shake: revealShake }" @animationend="revealShake = false" class="gacha-result-shell">
              <div class="pull-grid" :class="{ single: revealMode === 'single' }">
                <div
                  v-for="(r, i) in revealResults"
                  :key="r.ing.key + '-' + i + '-' + revealMode"
                  class="ing-card pull-card"
                  :class="['glow-' + RARITIES[r.tierIdx].color, 'tier-' + RARITIES[r.tierIdx].color, { fresh: r.isNew, guaranteed: r.guaranteed }]"
                  :style="{ '--reveal-i': i }"
                >
                  <span v-if="r.isNew" class="new-tag">NEW</span>
                  <span v-if="r.guaranteed" class="guarantee-tag">保底</span>
                  <IngredientIcon :ing-key="r.ing.key" :size="revealMode === 'single' ? 42 : 28" />
                  <div class="name" :class="'rarity-' + RARITIES[r.tierIdx].color">{{ r.ing.name }}</div>
                  <div class="count">{{ RARITIES[r.tierIdx].label }}</div>
                </div>
                <div v-if="isRevealing" v-for="i in Math.max(0, (revealMode === 'ten' ? 10 : 1) - revealResults.length)" :key="'scan-' + i" class="ing-card pull-card placeholder">
                  <span class="scan-dot">?</span>
                </div>
              </div>
              <div class="gacha-summary" v-if="revealSummary && !isRevealing">
                <span>最高：<b :class="'rarity-' + RARITIES[revealSummary.maxTier].color">{{ revealSummary.label }}</b></span>
                <span>稀有+：{{ revealSummary.rareCount }}</span>
                <span>新食材：{{ revealSummary.newCount }}</span>
              </div>
              <button
                v-if="canGoKitchen && revealSummary && !isRevealing"
                class="btn secondary small gacha-next-action"
                type="button"
                @click="emit('switch-tab', 'kitchen')"
              >前往厨房烹调</button>
            </div>
          </div>
        </div>

        <div class="card gacha-intel-card" v-else>
          <h2><span class="dot"></span>抽取情报</h2>
          <div class="gacha-intel-grid">
            <div><span>十连规则</span><b>至少 1 份稀有+</b></div>
            <div><span>新食材</span><b>自动入库</b></div>
            <div><span>保底目标</span><b>{{ pityLeft }} 抽</b></div>
            <div><span>推荐动线</span><b>抽取 → 厨房</b></div>
          </div>
          <p class="gacha-intel-copy">成熟点击游戏会把“获得奖励”和“立刻消耗奖励”放在同一条短路径里。这里保留右侧情报区，让抽卡页即使还没有结果，也不会只剩单列空场。</p>
          <button
            v-if="canGoKitchen"
            class="btn secondary small"
            type="button"
            @click="emit('switch-tab', 'kitchen')"
          >前往厨房烹调</button>
        </div>
      </div>
    </div>
  </section>
</template>
