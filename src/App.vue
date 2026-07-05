<script setup>
// 顶层布局与启动流程：挂载各面板、全局 tick、离线结算弹窗、随机事件/金色披萨调度、
// 存档导入导出/重置的模态框。桌面端(min-width:1024px)由 CSS 用 .grid-desktop 两栏
// 网格同时展示全部面板并隐藏 tabbar（各面板组件根节点自带 .panel class，
// 全局 CSS 的 @media(min-width:1024px){ .panel{display:block!important} } 会强制显示）；
// 移动端用 activeTab + .panel.active 切换，class 通过 fallthrough attrs 落在各面板
// 组件的单一根节点 <section class="panel"> 上。
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { state, saveState, resetState, encodeSave, importSave } from './composables/useGameState.js'
import { startGameLoop } from './composables/useTick.js'
import { checkUnlocks } from './composables/useUnlocks.js'
import { checkAchievements } from './composables/useAchievements.js'
import { applyOfflineProgress } from './composables/useOfflineProgress.js'
import { startRandomEventLoop } from './composables/useRandomEvents.js'
import { scheduleGoldenPizza } from './composables/useGoldenPizza.js'
import { showToast, showConfirm } from './composables/useToast.js'
import { installGlobalInteractionFeedback } from './composables/useFeedback.js'
import { prestigePreview, performPrestige } from './composables/usePrestige.js'

import StatusBar from './components/StatusBar.vue'
import TabBar from './components/TabBar.vue'
import FactoryPanel from './components/FactoryPanel.vue'
import GachaPanel from './components/GachaPanel.vue'
import KitchenPanel from './components/KitchenPanel.vue'
import DexPanel from './components/DexPanel.vue'
import SkillTreePanel from './components/SkillTreePanel.vue'
import RecipeBookSheet from './components/RecipeBookSheet.vue'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmModal from './components/ConfirmModal.vue'

const VALID_TABS = new Set(['factory', 'gacha', 'kitchen', 'skills', 'dex'])
function initialTab() {
  if (typeof window === 'undefined') return 'factory'
  const target = new URLSearchParams(window.location.search).get('tab')
  return VALID_TABS.has(target) ? target : 'factory'
}

const activeTab = ref(initialTab())
const factoryPanelRef = ref(null)
const sheetOpen = ref(false)
const prestige = computed(() => prestigePreview(state))

const desktopNavTabs = [
  { key: 'factory', label: '工厂', icon: '🏭', always: true },
  { key: 'gacha', label: '抽卡', icon: '🎲' },
  { key: 'kitchen', label: '厨房', icon: '🍕' },
  { key: 'skills', label: '技能', icon: '🌟', always: true },
  { key: 'dex', label: '图鉴', icon: '📖' },
]
const visibleDesktopTabs = computed(() => desktopNavTabs.filter(t => t.always || state.unlocked[t.key]))
function showDesktopDot(t) {
  return !t.always && state.unlocked[t.key] && !state.seenNew[t.key]
}

const isDesktop = () => window.matchMedia('(min-width:1024px)').matches

function switchTab(target) {
  activeTab.value = target
  if (state.seenNew.hasOwnProperty(target) && !state.seenNew[target]) {
    state.seenNew[target] = true
    saveState()
  }
}

/* ---- Offline progress modal ---- */
const offlineModal = reactive({ open: false, mins: 0, earnedText: '', achLine: '' })
function closeOfflineModal() {
  offlineModal.open = false
  saveState()
}

/* ---- Export / Import / Reset modals ---- */
const exportModal = reactive({ open: false, code: '' })
const importModal = reactive({ open: false, text: '' })

function openExport() {
  exportModal.code = encodeSave()
  exportModal.open = true
}
function copyExportCode() {
  navigator.clipboard?.writeText(exportModal.code).then(() => showToast('已复制', '存档代码已复制到剪贴板。')).catch(() => {})
}
function openImport() {
  importModal.text = ''
  importModal.open = true
}
function confirmImport() {
  try {
    importSave(importModal.text.trim())
    importModal.open = false
    showToast('导入成功', '进度已恢复。欢迎回来，操作员。')
  } catch (err) {
    showToast('导入失败', '这串代码无法识别，请确认复制完整。')
  }
}
function onReset() {
  showConfirm('重置全部数据', '确定要清空所有进度吗？此操作无法撤销。', '确认重置', () => {
    resetState()
    activeTab.value = 'factory'
    showToast('已重置', '一切归零，重新开始你的虚拟披萨帝国。')
  })
}
function onPrestige() {
  const p = prestige.value
  if (!p.ready) {
    showToast('转生条件不足', `需要发现 ${p.requiredDiscoveries} 个唯一配方，并累计 ${p.requiredPoints} 个技能点。`)
    return
  }
  showConfirm(
    '启动转生重启',
    `将重置本轮字节、产线、库存、图鉴和抽卡进度，保留技能树与永久技能点记录。下一轮基础产出加成提升至 +${p.nextBonusPct}%。`,
    '确认转生',
    () => {
      const result = performPrestige(state)
      if (!result) return
      saveState()
      activeTab.value = 'factory'
      showToast('转生完成', `重启协议 Lv.${result.level} 已生效，下一轮产出加成 ${result.bonusText}。`, { life: 6000 })
    }
  )
}

let stopGameLoop, stopRandomEvents, stopGolden, stopInteractionFeedback

