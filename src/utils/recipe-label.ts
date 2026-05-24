/**
 * Auto-generated recipe display labels.
 *
 * Recipes are not hand-translated — their names are composed from
 * the i18n item names of their inputs and outputs.
 *
 * Example: "赤铜矿+清水 → 赤铜块+污水"
 */

import { getRecipe, getItem } from '@/data'

type TranslateFn = (key: string) => string

/**
 * Get the i18n name for an item. Falls back to the raw item ID.
 */
function itemName(t: TranslateFn, itemId: string): string {
  const key = `item.${itemId}`
  const translated = t(key)
  // vue-i18n returns the key itself when no translation exists
  return translated === key ? itemId : translated
}

/**
 * Format an item list as a compact label.
 * Single item: "赤铜块"
 * Multiple items: "赤铜矿+清水"
 */
function formatItemList(t: TranslateFn, items: { itemId: string; amount: number }[]): string {
  if (items.length === 0) return '—'
  return items.map((i) => itemName(t, i.itemId)).join('+')
}

export interface RecipeLabel {
  /** Full label: "赤铜矿+清水 → 赤铜块+污水" */
  full: string
  /** Short label (outputs only): "赤铜块+污水" */
  short: string
  /** Input item names: ["赤铜矿", "清水"] */
  inputNames: string[]
  /** Output item names: ["赤铜块", "污水"] */
  outputNames: string[]
}

/**
 * Generate a human-readable label for a recipe.
 *
 * @param recipeId - The recipe ID to look up
 * @param t - vue-i18n translation function
 * @returns Label object, or null if recipe not found
 */
export function getRecipeLabel(recipeId: string, t: TranslateFn): RecipeLabel | null {
  const recipe = getRecipe(recipeId)
  if (!recipe) return null

  const inputNames = recipe.inputs.map((i) => itemName(t, i.itemId))
  const outputNames = recipe.outputs.map((i) => itemName(t, i.itemId))

  const inputPart = formatItemList(t, recipe.inputs)
  const outputPart = formatItemList(t, recipe.outputs)

  return {
    full: `${inputPart} → ${outputPart}`,
    short: outputPart,
    inputNames,
    outputNames,
  }
}

/**
 * Get the transport type indicator for a recipe's outputs.
 * Returns 'pipe' if all outputs are pipe-transported, 'belt' otherwise.
 */
export function getRecipeTransportHint(recipeId: string): 'pipe' | 'belt' | 'mixed' {
  const recipe = getRecipe(recipeId)
  if (!recipe) return 'belt'

  const allItems = [...recipe.inputs, ...recipe.outputs]
  const types = new Set(allItems.map((ri) => getItem(ri.itemId)?.transportType ?? 'belt'))

  if (types.size === 1) return types.values().next().value as 'pipe' | 'belt'
  return 'mixed'
}
