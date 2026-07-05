<script setup>
// 移动端底部标签栏；桌面端（min-width:1024px）由全局 CSS 隐藏，改用两栏网格同时展示全部面板。
import { computed } from 'vue'
import { state } from '../composables/useGameState.js'

const props = defineProps({
  activeTab: { type: String, required: true },
})
const emit = defineEmits(['switch'])

const TAB_DEFS = [
  { key: 'factory', label: '工厂', icon: '🏭', always: true },
  { key: 'gacha', label: '抽卡', icon: '🎲' },
  { key: 'kitchen', label: '厨房', icon: '🍳' },
  { key: 'dex', label: '图鉴', icon: '📖' },
]

const visibleTabs = computed(() => TAB_DEFS.filter(t => t.always || state.unlocked[t.key]))
function showDot(t) {
  return !t.always && state.unlocked[t.key] && !state.seenNew[t.key]
}
</script>

<template>
  <div class="tabbar" role="tablist" aria-label="切换页面">
    <button
      v-for="t in visibleTabs"
      :key="t.key"
      class="tab"
      :class="{ active: activeTab === t.key }"
      @click="emit('switch', t.key)"
    >
      <span class="ic">{{ t.icon }}</span>{{ t.label }}
      <span v-if="showDot(t)" class="newdot"></span>
    </button>
  </div>
</template>
