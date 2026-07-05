import assert from 'node:assert/strict'
import { defaultState } from '../src/composables/useGameState.js'
import { doSinglePull, doTenPull } from '../src/composables/useGacha.js'

const originalRandom = Math.random
try {
  Math.random = () => 0.01

  const singleState = defaultState()
  singleState.bytes = 10000
  const single = doSinglePull(singleState)
  assert.equal(single.results.length, 1, 'single pull returns one result')
  assert.ok(single.results[0].isNew, 'first ingredient is marked as new')
  assert.ok(singleState.knownIngredients[single.results[0].ing.key], 'new ingredient is persisted in knownIngredients')
  assert.equal(singleState.gachaHistory.length, 1, 'single pull is persisted in history')
  assert.ok(singleState.stats.gachaSpent > 0, 'single pull cost is persisted')

  const tenState = defaultState()
  tenState.bytes = 10000
  const ten = doTenPull(tenState)
  assert.equal(ten.results.length, 10, 'ten pull returns ten results')
  assert.ok(ten.results.some(r => r.tierIdx >= 2), 'ten pull guarantees at least one rare-or-better ingredient')
  assert.equal(tenState.gachaHistory.length, 1, 'ten pull is persisted in history')
  assert.ok(ten.summary.rareCount >= 1, 'ten pull summary counts rare-or-better result')
} finally {
  Math.random = originalRandom
}

console.log('gacha tests passed')