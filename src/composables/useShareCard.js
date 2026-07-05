// 生成 480x600 分享卡 PNG 并触发下载；文案/排版与原版一致。
import { RARITIES } from '../data/rarities.js'
import { ING_MAP } from '../data/ingredients.js'
import { drawPizza } from './utils/pixelArt.js'

export function downloadShareCard(recipe, ingKeys, rarityIdx) {
  const W = 480, H = 600
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#0d0221'
  ctx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 3) { ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(0, y, W, 1) }
  ctx.strokeStyle = '#3a2a6b'; ctx.lineWidth = 6
  ctx.strokeRect(10, 10, W - 20, H - 20)
  ctx.fillStyle = '#ff2e63'
  ctx.font = '16px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('DIGITAL PIZZA FACTORY (TM)', W / 2, 46)
  ctx.fillStyle = '#8b7fb8'
  ctx.font = '12px monospace'
  ctx.fillText('OFFICIAL RECIPE DISCOVERY CERTIFICATE', W / 2, 66)
  const size = 288
  const tmp = document.createElement('canvas')
  tmp.width = size; tmp.height = size
  drawPizza(tmp.getContext('2d'), ingKeys, size)
  ctx.drawImage(tmp, (W - size) / 2, 90)
  const rarityColors = { common: '#b7c4d1', uncommon: '#4ee08a', rare: '#4ec3ff', epic: '#c46bff', legendary: '#ffd23f' }
  ctx.fillStyle = rarityColors[RARITIES[rarityIdx].color]
  ctx.font = 'bold 22px monospace'
  ctx.fillText(recipe.name, W / 2, 90 + size + 40)
  ctx.fillStyle = '#ffd23f'
  ctx.font = '20px monospace'
  ctx.fillText('★'.repeat(RARITIES[rarityIdx].stars) + '☆'.repeat(5 - RARITIES[rarityIdx].stars), W / 2, 90 + size + 68)
  ctx.fillStyle = '#f3ecff'
  ctx.font = '13px monospace'
  ctx.fillText('原料: ' + ingKeys.map(k => ING_MAP[k].name).join(' / '), W / 2, 90 + size + 94)
  ctx.fillStyle = '#08d9d6'
  ctx.font = 'bold 15px monospace'
  ctx.fillText(RARITIES[rarityIdx].label + '级配方', W / 2, 90 + size + 122)
  ctx.fillStyle = '#8b7fb8'
  ctx.font = '11px monospace'
  ctx.fillText('虚拟披萨认证 · 卡路里为 0', W / 2, H - 24)
  const link = document.createElement('a')
  link.download = 'digital-pizza-' + recipe.id + '.png'
  link.href = c.toDataURL('image/png')
  link.click()
}

export function shareText(recipe, rarityIdx, ingKeys) {
  const names = ingKeys.map(k => ING_MAP[k].name)
  return '我在数字披萨工厂烘焙出了「' + recipe.name + '」（' + RARITIES[rarityIdx].label + '级）🍕 原料：' + names.join('/') + '（完全虚拟，卡路里为0）'
}
