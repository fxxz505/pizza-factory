<script setup>
import { computed, ref } from 'vue'
import { state } from '../composables/useGameState.js'
import {
  RESEARCH_DEFS, availableSkillPoints, canBuyResearch, researchCost,
  researchLevel, researchUnlocked, totalSpentSkillPoints,
} from '../composables/useEconomy.js'
import { prestigePreview } from '../composables/usePrestige.js'
import { useResearchActions } from '../composables/useResearchActions.js'

const activeBranch = ref('全部')
const prestige = computed(() => prestigePreview(state))
const skillPoints = computed(() => availableSkillPoints(state))
const spentSkillPoints = computed(() => totalSpentSkillPoints(state))
const maxRow = computed(() => Math.max(...RESEARCH_DEFS.map(def => def.row)))
const maxCol = computed(() => Math.max(...RESEARCH_DEFS.map(def => def.col)))
const branches = computed(() => ['全部', ...new Set(RESEARCH_DEFS.map(def => def.branch))])
const readySkills = computed(() => RESEARCH_DEFS.filter(def => canBuyResearch(state, def)))
const completionPct = computed(() => {
  const max = RESEARCH_DEFS.reduce((sum, def) => sum + def.max, 0)
  const current = RESEARCH_DEFS.reduce((sum, def) => sum + researchLevel(state, def.key), 0)
  return Math.round((current / Math.max(1, max)) * 100)
})
const branchStats = computed(() => branches.value.filter(b => b !== '全部').map(branch => {
  const defs = RESEARCH_DEFS.filter(def => def.branch === branch)
  const max = defs.reduce((sum, def) => sum + def.max, 0)
  const current = defs.reduce((sum, def) => sum + researchLevel(state, def.key), 0)
  return { branch, current, max, ready: defs.filter(def => canBuyResearch(state, def)).length }
}))

const { pulseKey, burstKey, buyResearch, clearPulse } = useResearchActions(state)

function focusBranch(branch) {
  activeBranch.value = branch
}

function isDimmed(def) {
  return activeBranch.value !== '全部' && def.branch !== activeBranch.value
}
</script>

<template>
  <section class="panel skill-page" data-panel="skills">
    <div class="skill-page-head card">
      <div>
        <h2><span class="dot"></span>技能树</h2>
        <p>用首次发现披萨获得的星级点数强化点击、挂机、抽卡、厨房和转生路线。</p>
      </div>
      <div class="skill-page-summary">
        <div><span>可用技能点</span><b>{{ skillPoints }}</b></div>
        <div><span>已投入</span><b>{{ spentSkillPoints }}</b></div>
        <div><span>完成度</span><b>{{ completionPct }}%</b></div>
        <div><span>转生等级</span><b>Lv.{{ prestige.current }}</b></div>
      </div>
    </div>

    <div class="skill-page-layout">
      <aside class="card skill-branch-card">
        <h2><span class="dot"></span>分支</h2>
        <button
          v-for="branch in branches"
          :key="branch"
          class="skill-branch-btn"
          :class="{ active: activeBranch === branch }"
          type="button"
          @click="focusBranch(branch)"
        >
          <span>{{ branch }}</span>
          <b v-if="branch === '全部'">{{ readySkills.length }} 可点</b>
          <b v-else>{{ branchStats.find(item => item.branch === branch)?.ready || 0 }} 可点</b>
        </button>
        <div class="skill-branch-progress" v-for="item in branchStats" :key="item.branch">
          <div><span>{{ item.branch }}</span><b>{{ item.current }}/{{ item.max }}</b></div>
          <i><em :style="{ width: Math.round(item.current / Math.max(1, item.max) * 100) + '%' }"></em></i>
        </div>
      </aside>

      <div class="card skill-tree-board">
        <div class="skill-board-top">
          <h2><span class="dot"></span>节点图谱</h2>
          <div class="skill-board-hint">
            <span v-if="readySkills.length">可升级：{{ readySkills.slice(0, 3).map(def => def.name).join(' / ') }}</span>
            <span v-else>烘焙新配方可按星级获得技能点</span>
          </div>
        </div>

        <div
          class="skill-map"
          :style="{ '--skill-rows': maxRow, '--skill-cols': maxCol }"
        >
          <button
            v-for="def in RESEARCH_DEFS"
            :key="def.key"
            class="skill-map-node"
            :class="{
              locked: !researchUnlocked(state, def),
              ready: canBuyResearch(state, def),
              maxed: researchLevel(state, def.key) >= def.max,
              pulsing: pulseKey === def.key,
              dimmed: isDimmed(def)
            }"
            :style="{ '--tree-row': def.row, '--tree-col': def.col }"
            type="button"
            :disabled="!canBuyResearch(state, def)"
            @click="buyResearch(def)"
            @animationend="clearPulse(def.key)"
          >
            <i class="skill-burst" v-if="burstKey === def.key" aria-hidden="true"></i>
            <span class="research-icon">{{ def.icon }}</span>
            <span class="research-info">
              <span class="research-branch">{{ def.branch }}</span>
              <span class="name">{{ def.name }} Lv.{{ researchLevel(state, def.key) }}/{{ def.max }}</span>
              <span class="sub">{{ def.desc }}</span>
              <span class="research-effect">{{ def.effect(researchLevel(state, def.key)) }}</span>
              <span v-if="!researchUnlocked(state, def)" class="research-req">需要前置技能</span>
            </span>
            <span class="skill-node-footer">
              <span>{{ researchLevel(state, def.key) >= def.max ? '满级' : '升级' }}</span>
              <b>{{ researchLevel(state, def.key) >= def.max ? 'MAX' : researchCost(state, def) + ' 点' }}</b>
            </span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
