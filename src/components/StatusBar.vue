<script setup>
import { computed } from 'vue'
import { state } from '../composables/useGameState.js'
import { bytesPerSecond, clickUpgradeCost, gachaSingleCostForState, genCost, fmt, fmtRate, pad2 } from '../composables/useEconomy.js'
import { audioUI, cycleVolume } from '../composables/useAudio.js'
import { tickClock } from '../composables/useTick.js'
import { GEN_DEFS } from '../data/genDefs.js'

const byteText = computed(() => fmt(state.bytes))
const bps = computed(() => bytesPerSecond(state))
const bpsText = computed(() => fmtRate(bps.value))

const nextTarget = computed(() => {
  if (!state.unlocked.gacha) {
    const remain = Math.max(0, 5 - state.stats.totalClicks)
    return remain > 0 ? '下一目标：再点击 ' + remain + ' 次解锁抽卡' : '下一目标：抽卡已可解锁'
  }
  if (!state.unlocked.kitchen) {
    const cost = gachaSingleCostForState(state)
    if (Object.values(state.inventory).some(c => c > 0)) return '下一目标：进入厨房放入原料'
    if (state.bytes >= cost) return '下一目标：抽取第一份原料'
    const gap = cost - state.bytes
    return '下一目标：再获得 ' + fmt(gap) + ' 字节可抽取原料'
  }
  if (!state.unlocked.dex) {
    return state.stats.bakesTotal > 0 ? '下一目标：披萨图鉴即将启用' : '下一目标：完成一次烹调解锁图鉴'
  }

  const candidates = [
    { label: '升级点击强度', cost: clickUpgradeCost(state) },
    { label: '单抽原料', cost: gachaSingleCostForState(state) },
    ...GEN_DEFS.map((def, idx) => ({ label: '购买' + def.name, cost: genCost(state, idx) })),
  ].filter(item => Number.isFinite(item.cost) && item.cost > state.bytes)
    .sort((a, b) => a.cost - b.cost)

  if (!candidates.length) return '下一目标：继续扩张数字披萨工厂'
  const target = candidates[0]
  const gap = target.cost - state.bytes
  if (bps.value > 0) {
    const seconds = Math.ceil(gap / bps.value)
    return '下一目标：' + target.label + '，还差 ' + fmt(gap) + ' 字节，约 ' + seconds + ' 秒'
  }
  return '下一目标：' + target.label + '，还差 ' + fmt(gap) + ' 字节'
})

const buffInfo = computed(() => {
  const n = tickClock.now
  const prodBuff = n < state.buffUntil
  const clickBuff = n < state.clickBuffUntil
  if (!prodBuff && !clickBuff) return null
  if (prodBuff) {
    const remain = Math.max(0, Math.ceil((state.buffUntil - n) / 1000))
    return '产量 x' + state.buffMult + ' ' + pad2(Math.floor(remain / 60)) + ':' + pad2(remain % 60)
  }
  const remain = Math.max(0, Math.ceil((state.clickBuffUntil - n) / 1000))
  return '点击 +' + state.clickBuffAdd + ' ' + pad2(Math.floor(remain / 60)) + ':' + pad2(remain % 60)
})
</script>

<template>
  <div class="statusbar">
    <div class="brand">数字披萨工厂<small>DIGITAL PIZZA FACTORY™</small></div>
    <div class="desktop-target-strip">{{ nextTarget }}</div>
    <div class="stat-cluster">
      <div class="stat"><div class="label">字节 BYTES</div><div class="value">{{ byteText }}</div></div>
      <div class="stat"><div class="label">速率 /s</div><div class="value">{{ bpsText }}</div></div>
      <button
        class="iconbtn"
        :title="'音量 ' + audioUI.pct + '% · 点击切换'"
        :aria-label="'音量 ' + audioUI.pct + '%，点击切换'"
        @click="cycleVolume"
      >{{ audioUI.icon }}</button>
    </div>
  </div>
  <span class="buffpill" :class="{ show: buffInfo }">{{ buffInfo || '增益' }}</span>
</template>
