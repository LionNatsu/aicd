/**
 * Prebuild script: download game assets from aicd-data GitHub repo.
 * Run: bun run prebuild
 *
 * In CI, this runs automatically before build.
 * Locally, run once after clone: `bun run prebuild`
 */
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const AICD_DATA_REPO = 'LionNatsu/aicd-data'
const ROOT = join(import.meta.dir, '..')
const PUBLIC_IMAGES = join(ROOT, 'public/images')

// Check if images already exist
const itemsDir = join(PUBLIC_IMAGES, 'items')
const facilitiesDir = join(PUBLIC_IMAGES, 'facilities')

if (existsSync(itemsDir) && existsSync(facilitiesDir)) {
  const itemCount = readdirSync(itemsDir).length
  if (itemCount > 100) {
    console.log(`Images already exist (${itemCount} items), skipping download.`)
    process.exit(0)
  }
}

console.log(`Downloading assets from ${AICD_DATA_REPO}...`)

// Clone aicd-data repo shallowly to a temp dir
const tmpDir = join(ROOT, '.aicd-data-tmp')
if (existsSync(tmpDir)) {
  execSync(`rm -rf "${tmpDir}"`)
}

execSync(`git clone --depth 1 https://github.com/${AICD_DATA_REPO}.git "${tmpDir}"`, {
  stdio: 'inherit',
})

// Copy images to public/
mkdirSync(itemsDir, { recursive: true })
mkdirSync(facilitiesDir, { recursive: true })

execSync(`cp -r "${tmpDir}/images/items/"* "${itemsDir}/"`)
execSync(`cp -r "${tmpDir}/images/facilities/"* "${facilitiesDir}/"`)

// Clean up
execSync(`rm -rf "${tmpDir}"`)

const items = readdirSync(itemsDir).length
const facilities = readdirSync(facilitiesDir).length

console.log(`Done: ${items} item icons, ${facilities} facility icons.`)
