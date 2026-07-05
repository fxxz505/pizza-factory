#!/usr/bin/env node
/**
 * generate-recipes.js
 * -----------------------------------------------------------------
 * 构建时一次性生成"全量配方表"：把 20 种原料的全部 2/3/4/5 件组合
 * (C(20,2)+C(20,3)+C(20,4)+C(20,5) = 190+1140+4845+15504 = 21679 条)
 * 都变成一条有名字、有稀有度的固定配方记录，写死到
 * src/data/recipes.generated.js 里（数组，运行时不再现算）。
 *
 * 用法：node scripts/generate-recipes.js
 * -----------------------------------------------------------------
 */
const fs = require('fs');
const path = require('path');

const INGREDIENTS = [
  {key:'pepperoni', name:'辣香肠', tier:0},
  {key:'mushroom', name:'蘑菇', tier:0},
  {key:'greenpepper', name:'青椒', tier:0},
  {key:'onion', name:'洋葱', tier:0},

  {key:'olive', name:'橄榄', tier:1},
  {key:'bacon', name:'培根', tier:1},
  {key:'corn', name:'玉米粒', tier:1},
  {key:'ham', name:'火腿', tier:1},

  {key:'basil', name:'罗勒', tier:2},
  {key:'pineapple', name:'菠萝', tier:2},
  {key:'garlic', name:'蒜片', tier:2},
  {key:'shrimp', name:'虾仁', tier:2},

  {key:'truffle', name:'松露', tier:3},
  {key:'anchovy', name:'凤尾鱼', tier:3},
  {key:'chili', name:'魔鬼辣椒', tier:3},
  {key:'blackgarlic', name:'黑蒜', tier:3},

  {key:'quantumcheese', name:'量子芝士', tier:4},
  {key:'glowbit', name:'发光碎片', tier:4},
  {key:'stardust', name:'星尘番茄', tier:4},
  {key:'goldflake', name:'黄金箔片', tier:4}
];
const ING_MAP = {};
INGREDIENTS.forEach(i => ING_MAP[i.key] = i);

function* combinations(arr, k, start = 0, combo = []) {
  if (combo.length === k) { yield combo.slice(); return; }
  for (let i = start; i < arr.length; i++) {
    combo.push(arr[i]);
    yield* combinations(arr, k, i + 1, combo);
    combo.pop();
  }
}

function scoreCombo(ingKeys) {
  const tiers = ingKeys.map(k => ING_MAP[k].tier);
  const sum = tiers.reduce((a, b) => a + b, 0);
  const avg = sum / tiers.length;
  const maxTier = Math.max(...tiers);
  const t4count = tiers.filter(t => t === 4).length;
  const t3plusCount = tiers.filter(t => t >= 3).length;
  const n = ingKeys.length;
  let score = avg * 22;
  score += (n - 2) * 6;
  score += t4count * 14;
  score += t3plusCount * 5;
  if (maxTier === 4 && tiers.every(t => t === 4)) score += 20;
  return score;
}

function rarityFromScore(score) {
  // 阈值经过对全部 21679 条组合的 score 分布做百分位校准，
  // 复刻原游戏 INGREDIENT_WEIGHTS=[45,28,16,8,3] 的金字塔型分布。
  if (score < 77.2) return 0;    // common   ~45%
  if (score < 99.8) return 1;    // uncommon ~28%
  if (score < 118)  return 2;    // rare     ~16%
  if (score < 136.4) return 3;   // epic     ~8%
  return 4;                      // legendary ~3%
}

const RARITY_LABELS = ['普通', '优良', '稀有', '史诗', '传说'];

const FLAVOR_WORDS = [
  ['家常', '农家', '街头', '经典', '朴素', '简约', '田园', '日常'],
  ['优选', '精选', '匠心', '巧拼', '双味', '滋味', '风味', '手作'],
  ['稀珍', '秘制', '匠造', '珍藏', '限定', '臻选', '奇珍', '妙味'],
  ['王牌', '至臻', '尊享', '极', '烈焰', '暗黑', '禁忌', '巅峰'],
  ['至尊', '觉醒', '神话', '终极', '奇点', '无尽', '永恒', '涅槃']
];
const SUFFIX_WORDS = [
  ['双拼', '拼盘', '披萨', '小食', '组合'],
  ['风味披萨', '三重奏', '拼盘', '套餐', '滋味披萨'],
  ['盛宴', '风暴', '密令', '狂想曲', '协奏曲'],
  ['觉醒', '风暴·王座', '密码', '交响诗', '暴走'],
  ['·觉醒', '·降临', '·终焉', '·涅槃', '·奇点', '·神话']
];
const EPIC_MIDDLE = ['之', '·', '之巅·', '之心·'];

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }

