// 18 个成就。check(state) 返回布尔值。
// 判断调用：由于 RECIPES 从原版手写 24 条改为生成表 21679 条，
// 原 dexAll 成就硬编码的 "集齐全部 24 种配方" 改为动态引用 RECIPES.length，
// dex12（原"半本图鉴"）在新配方规模下不再是"半本"，因此改名为
// "配方新秀"，阈值本身（12）不变——这是从"半程里程碑"降级为"早期小目标"的文案调整，
// 不影响任何数值判定逻辑。
import { MAX_SLOTS } from './constants.js'
import { RECIPES } from './recipes.js'

export const ACHIEVEMENTS = [
  { id: 'click100', name: '手速训练', desc: '累计点击 100 次', icon: '👆', check: s => s.stats.totalClicks >= 100 },
  { id: 'click1000', name: '意念大师', desc: '累计点击 1000 次', icon: '🧠', check: s => s.stats.totalClicks >= 1000 },
  { id: 'earn1k', name: '初创字节', desc: '累计获得 1,000 字节', icon: '💾', check: s => s.stats.totalEarned >= 1000 },
  { id: 'earn100k', name: '数据大亨', desc: '累计获得 100,000 字节', icon: '🏦', check: s => s.stats.totalEarned >= 100000 },
  { id: 'gen1', name: '自动化开端', desc: '拥有第一台虚拟产线', icon: '🏭', check: s => Object.values(s.gens).some(n => n > 0) },
  { id: 'pull1', name: '首次抽取', desc: '抽取第一份原料', icon: '🎲', check: s => s.stats.ingredientPulls >= 1 },
  { id: 'pullLegend', name: '传说食材', desc: '抽到一次传说级原料', icon: '💎', check: s => s.stats.legendaryIngPulls >= 1 },
  { id: 'craftFirst', name: '下厨第一课', desc: '完成第一次烘焙', icon: '👨‍🍳', check: s => s.stats.bakesTotal >= 1 },
  { id: 'craftMatch', name: '配方发现者', desc: '发现第一个真正的配方', icon: '📜', check: s => Object.keys(s.dex).length >= 1 },
  { id: 'craftLegend', name: '传说主厨', desc: '发现一个传说级配方', icon: '👑', check: s => Object.values(s.dex).some(d => d.rarity === 4) },
  { id: 'dex12', name: '配方新秀', desc: '集齐 12 种配方', icon: '📖', check: s => Object.keys(s.dex).length >= 12 },
  { id: 'dexAll', name: '披萨百科全书', desc: () => `集齐全部 ${RECIPES.length} 种配方`, icon: '🏆', check: s => Object.keys(s.dex).length >= RECIPES.length },
  { id: 'allSlots', name: '厨房扩建完成', desc: '解锁全部 5 个合成格', icon: '🧩', check: s => s.slots >= MAX_SLOTS },
  { id: 'goldenCatch', name: '手快有手慢无', desc: '抓住一次金色披萨事件', icon: '✨', check: s => s.stats.goldenCaught >= 1 },
  { id: 'offline', name: '欢迎回来', desc: '离线期间产线仍在运转', icon: '🌙', check: s => s.stats.offlineClaims >= 1 },
  { id: 'crit50', name: '暴击猎手', desc: '累计触发 50 次暴击', icon: '💥', check: s => (s.stats.critHits || 0) >= 50 },
  { id: 'gen4', name: '奇点驾驭者', desc: '拥有第一台奇点烘焙反应堆', icon: '🕳️', check: s => s.gens.singularity > 0 },
  { id: 'overclock10', name: '过载超频', desc: '产能过载升级达到 10 级', icon: '🔬', check: s => (s.overclockLv || 0) >= 10 },
]

// desc 支持字符串或函数（函数用于需要动态插值的文案，如 dexAll）
export function achDesc(a) {
  return typeof a.desc === 'function' ? a.desc() : a.desc
}
