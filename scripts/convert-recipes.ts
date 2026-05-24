/**
 * Convert endfield-calc recipes.ts (using enum constants like ItemId.ITEM_FOO)
 * into AICD format (using string literals like "item_foo").
 *
 * Run: bun run scripts/convert-recipes.ts
 * Output: writes to stdout
 */

// Parse enum mappings from constants file
function parseEnumConstants(src: string, enumName: string): Map<string, string> {
  const map = new Map<string, string>()
  const regex = new RegExp(`${enumName}\\.([A-Z0-9_]+)\\s*=\\s*"([^"]+)"`, 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(src)) !== null) {
    map.set(match[1], match[2])
  }
  return map
}

async function main() {
  const dir = import.meta.dir
  const constantsSrc = await Bun.file(`${dir}/_endfield-constants.ts`).text()
  const recipesSrc = await Bun.file(`${dir}/_endfield-recipes.ts`).text()

  const itemIdMap = parseEnumConstants(constantsSrc, 'ItemId')
  const recipeIdMap = parseEnumConstants(constantsSrc, 'RecipeId')
  const facilityIdMap = parseEnumConstants(constantsSrc, 'FacilityId')

  // Replace enum references with string literals
  let output = recipesSrc

  // Replace ItemId.ENUM_VALUE -> "actual_string_value"
  output = output.replace(/ItemId\.([A-Z0-9_]+)/g, (_, key) => {
    const value = itemIdMap.get(key)
    if (!value) console.error(`Warning: ItemId.${key} not found in constants`)
    return `"${value ?? key.toLowerCase()}"`
  })

  output = output.replace(/RecipeId\.([A-Z0-9_]+)/g, (_, key) => {
    const value = recipeIdMap.get(key)
    if (!value) console.error(`Warning: RecipeId.${key} not found in constants`)
    return `"${value ?? key.toLowerCase()}"`
  })

  output = output.replace(/FacilityId\.([A-Z0-9_]+)/g, (_, key) => {
    const value = facilityIdMap.get(key)
    if (!value) console.error(`Warning: FacilityId.${key} not found in constants`)
    return `"${value ?? key.toLowerCase()}"`
  })

  // Remove the import lines and replace with our import
  output = output.replace(/import.*from.*\n/g, '')
  output = `import type { Recipe } from '@/types'\n\n${output}`

  console.log(output)
}

main()
