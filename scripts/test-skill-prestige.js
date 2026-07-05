import assert from 'node:assert/strict'
import { defaultState } from '../src/composables/useGameState.js'
import { RESEARCH_DEFS, canBuyResearch, researchLevel } from '../src/composables/useEconomy.js'
import { awardSkillPointsForRecipe, performPrestige, prestigeReady } from '../src/composables/usePrestige.js'
import { GEN_DEFS } from '../src/data/genDefs.js'

const state = defaultState()
const recipe = { id: 'test_pizza' }

let gain = awardSkillPointsForRecipe(state, recipe, 4)
assert.equal(gain.gained, 4, 'first unique recipe grants stars as skill points')
assert.equal(state.skillPoints, 4, 'available skill points increase')
assert.equal(state.totalSkillPointsEarned, 4, 'lifetime skill points increase')

gain = awardSkillPointsForRecipe(state, recipe, 4)
assert.equal(gain.gained, 0, 'duplicate recipe grants no skill points')
assert.equal(state.skillPoints, 4, 'duplicate does not change available points')

const clickCore = RESEARCH_DEFS.find(def => def.key === 'clickCore')
const critSpark = RESEARCH_DEFS.find(def => def.key === 'critSpark')
assert.equal(canBuyResearch(state, clickCore), true, 'root skill can be bought with points')
assert.equal(canBuyResearch(state, critSpark), false, 'dependent skill is locked before prerequisite')

state.research.clickCore = 2
assert.equal(canBuyResearch(state, critSpark), true, 'dependent skill unlocks after prerequisite')
assert.equal(researchLevel(state, 'clickCore'), 2)

for (let i = 0; i < 11; i++) {
  awardSkillPointsForRecipe(state, { id: 'test_extra_' + i }, 2)
}
assert.equal(prestigeReady(state), true, 'prestige unlocks after enough unique recipes and points')

state.bytes = 9999
state.gens[GEN_DEFS[0].key] = 3
state.inventory.pepperoni = 2
state.dex.some = { ts: Date.now(), rarity: 0 }
const result = performPrestige(state)
assert.equal(result.level, 1, 'prestige increments level')
assert.equal(state.bytes, 0, 'prestige resets bytes')
assert.equal(state.gens[GEN_DEFS[0].key], 0, 'prestige resets generators')
assert.equal(Object.keys(state.inventory).length, 0, 'prestige clears inventory')
assert.equal(Object.keys(state.dex).length, 0, 'prestige clears current dex')
assert.equal(state.research.clickCore, 2, 'prestige keeps skill tree')
assert.equal(state.totalSkillPointsEarned > 0, true, 'prestige keeps lifetime skill point records')
assert.equal(prestigeReady(state), false, 'prestige requires new progress after a reset')

console.log('skill prestige tests passed')
