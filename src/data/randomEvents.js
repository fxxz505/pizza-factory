// 5 种随机事件：每 40s 检定一次，12% 概率触发其一（逻辑见 useRandomEvents.js）
export const RANDOM_EVENTS = [
  { text: '服务器过热！生产速率翻倍 20 秒。', apply: s => { s.buffUntil = Date.now() + 20000; s.buffMult = 2 } },
  { text: '虚拟外卖员 AI 短路，掉落了一笔字节补偿。', apply: s => { const g = Math.max(20, s.bytes * 0.05); s.bytes += g } },
  { text: '脑内老鼠偷吃了一部分想象披萨，损失少量字节。', apply: s => { const l = Math.min(s.bytes * 0.05, 200); s.bytes -= Math.max(0, l) } },
  { text: '官方声明：本次更新纯属虚构，但字节是真的。空投字节一份。', apply: s => { const g = 50 + Math.random() * 100; s.bytes += g } },
  { text: '量子烤箱进入超频模式，点击强度暂时 +5，持续 15 秒。', apply: s => { s.clickBuffUntil = Date.now() + 15000; s.clickBuffAdd = 5 } },
]
