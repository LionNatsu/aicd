/**
 * Prebuild script: download game assets from aicd-data GitHub repo.
 * Run: bun run prebuild
 *
 * In CI, this runs automatically before build.
 * Locally, run once after clone: `bun run prebuild`
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const AICD_DATA_REPO = 'LionNatsu/aicd-data'
const ROOT = join(import.meta.dir, '..')
const PUBLIC_IMAGES = join(ROOT, 'public/images')
const SRC_DATA = join(ROOT, 'src/data')
const SRC_I18N = join(ROOT, 'src/i18n/zh-Hans')

// ---------------------------------------------------------------------------
// Skip check: if all assets exist, skip download
// ---------------------------------------------------------------------------
const itemsDir = join(PUBLIC_IMAGES, 'items')
const facilitiesDir = join(PUBLIC_IMAGES, 'facilities')

const imagesExist =
  existsSync(itemsDir) && readdirSync(itemsDir).length > 100 && existsSync(facilitiesDir)

const dataExists =
  existsSync(join(SRC_DATA, 'items.json')) &&
  existsSync(join(SRC_DATA, 'recipes.json')) &&
  existsSync(join(SRC_DATA, 'facilities.json'))

const i18nExists =
  existsSync(join(SRC_I18N, 'item.json')) && existsSync(join(SRC_I18N, 'facility.json'))

if (imagesExist && dataExists && i18nExists) {
  console.log('All assets already exist, skipping download.')
  process.exit(0)
}

console.log(`Downloading assets from ${AICD_DATA_REPO}...`)

// Clone aicd-data repo shallowly to a temp dir
const tmpDir = join(ROOT, '.aicd-data-tmp')
if (existsSync(tmpDir)) {
  rmSync(tmpDir, { recursive: true, force: true })
}

execSync(`git clone --depth 1 https://github.com/${AICD_DATA_REPO}.git "${tmpDir}"`, {
  stdio: 'inherit',
})

// ---------------------------------------------------------------------------
// Copy images → public/images/
// ---------------------------------------------------------------------------
mkdirSync(itemsDir, { recursive: true })
mkdirSync(facilitiesDir, { recursive: true })

cpSync(join(tmpDir, 'images/items'), itemsDir, { recursive: true, force: true })
cpSync(join(tmpDir, 'images/facilities'), facilitiesDir, { recursive: true, force: true })

// ---------------------------------------------------------------------------
// Copy data JSON → src/data/
// ---------------------------------------------------------------------------
mkdirSync(SRC_DATA, { recursive: true })

cpSync(join(tmpDir, 'data/items.json'), join(SRC_DATA, 'items.json'), { force: true })
cpSync(join(tmpDir, 'data/recipes.json'), join(SRC_DATA, 'recipes.json'), { force: true })
cpSync(join(tmpDir, 'data/facilities.json'), join(SRC_DATA, 'facilities.json'), { force: true })

// ---------------------------------------------------------------------------
// Copy i18n JSON → src/i18n/zh-Hans/
// ---------------------------------------------------------------------------
mkdirSync(SRC_I18N, { recursive: true })

cpSync(join(tmpDir, 'i18n/zh-Hans/item.json'), join(SRC_I18N, 'item.json'), { force: true })
cpSync(join(tmpDir, 'i18n/zh-Hans/facility.json'), join(SRC_I18N, 'facility.json'), { force: true })

// ---------------------------------------------------------------------------
// Clean up
// ---------------------------------------------------------------------------
rmSync(tmpDir, { recursive: true, force: true })

const imgItems = readdirSync(itemsDir).length
const imgFacilities = readdirSync(facilitiesDir).length

console.log(`Done: ${imgItems} item icons, ${imgFacilities} facility icons, data JSON + i18n JSON.`)
