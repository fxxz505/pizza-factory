// 像素精灵 + 披萨渲染算法 —— 与原版逐字节保持一致（含 RNG 種子算法）。
import { ING_MAP } from '../../data/ingredients.js'

/* ---- RNG utils（与原版一致） ---- */
export function hashStringToInt(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function rngFromSeed(seedStr) {
  const seedFn = hashStringToInt(seedStr)
  return mulberry32(seedFn())
}

/* ---- Sprite drawing ---- */
export function drawIngSprite(ctx, key, size) {
  const ing = ING_MAP[key]
  if (!ing) return
  const cell = size / 8
  ctx.clearRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = false
  ing.px.forEach((row, y) => {
    for (let x = 0; x < 8; x++) {
      const ch = row[x]
      if (ch === '.') continue
      ctx.fillStyle = ing.pal[ch] || '#f0f'
      ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell), Math.ceil(cell), Math.ceil(cell))
    }
  })
}

export function makeIngIcon(key, cssSize) {
  const c = document.createElement('canvas')
  c.width = 16; c.height = 16
  c.style.width = cssSize + 'px'; c.style.height = cssSize + 'px'
  drawIngSprite(c.getContext('2d'), key, 16)
  return c
}

export const GRID = 16
export const BASE_MASK = (() => {
  const cx = (GRID - 1) / 2, cy = (GRID - 1) / 2, R = 7.3
  const cells = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const d = Math.hypot(x - cx, y - cy)
      let type = null
      if (d <= R && d > R - 1.6) type = 'crust'
      else if (d <= R - 1.6) type = 'base'
      cells.push({ x, y, d, type })
    }
  }
  return cells
})()
export const TOPPING_SLOTS = BASE_MASK.filter(c => c.type === 'base')

export function buildPizzaVisual(ingKeys) {
  const sortedKeys = ingKeys.slice().sort()
  const seedStr = sortedKeys.join('|') || 'plain'
  const rand = rngFromSeed(seedStr)
  const cheeseNoise = {}
  BASE_MASK.forEach(c => { if (c.type === 'base') cheeseNoise[c.x + ',' + c.y] = rand() < 0.14 })
  const slotsShuffled = [...TOPPING_SLOTS]
  for (let i = slotsShuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[slotsShuffled[i], slotsShuffled[j]] = [slotsShuffled[j], slotsShuffled[i]]
  }
  const placed = {}
  let ptr = 0
  const perTopping = Math.max(2, Math.floor(slotsShuffled.length / Math.max(1, sortedKeys.length * 3)))
  sortedKeys.forEach(k => {
    const color = ING_MAP[k] ? ING_MAP[k].color : '#999'
    for (let n = 0; n < perTopping && ptr < slotsShuffled.length; n++) {
      placed[slotsShuffled[ptr].x + ',' + slotsShuffled[ptr].y] = color
      ptr++
    }
  })
  return { cheeseNoise, placed }
}

export function drawPizza(ctx, ingKeys, canvasSize) {
  const visual = buildPizzaVisual(ingKeys)
  const scale = canvasSize / GRID
  ctx.clearRect(0, 0, canvasSize, canvasSize)
  ctx.imageSmoothingEnabled = false
  const crustColor = '#e0a94f', crustShade = '#b8813a'
  const sauceColor = '#8a1f2b', cheeseColor = '#f5d76e'
  BASE_MASK.forEach(c => {
    if (!c.type) return
    let color
    if (c.type === 'crust') color = (Math.floor(c.d * 3) % 2 === 0) ? crustColor : crustShade
    else color = visual.cheeseNoise[c.x + ',' + c.y] ? sauceColor : cheeseColor
    ctx.fillStyle = color
    ctx.fillRect(c.x * scale, c.y * scale, Math.ceil(scale), Math.ceil(scale))
  })
  Object.keys(visual.placed).forEach(key => {
    const [x, y] = key.split(',').map(Number)
    ctx.fillStyle = visual.placed[key]
    ctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale))
  })
}
