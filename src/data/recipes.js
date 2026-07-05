// 配方表 —— 数据层改动说明：
// 原版是手写的 24 条 RECIPES 数组，本迁移版改为使用构建期预生成的
// src/data/recipes.generated.js（21679 条，覆盖 20 种原料的全部 2/3/4/5 件组合）。
// 因为 sig（原料排序后用 '+' 连接的签名）在生成脚本里就是用与本文件
// 相同的排序+拼接算法算出来的，所以任意 2~5 件原料组合的 sig 在
// RECIPE_SIG_MAP 里必然能查到对应记录 —— 不再存在“未收录的创意披萨”分支。
import { RECIPES_GENERATED } from './recipes.generated.js'

export const RECIPES = RECIPES_GENERATED

// 用 Map 而不是普通对象：21679 条记录，Map 保证 O(1) 查找、没有原型链
// 属性名冲突/污染的风险（例如某个 sig 恰好等于 'constructor' 之类）。
export const RECIPE_SIG_MAP = new Map()
RECIPES.forEach(r => { RECIPE_SIG_MAP.set(r.sig, r) })
