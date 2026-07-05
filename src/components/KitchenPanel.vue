<script setup>
// 厨房面板：合成格 tray、格子解锁购买、原料库存网格、烹调倒计时、烘焙出炉结果。
import { ref, computed, onBeforeUnmount } from 'vue'
import { state } from '../composables/useGameState.js'
import { INGREDIENTS } from '../data/ingredients.js'
import { RARITIES } from '../data/rarities.js'
import { MAX_SLOTS, SLOT_UNLOCK_COST } from '../data/constants.js'
import { fmt } from '../composables/useEconomy.js'
import { cookingTimeForIngredients, formatCookTime } from '../composables/utils/cookingTime.js'
import { buySlot, removeFromSlot, placeIntoFirstEmptySlot, requestBake, actuallyBake } from '../composables/useKitchen.js'
import { downloadShareCard, shareText } from '../composables/useShareCard.js'
import { showToast } from '../composables/useToast.js'
import IngredientIcon from './IngredientIcon.vue'
import PizzaCanvas from './PizzaCanvas.vue'

const emit = defineEmits(['open-recipe-book'])

const nextSlot = computed(() => state.slots + 1)
const nextSlotCost = computed(() => SLOT_UNLOCK_COST[nextSlot.value])

const ownedIngredients = computed(() =>
  INGREDIENTS.filter(i => (state.inventory[i.key] || 0) > 0)
    .slice()
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
)

const selectedIngredients = computed(() => state.craftSlots.slice(0, state.slots).filter(Boolean))
const isCooking = ref(false)
const canBake = computed(() => selectedIngredients.value.some(Boolean) && !isCooking.value)
const estimatedCookMs = computed(() => cookingTimeForIngredients(selectedIngredients.value))
const estimatedCookText = computed(() => selectedIngredients.value.length ? formatCookTime(estimatedCookMs.value) : '放入原料后计算')

const bakeVisible = ref(false)
const bakeFlash = ref(false)
const bakeShake = ref(false)
const bakeResult = ref(null)
const bakeStageEl = ref(null)
const cookDurationMs = ref(0)
const cookRemainingMs = ref(0)
const cookStartedAt = ref(0)
let cookTimer = null

const cookProgressPct = computed(() => {
  if (!isCooking.value || cookDurationMs.value <= 0) return 0
  return Math.min(100, Math.max(0, ((cookDurationMs.value - cookRemainingMs.value) / cookDurationMs.value) * 100))
})
const cookRemainingText = computed(() => formatCookTime(cookRemainingMs.value))

function clearCookTimer() {
  if (cookTimer) window.clearInterval(cookTimer)
  cookTimer = null
}

