import assert from 'node:assert/strict'
import { cookingTimeForIngredients, COOK_TIME_MAX_MS } from '../src/composables/utils/cookingTime.js'

const commonPair = cookingTimeForIngredients(['pepperoni', 'mushroom'])
const rarePair = cookingTimeForIngredients(['truffle', 'anchovy'])
const legendaryPair = cookingTimeForIngredients(['quantumcheese', 'goldflake'])
const mixedFive = cookingTimeForIngredients(['pepperoni', 'mushroom', 'truffle', 'quantumcheese', 'goldflake'])

assert.equal(cookingTimeForIngredients([]), 0, 'empty selection has no cooking time')
assert.ok(commonPair >= 2400, 'common pair has a visible cooking time')
assert.ok(rarePair > commonPair, 'rare ingredients cook longer than common ingredients')
assert.ok(legendaryPair > rarePair, 'legendary ingredients cook longer than rare ingredients')
assert.ok(mixedFive > legendaryPair, 'more complex recipes add cooking time')
assert.ok(mixedFive <= COOK_TIME_MAX_MS, 'cooking time is capped')

console.log('cookingTimeForIngredients tests passed')
