import { items } from './items'
import { recipes } from './recipes'
import { facilities } from './facilities'

import type { Item, Recipe, Facility } from '@/types'

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const itemMap = new Map<string, Item>(items.map((i) => [i.id, i]))
const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]))
const facilityMap = new Map<string, Facility>(facilities.map((f) => [f.id, f]))

/** Get an item by ID. */
export function getItem(id: string): Item | undefined {
  return itemMap.get(id)
}

/** Get a recipe by ID. */
export function getRecipe(id: string): Recipe | undefined {
  return recipeMap.get(id)
}

/** Get a facility by ID. */
export function getFacility(id: string): Facility | undefined {
  return facilityMap.get(id)
}

/** Find all recipes that produce a given item. */
export function getRecipesByOutput(itemId: string): Recipe[] {
  return recipes.filter((r) => r.outputs.some((o) => o.itemId === itemId))
}

/** Find all recipes that consume a given item. */
export function getRecipesByInput(itemId: string): Recipe[] {
  return recipes.filter((r) => r.inputs.some((i) => i.itemId === itemId))
}

/** Find all recipes for a given facility. */
export function getRecipesByFacility(facilityId: string): Recipe[] {
  return recipes.filter((r) => r.facilityId === facilityId)
}

export { items, recipes, facilities }