function revealBakeResult(result) {
  bakeVisible.value = true
  bakeResult.value = result
  if (result.rarityIdx >= 3 || result.isNew) {
    bakeFlash.value = false
    requestAnimationFrame(() => { bakeFlash.value = true })
    bakeShake.value = false
    requestAnimationFrame(() => { bakeShake.value = true })
  }
  requestAnimationFrame(() => {
    bakeStageEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function finishCooking() {
  clearCookTimer()
  isCooking.value = false
  cookRemainingMs.value = 0
  actuallyBake(state, revealBakeResult)
}

function startCooking(durationMs) {
  isCooking.value = true
  bakeVisible.value = false
  bakeResult.value = null
  cookDurationMs.value = durationMs
  cookRemainingMs.value = durationMs
  cookStartedAt.value = Date.now()
  clearCookTimer()
  cookTimer = window.setInterval(() => {
    const elapsed = Date.now() - cookStartedAt.value
    cookRemainingMs.value = Math.max(0, cookDurationMs.value - elapsed)
    if (cookRemainingMs.value <= 0) finishCooking()
  }, 100)
}

function onBake() {
  if (isCooking.value) return
  requestBake(state, ({ durationMs }) => startCooking(durationMs))
}

function onSlotClick(index) {
  if (isCooking.value || index >= state.slots || !state.craftSlots[index]) return
  removeFromSlot(state, index)
}

function onPlaceIngredient(key) {
  if (isCooking.value) return
  placeIntoFirstEmptySlot(state, key)
}

function onBuySlot() {
  if (isCooking.value) return
  buySlot(state, nextSlot.value)
}

function onShare() {
  const r = bakeResult.value
  if (!r) return
  const text = shareText(r.recipe, r.rarityIdx, r.filled)
  navigator.clipboard?.writeText(text).then(() => {
    showToast('已复制', '分享文案已复制到剪贴板，快发给朋友吧。')
  }).catch(() => { showToast('复制失败', '你的浏览器不支持自动复制。') })
}
function onDownload() {
  const r = bakeResult.value
  if (!r) return
  downloadShareCard(r.recipe, r.filled, r.rarityIdx)
}

onBeforeUnmount(() => clearCookTimer())

const detailText = computed(() => {
  if (!bakeResult.value) return ''
  const r = bakeResult.value
  let d = '原料：' + r.names.join('、') + ' ｜ 获得 ' + fmt(r.reward) + ' 字节'
  if (r.isNew) {
    const pct = Math.round((r.rarityIdx >= 0 ? [0.01, 0.02, 0.04, 0.08, 0.15][r.rarityIdx] : 0) * 100)
    d += '（首次发现 ×2.5，产量永久 +' + pct + '%）'
  }
  if (r.skillPointGain > 0) d += ' ｜ 技能点 +' + r.skillPointGain
  else if (!r.isNew) d += ' ｜ 重复配方不增加技能点'
  return d
})
</script>

<template>
  <section class="panel" data-panel="kitchen">
    <div v-if="!state.unlocked.kitchen">
      <div class="lock-card">
        <div class="ico">🔒</div>
        <div class="t">厨房 · 未解锁</div>
        <div class="d">先去「抽卡」获取一些原料</div>
      </div>
    </div>
    <div v-else class="kitchen-layout">
      <div class="card kitchen-craft-card" :class="{ cooking: isCooking }">
        <h2><span class="dot"></span>烘焙台 <span class="sidenote">{{ isCooking ? '正在烹调，原料已锁定' : '点击已放入的原料可取回' }}</span></h2>
        <div class="slot-tray">
          <div
            v-for="i in MAX_SLOTS" :key="i-1"
            class="slot"
            :class="{ locked: i-1 >= state.slots, filled: state.craftSlots[i-1], disabled: isCooking }"
            :role="(!isCooking && i-1 < state.slots && state.craftSlots[i-1]) ? 'button' : null"
            :tabindex="(!isCooking && i-1 < state.slots && state.craftSlots[i-1]) ? 0 : -1"
            :aria-label="state.craftSlots[i-1] ? '取回' + INGREDIENTS.find(ing => ing.key === state.craftSlots[i-1])?.name : null"
            @click="onSlotClick(i-1)"
            @keydown.enter.prevent="onSlotClick(i-1)"
            @keydown.space.prevent="onSlotClick(i-1)"
          >
            <template v-if="i-1 >= state.slots">🔒</template>
            <template v-else-if="state.craftSlots[i-1]">
              <IngredientIcon :ing-key="state.craftSlots[i-1]" :size="40" />
              <div class="rm">×</div>
            </template>
          </div>
        </div>
        <div class="slot-buy-row" v-if="nextSlotCost">
          <button class="slot-buy" :disabled="isCooking || state.bytes < nextSlotCost" @click="onBuySlot">
            <span>解锁第 {{ nextSlot }} 格</span><span>{{ fmt(nextSlotCost) }} 字节</span>
          </button>
        </div>
        <div class="cook-meter" :class="{ active: isCooking }">
          <div class="cook-meter-head">
            <span>{{ isCooking ? '烹调中' : '预计烹调' }}</span>
            <b>{{ isCooking ? cookRemainingText : estimatedCookText }}</b>
          </div>
          <div class="cook-track"><div class="cook-fill" :style="{ width: (isCooking ? cookProgressPct : 0) + '%' }"></div></div>
        </div>
        <div class="row-2">
          <button class="btn" :disabled="!canBake" @click="onBake">{{ isCooking ? '烹调中…' : '开始烘焙' }}</button>
          <button class="btn ghost" :disabled="isCooking" @click="emit('open-recipe-book')">配方书</button>
        </div>
      </div>

      <div class="card kitchen-inventory-card">
        <h2><span class="dot"></span>原料库存</h2>
        <div class="inv-grid">
          <div v-if="!ownedIngredients.length" class="inv-empty">原料库存是空的，去「抽卡」抽取一些原料吧</div>
          <div
            v-for="ing in ownedIngredients" :key="ing.key"
            class="inv-card" :class="{ disabled: isCooking }" role="button" :tabindex="isCooking ? -1 : 0"
            @click="onPlaceIngredient(ing.key)"
            @keydown.enter.prevent="onPlaceIngredient(ing.key)"
            @keydown.space.prevent="onPlaceIngredient(ing.key)"
          >
            <span class="count">{{ state.inventory[ing.key] }}</span>
            <IngredientIcon :ing-key="ing.key" :size="28" />
            <div class="name" :class="'rarity-' + RARITIES[ing.tier].color">{{ ing.name }}</div>
          </div>
        </div>
      </div>

      <div class="card kitchen-result-card" v-if="bakeVisible && bakeResult">
        <h2><span class="dot"></span>烘焙结果</h2>
        <div class="reveal-stage" ref="bakeStageEl">
          <div class="reveal-flash" :class="{ fire: bakeFlash }" @animationend="bakeFlash = false"></div>
          <div :class="{ shake: bakeShake }" @animationend="bakeShake = false" style="display:flex;flex-direction:column;align-items:center;gap:8px;width:100%;">
            <PizzaCanvas :ing-keys="bakeResult.filled" :size="140" :class-name="'glow-' + bakeResult.rarityColor" />
            <div class="result-title" :class="'rarity-' + bakeResult.rarityColor">{{ bakeResult.title }}</div>
            <div class="stars">{{ '★'.repeat(bakeResult.stars) + '☆'.repeat(5 - bakeResult.stars) }}</div>
            <div style="font-size:15px;color:var(--muted);text-align:center;">{{ detailText }}</div>
            <div class="row-2" style="width:100%;">
              <button class="btn secondary small" @click="onShare">复制分享文案</button>
              <button class="btn ghost small" @click="onDownload">下载分享卡</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
