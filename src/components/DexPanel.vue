<script setup>
// 图鉴面板。规模说明：RECIPES 有 21679 条，不能一次性渲染所有 DOM 节点。
// 这里采用手写分页（PAGE_SIZE=48/页）而非虚拟滚动 —— 因为没有安装任何虚拟滚动库，
// 手写分页实现简单、可靠，且用户浏览图鉴本来就是分批次的行为，分页体验完全够用。
// 过滤链：稀有度下拉 -> 已发现/未发现 -> 名称包含(.includes())，
// 过滤结果数组本身仍是全量 filter（对 21679 条数组一次 filter 只有几毫秒级开销，
// 可接受），真正影响 DOM 节点数的是分页 slice，只渲染当前页 48 条。
import { ref, computed, watch } from 'vue'
import { state } from '../composables/useGameState.js'
import { RECIPES } from '../data/recipes.js'
import { RARITIES } from '../data/rarities.js'
import IngredientIcon from './IngredientIcon.vue'
import PizzaCanvas from './PizzaCanvas.vue'
import AchievementList from './AchievementList.vue'

const PAGE_SIZE = 48

const discoveredCount = computed(() => Object.keys(state.dex).length)
const dexPct = computed(() => (discoveredCount.value / RECIPES.length * 100))

const rarityFilter = ref('all')
const discoveryFilter = ref('all') // all | discovered | undiscovered
const nameQuery = ref('')
const page = ref(1)

// 排序后的全量数组只算一次（RECIPES 本身顺序固定）
const sortedAll = computed(() => RECIPES.slice().sort((a, b) => a.rarity - b.rarity || a.name.localeCompare(b.name)))

// 名称搜索：未发现的配方名称对玩家是保密的（显示“未发现”），所以搜索只在"已发现"
// 集合里按名称 includes 匹配；未发现的配方无法按真实名字搜到，这是有意为之。
const filteredWithSearch = computed(() => {
  let list = sortedAll.value
  if (rarityFilter.value !== 'all') {
    const idx = Number(rarityFilter.value)
    list = list.filter(r => r.rarity === idx)
  }
  if (discoveryFilter.value === 'discovered') list = list.filter(r => !!state.dex[r.id])
  else if (discoveryFilter.value === 'undiscovered') list = list.filter(r => !state.dex[r.id])
  const q = nameQuery.value.trim()
  if (q) {
    list = list.filter(r => !state.dex[r.id] || r.name.includes(q))
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredWithSearch.value.length / PAGE_SIZE)))
watch([rarityFilter, discoveryFilter, nameQuery], () => { page.value = 1 })
watch(totalPages, (tp) => { if (page.value > tp) page.value = tp })

const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredWithSearch.value.slice(start, start + PAGE_SIZE)
})

function hintsFor(r) {
  return state.hints[r.id] || 0
}
</script>

<template>
  <section class="panel" data-panel="dex">
    <div v-if="!state.unlocked.dex" class="dex-locked-wrap">
      <div class="lock-card">
        <div class="ico">🔒</div>
        <div class="t">披萨图鉴 · 未解锁</div>
        <div class="d">先在「厨房」完成一次烘焙</div>
      </div>
      <div class="card desktop-goals-card">
        <h2><span class="dot"></span>长期目标</h2>
        <div class="goal-list">
          <div class="goal-row done"><span>1</span><b>启动工厂</b><em>点击披萨获得第一批字节</em></div>
          <div class="goal-row" :class="{ done: state.unlocked.gacha }"><span>2</span><b>解锁抽卡</b><em>获取原料，准备烹调组合</em></div>
          <div class="goal-row" :class="{ done: state.unlocked.kitchen }"><span>3</span><b>开启厨房</b><em>把原料放入烘焙台并等待出炉</em></div>
          <div class="goal-row"><span>4</span><b>点亮图鉴</b><em>发现配方后获得永久产量加成</em></div>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="card">
        <h2><span class="dot"></span>披萨图鉴</h2>
        <div class="dex-bonus">
          <span class="big">产量加成 +{{ Math.round(state.collectionBonus * 100) }}%</span>
          <span class="exp">每发现一个配方，全部产线永久提速（普通+1% ～ 传说+15%）</span>
        </div>
        <div class="dex-progress">已发现 {{ discoveredCount }} / {{ RECIPES.length }} 种配方</div>
        <div class="dex-bar"><div class="dex-bar-fill" :style="{ width: dexPct + '%' }"></div></div>

        <div class="dex-controls">
          <select v-model="rarityFilter">
            <option value="all">全部稀有度</option>
            <option v-for="(r, i) in RARITIES" :key="r.key" :value="String(i)">{{ r.label }}</option>
          </select>
          <select v-model="discoveryFilter">
            <option value="all">全部</option>
            <option value="discovered">已发现</option>
            <option value="undiscovered">未发现</option>
          </select>
          <input type="text" v-model="nameQuery" placeholder="搜索已发现配方名称…" />
        </div>

        <div class="dex-grid">
          <div
            v-for="r in pageItems" :key="r.id"
            class="dex-slot" :class="{ locked: !state.dex[r.id] }"
          >
            <template v-if="state.dex[r.id]">
              <PizzaCanvas :ing-keys="r.ing" :size="48" class-name="pz" />
              <div class="dname">{{ r.name }}</div>
            </template>
            <template v-else>
              <div v-if="hintsFor(r) > 0" class="hintchips">
                <template v-for="(k, i) in r.ing" :key="i">
                  <IngredientIcon v-if="i < hintsFor(r)" :ing-key="k" :size="14" />
                  <span v-else class="qm">?</span>
                </template>
              </div>
              <div v-else class="silhouette">🍕</div>
              <div class="dname">未发现（{{ r.ing.length }}种原料）</div>
            </template>
            <div class="badge-r" :class="'rarity-' + RARITIES[r.rarity].color">{{ '★'.repeat(RARITIES[r.rarity].stars) }}</div>
          </div>
        </div>

        <div class="dex-pagination" v-if="totalPages > 1">
          <button class="btn ghost small" :disabled="page <= 1" @click="page--">‹ 上一页</button>
          <span class="pg-info">第 {{ page }} / {{ totalPages }} 页（共 {{ filteredWithSearch.length }} 条）</span>
          <button class="btn ghost small" :disabled="page >= totalPages" @click="page++">下一页 ›</button>
        </div>
      </div>

      <AchievementList />
    </div>
  </section>
</template>
