// 图鉴线索购买：优先给稀有度低、已购买线索多的未收录配方补线索。
import { RECIPES } from '../data/recipes.js'
import { RARITIES } from '../data/rarities.js'
import { ING_MAP } from '../data/ingredients.js'
import { hintCost } from './useEconomy.js'
import { saveState } from './useGameState.js'
import { showToast } from './useToast.js'
import { sfxBuy } from './useAudio.js'

export function buyHint(state) {
  const cost = hintCost(state)
  if (state.bytes < cost) return
  const candidates = RECIPES.filter(r => !state.dex[r.id] && (state.hints[r.id] || 0) < r.ing.length)
  if (!candidates.length) return
  candidates.sort((a, b) => a.rarity - b.rarity || (state.hints[b.id] || 0) - (state.hints[a.id] || 0))
  const pickPool = candidates.slice(0, Math.max(1, Math.ceil(candidates.length / 2)))
  const r = pickPool[Math.floor(Math.random() * pickPool.length)]
  state.bytes -= cost
  state.stats.hintsBought++
  state.hints[r.id] = (state.hints[r.id] || 0) + 1
  const revealed = ING_MAP[r.ing[state.hints[r.id] - 1]]
  sfxBuy()
  showToast('线索到手', '某个' + RARITIES[r.rarity].label + '级配方（共' + r.ing.length + '种原料）的原料之一是「' + revealed.name + '」，已标记在图鉴和配方书里。')
  saveState()
}