function makeRand(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function mainWords(ingKeys) {
  const items = ingKeys.map(k => ING_MAP[k]).slice().sort((a, b) => b.tier - a.tier);
  const names = [];
  for (const it of items) {
    if (!names.includes(it.name)) names.push(it.name);
    if (names.length >= 2) break;
  }
  return names;
}

function genName(ingKeys, rarity, rand) {
  const mains = mainWords(ingKeys);
  const main1 = mains[0];
  const main2 = mains[1];
  const flavor = pick(rand, FLAVOR_WORDS[rarity]);
  const suffix = pick(rand, SUFFIX_WORDS[rarity]);

  if (rarity <= 1) {
    if (main2) return `${flavor}${main1}${main2}${suffix}`;
    return `${flavor}${main1}${suffix}`;
  }
  if (rarity === 2) {
    if (main2) return `${flavor}${main1}${main2}${suffix}`;
    return `${flavor}${main1}之${suffix}`;
  }
  const mid = pick(rand, EPIC_MIDDLE);
  if (main2) {
    return `${flavor}${main1}${mid}${main2}${suffix}`;
  }
  return `${flavor}${main1}${mid}王${suffix}`;
}

function main() {
  const keys = INGREDIENTS.map(i => i.key);
  const records = [];
  const sigSet = new Set();
  const rarityCounts = [0, 0, 0, 0, 0];
  const usedNames = new Map();

  let idCounter = 0;
  for (let k = 2; k <= 5; k++) {
    for (const combo of combinations(keys, k)) {
      const sorted = combo.slice().sort();
      const sig = sorted.join('+');
      if (sigSet.has(sig)) throw new Error('duplicate sig: ' + sig);
      sigSet.add(sig);

      const score = scoreCombo(sorted);
      const rarity = rarityFromScore(score);
      const rand = makeRand(sig);
      let name = genName(sorted, rarity, rand);

      if (usedNames.has(name)) {
        const n = usedNames.get(name) + 1;
        usedNames.set(name, n);
        const variantTag = ['', '·贰', '·叁', '·肆', '·伍', '·陆', '·柒', '·捌'][n] || `·${n}`;
        name = name + variantTag;
      } else {
        usedNames.set(name, 0);
      }

      idCounter++;
      const id = 'r' + idCounter.toString(36) + '_' + sig.replace(/[^a-z0-9]/gi, '').slice(0, 12);
      records.push({ id, name, ing: sorted, rarity, sig });
      rarityCounts[rarity]++;
    }
  }

  const EXPECT_TOTAL = 190 + 1140 + 4845 + 15504;
  if (records.length !== EXPECT_TOTAL) {
    throw new Error(`数量不符：期望 ${EXPECT_TOTAL}，实际 ${records.length}`);
  }
  if (sigSet.size !== records.length) throw new Error('sig 有重复冲突');
  for (const r of records) {
    if (r.ing.length < 2 || r.ing.length > 5) throw new Error('非法 ing 长度: ' + r.id);
    for (const k of r.ing) {
      if (!ING_MAP[k]) throw new Error('非法原料 key: ' + k + ' in ' + r.id);
    }
  }

  console.log('=== 生成校验通过 ===');
  console.log('总数:', records.length, '(期望', EXPECT_TOTAL, ')');
  console.log('稀有度分布:');
  RARITY_LABELS.forEach((label, i) => {
    const pct = (rarityCounts[i] / records.length * 100).toFixed(2);
    console.log(`  ${label}(${i}): ${rarityCounts[i]} (${pct}%)`);
  });

  let dupNameGroups = 0;
  for (const [, n] of usedNames) { if (n > 0) dupNameGroups++; }
  console.log('存在重名基底(经过变体去重):', dupNameGroups);

  const outDir = path.join(__dirname, '..', 'src', 'data');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'recipes.generated.js');

  const lines = [];
  lines.push('// 本文件由 scripts/generate-recipes.js 自动生成，请勿手工编辑。');
  lines.push('// 生成时间: ' + new Date().toISOString());
  lines.push('// 总数: ' + records.length + ' 条 (全部原料 2/3/4/5 件组合)');
  lines.push('export const RECIPES_GENERATED = [');
  for (const r of records) {
    const ingStr = JSON.stringify(r.ing);
    lines.push(`{id:${JSON.stringify(r.id)},name:${JSON.stringify(r.name)},ing:${ingStr},rarity:${r.rarity},sig:${JSON.stringify(r.sig)}},`);
  }
  lines.push('];');
  lines.push('');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log('已写出:', outPath);

  const sampleIdx = [];
  const rand2 = makeRand('sample-seed');
  while (sampleIdx.length < 15) {
    const idx = Math.floor(rand2() * records.length);
    if (!sampleIdx.includes(idx)) sampleIdx.push(idx);
  }
  console.log('\n=== 随机抽样预览 (15条) ===');
  sampleIdx.forEach(idx => {
    const r = records[idx];
    console.log(`[${RARITY_LABELS[r.rarity]}] ${r.name}  <- ${r.ing.map(k=>ING_MAP[k].name).join('+')}`);
  });
}

main();
