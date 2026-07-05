<script setup>
// 配方书底部弹出面板。规模简化（21679 条配方场景下的合理简化，写在这里做说明）：
// - 已发现的配方：逐条渲染（这个集合天然很小，随游戏进度增长）。
// - 未发现但已购买过线索的配方：逐条渲染（同样很小，线索按次购买）。
// - 未发现且没有任何线索的配方：数量可能高达两万+，不逐条渲染 “未发现”行，
//   而是折叠成一行汇总提示，如"还有 21,xxx 个配方尚未发现任何线索"。
import { computed } from 'vue'
import { state } from '../composables/useGameState.js'
import { RECIPES } from '../data/recipes.js'
import { RARITIES } from '../data/rarities.js'
import { hintCost } from '../composables/useEconomy.js'
import { fmt } from '../composables/useEconomy.js'
import { buyHint } from '../composables/useHints.js'
import IngredientIcon from './IngredientIcon.vue'

const props = defineProps({
  open: { type: Boolean, required: true },
})
const emit = defineEmits(['close'])

const sorted = computed(() => RECIPES.slice().sort((a, b) => a.rarity - b.rarity || a.ing.length - b.ing.length))

const discovered = computed(() => sorted.value.filter(r => state.dex[r.id]))
const undiscoveredWithHint = computed(() => sorted.value.filter(r => !state.dex[r.id] && (state.hints[r.id] || 0) > 0))
const undiscoveredNoHintCount = computed(() =>
  RECIPES.length - discovered.value.length - undiscoveredWithHint.value.length
)

const hc = computed(() => hintCost(state))
const anyHintable = computed(() => RECIPES.some(r => !state.dex[r.id] && (state.hints[r.id] || 0) < r.ing.length))

function onBuyHint() { buyHint(state) }
</script>

<template>
  <div class="sheet-bg" :class="{ open }" @click="emit('close')"></div>
  <div class="sheet" :class="{ open }" role="dialog" aria-label="配方书">
    <h3><span>📖 配方书</span><button class="closebtn" aria-label="关闭配方书" @click="emit('close')">✕</button></h3>
    <button class="btn secondary small" style="margin-bottom:12px;" :disabled="state.bytes < hc || !anyHintable" @click="onBuyHint">
      💡 购买线索 · {{ fmt(hc) }} 字节
    </button>
    <div>
      <div
        v-for="r in undiscoveredWithHint" :key="r.id"
        class="recipe-row lockedrow"
      >
        <span class="rstars" :class="'rarity-' + RARITIES[r.rarity].color">{{ '★'.repeat(RARITIES[r.rarity].stars) }}</span>
        <span class="rname">未发现（{{ r.ing.length }}种原料）</span>
        <span class="rchips">
          <template v-for="(k, i) in r.ing" :key="i">
            <IngredientIcon v-if="i < (state.hints[r.id] || 0)" :ing-key="k" :size="18" />
            <span v-else class="qm">?</span>
          </template>
        </span>
      </div>

      <div v-if="undiscoveredNoHintCount > 0" class="dex-summary-line">
        还有 {{ undiscoveredNoHintCount.toLocaleString('zh-CN') }} 个配方尚未发现任何线索
      </div>

      <div
        v-for="r in discovered" :key="r.id"
        class="recipe-row donerow"
      >
        <span class="rstars" :class="'rarity-' + RARITIES[r.rarity].color">{{ '★'.repeat(RARITIES[r.rarity].stars) }}</span>
        <span class="rname">✓ {{ r.name }}</span>
        <span class="rchips">
          <IngredientIcon v-for="k in r.ing" :key="k" :ing-key="k" :size="18" />
        </span>
      </div>
    </div>
  </div>
</template>
