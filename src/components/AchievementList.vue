<script setup>
// 18 个成就列表，折叠面板。
import { computed } from 'vue'
import { state } from '../composables/useGameState.js'
import { ACHIEVEMENTS, achDesc } from '../data/achievements.js'
import { saveState } from '../composables/useGameState.js'

const doneCount = computed(() => ACHIEVEMENTS.filter(a => state.achDone[a.id]).length)

function toggleOpen() {
  state.uiAchOpen = !state.uiAchOpen
  saveState()
}
</script>

<template>
  <div class="card">
    <button class="ach-header" :aria-expanded="String(!!state.uiAchOpen)" @click="toggleOpen">
      <span>成就 {{ doneCount }}/{{ ACHIEVEMENTS.length }}</span>
      <span class="arrow">{{ state.uiAchOpen ? '▾' : '▸' }}</span>
    </button>
    <div class="ach-list" :class="{ open: state.uiAchOpen }">
      <div v-for="a in ACHIEVEMENTS" :key="a.id" class="ach" :class="{ done: state.achDone[a.id] }">
        <div class="ico">{{ state.achDone[a.id] ? a.icon : '🔒' }}</div>
        <div class="txt">
          <div class="t">{{ a.name }}</div>
          <div class="d">{{ achDesc(a) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
