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

/** Find all recipes for a given facility. */
export function getRecipesByFacility(facilityId: string): Recipe[] {
  return recipes.filter((r) => r.facilityId === facilityId)
}

// ---------------------------------------------------------------------------
// Icon URLs (derived from ID convention)
// ---------------------------------------------------------------------------

/** Base path for static assets, matches Vite's base config. */
const BASE = import.meta.env.BASE_URL ?? '/'

/** Get the icon URL for an item by its ID. */
export function getItemIconUrl(itemId: string): string {
  return `${BASE}images/items/${itemId}.png`
}

/** Get the icon URL for a facility by its ID. */
export function getFacilityIconUrl(facilityId: string): string {
  return `${BASE}images/facilities/${facilityId}.png`
}

export { items, recipes, facilities }