onMounted(() => {
  // 18. Boot（对应原版编号注释）
  const offline = applyOfflineProgress(state)
  if (offline) {
    offlineModal.open = true
    offlineModal.mins = offline.mins
    offlineModal.earnedText = offline.earnedText
    offlineModal.achLine = offline.achievements.length
      ? `离线期间达成 ${offline.achievements.length} 项成就：${offline.achievements.map(a => a.name).join('、')}`
      : ''
  }

  stopGameLoop = startGameLoop(state)
  checkUnlocks(state)
  checkAchievements(state)

  // maybeShowIntro
  if (state.stats.totalClicks === 0 && state.stats.totalEarned === 0) {
    showToast('欢迎', '点击披萨获得字节，升级产线可以自动生产。多点几下就会解锁抽卡功能。', { life: 6000 })
  }

  stopRandomEvents = startRandomEventLoop(state)
  stopInteractionFeedback = installGlobalInteractionFeedback()
  stopGolden = scheduleGoldenPizza(
    state,
    () => activeTab.value === 'factory',
    () => factoryPanelRef.value?.getStageSize() || { width: 220, height: 220 },
    () => switchTab('factory')
  )

  document.addEventListener('keydown', onKeydown)
})

function onKeydown(e) { if (e.key === 'Escape') sheetOpen.value = false }

onBeforeUnmount(() => {
  stopGameLoop && stopGameLoop()
  stopRandomEvents && stopRandomEvents()
  stopGolden && stopGolden()
  stopInteractionFeedback && stopInteractionFeedback()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <StatusBar />

  <div class="shell" :class="'shell-active-' + activeTab">
    <div class="desktop-module-nav" role="tablist" aria-label="PC功能模块切换">
      <button
        v-for="t in visibleDesktopTabs"
        :key="t.key"
        class="desktop-module-tab"
        :class="{ active: activeTab === t.key }"
        type="button"
        @click="switchTab(t.key)"
      >
        <span class="desktop-module-icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <i v-if="showDesktopDot(t)" aria-hidden="true"></i>
      </button>
    </div>

    <div class="grid-desktop desktop-module-grid" :class="'desktop-active-' + activeTab">
      <div class="dashboard-column dashboard-factory" :class="{ activeColumn: activeTab === 'factory' }">
        <FactoryPanel ref="factoryPanelRef" :class="{ active: activeTab === 'factory' }" @switch-tab="switchTab" />
      </div>
      <div class="dashboard-column dashboard-side" :class="{ activeColumn: activeTab === 'gacha' || activeTab === 'kitchen' }">
        <GachaPanel :class="{ active: activeTab === 'gacha' }" @switch-tab="switchTab" />
        <KitchenPanel :class="{ active: activeTab === 'kitchen' }" @open-recipe-book="sheetOpen = true" />
      </div>
      <div class="dashboard-column dashboard-dex" :class="{ activeColumn: activeTab === 'dex' }">
        <DexPanel :class="{ active: activeTab === 'dex' }" />
      </div>
      <div class="dashboard-column dashboard-skills" :class="{ activeColumn: activeTab === 'skills' }">
        <SkillTreePanel :class="{ active: activeTab === 'skills' }" />
      </div>
    </div>

    <footer class="notice">
      根据行业趋势，本产品自 2027 年 4 月 1 日起已完全数字化，卡路里恒为 0，配送依赖您的想象力。
      <div class="footer-actions">
        <button class="muted-link" @click="openExport">导出存档</button>
        <button class="muted-link" @click="openImport">导入存档</button>
        <button class="muted-link prestige" :class="{ ready: prestige.ready }" @click="onPrestige">
          转生重启 Lv.{{ prestige.current }}
        </button>
        <button class="muted-link danger" @click="onReset">重置全部数据</button>
      </div>
    </footer>
  </div>

  <ToastContainer />
  <RecipeBookSheet :open="sheetOpen" @close="sheetOpen = false" />
  <TabBar :active-tab="activeTab" @switch="switchTab" />
  <ConfirmModal />

  <!-- Offline progress modal -->
  <div v-if="offlineModal.open" class="modal-bg" @click.self="closeOfflineModal">
    <div class="modal">
      <h3>欢迎回来，操作员</h3>
      <p>
        虚拟烤箱在你离开的 {{ offlineModal.mins }} 分钟里持续运转，为你烘焙了<br />
        <b style="color:var(--gold)">{{ offlineModal.earnedText }}</b> 字节的想象力数据。
        <br v-if="offlineModal.achLine" />
        <span v-if="offlineModal.achLine" style="color:var(--cyan);font-size:15px;">{{ offlineModal.achLine }}</span>
      </p>
      <button class="btn" @click="closeOfflineModal">收下</button>
    </div>
  </div>

  <!-- Export modal -->
  <div v-if="exportModal.open" class="modal-bg" @click.self="exportModal.open = false">
    <div class="modal" role="dialog" aria-label="导出存档">
      <h3>导出存档</h3>
      <p style="font-size:14px;color:var(--muted);">复制下面这串代码保存好，在任何设备的「导入存档」里粘贴即可继续进度。</p>
      <textarea readonly :value="exportModal.code"></textarea>
      <div class="row-2">
        <button class="btn ghost" @click="exportModal.open = false">关闭</button>
        <button class="btn secondary" @click="copyExportCode">复制</button>
      </div>
    </div>
  </div>

  <!-- Import modal -->
  <div v-if="importModal.open" class="modal-bg" @click.self="importModal.open = false">
    <div class="modal" role="dialog" aria-label="导入存档">
      <h3>导入存档</h3>
      <p style="font-size:14px;color:var(--muted);">粘贴之前导出的存档代码。导入会覆盖当前进度。</p>
      <textarea v-model="importModal.text" placeholder="在此粘贴存档代码"></textarea>
      <div class="row-2">
        <button class="btn ghost" @click="importModal.open = false">取消</button>
        <button class="btn" @click="confirmImport">导入</button>
      </div>
    </div>
  </div>
</template>
