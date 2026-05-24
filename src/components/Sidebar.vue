<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  items,
  facilities,
  getRecipesByFacility,
  getRecipesByOutput,
  getRecipesByInput,
  getItemIconUrl,
  getFacilityIconUrl,
} from '@/data'
import { getRecipeLabel, getRecipeTransportHint } from '@/utils/recipe-label'
import type { Recipe, ProductionNode } from '@/types'

const props = defineProps<{
  onAddSupply: (itemId: string, position: { x: number; y: number }) => void
  onAddFacility: (facilityId: string, recipeId: string, position: { x: number; y: number }) => void
  onAddSink: (
    itemId: string,
    position: { x: number; y: number },
    purpose: 'demand' | 'disposal',
  ) => void
  /** Currently selected node on the canvas, or null. */
  selectedNode: ProductionNode | null
}>()

const { t } = useI18n()

// ---- Tab state ----
type Tab = 'demand' | 'recipe' | 'supply'
const activeTab = ref<Tab>('demand')
const search = ref('')

// ---- Context-aware focus: react to selected node ----

watch(
  () => props.selectedNode,
  (node) => {
    if (!node) return

    // Clear any manual search — we're navigating by context
    search.value = ''

    switch (node.type) {
      case 'supply':
        // "I'm providing this item" → show supply tab, scroll to it
        activeTab.value = 'supply'
        scrollToItem(node.itemId)
        break
      case 'facility':
        // "I'm this machine" → show recipe tab, expand this facility
        activeTab.value = 'recipe'
        expandedFacility.value = node.facilityId
        scrollToFacility(node.facilityId)
        break
      case 'sink':
        if (node.purpose === 'demand') {
          // "I need this item" → show demand tab, scroll to it
          activeTab.value = 'demand'
          scrollToItem(node.itemId)
        } else {
          // "I'm disposing this byproduct" → show recipe tab, expand machines that consume it
          activeTab.value = 'recipe'
          const consumers = getRecipesByInput(node.itemId)
          if (consumers.length > 0) {
            expandedFacility.value = consumers[0]!.facilityId
            scrollToFacility(consumers[0]!.facilityId)
          }
        }
        break
    }
  },
)

// ---- Scroll helpers ----

function scrollToItem(itemId: string) {
  nextTick(() => {
    // eslint-disable-next-line no-undef
    const el = document.getElementById(`sidebar-item-${itemId}`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

function scrollToFacility(facilityId: string) {
  nextTick(() => {
    // eslint-disable-next-line no-undef
    const el = document.getElementById(`sidebar-facility-${facilityId}`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

// ---- Data: items relevant to users (no intermediate bottle clutter) ----

/** Items users actually care about: not intermediate (asTarget !== false). */
const relevantItems = computed(() => {
  const q = search.value.toLowerCase()
  return items
    .filter((i) => i.asTarget !== false)
    .filter((i) => {
      if (!q) return true
      const name = t(`item.${i.id}`).toLowerCase()
      return name.includes(q) || i.id.toLowerCase().includes(q)
    })
})

/** Group items by category for structured display. */
interface ItemGroup {
  label: string
  items: (typeof items)[0][]
}

const supplyGroups = computed((): ItemGroup[] => {
  const groups: { label: string; test: (i: (typeof items)[0]) => boolean }[] = [
    { label: '固体', test: (i) => i.transportType !== 'pipe' },
    { label: '流体', test: (i) => i.transportType === 'pipe' },
  ]
  return groups
    .map((g) => ({ label: g.label, items: relevantItems.value.filter(g.test) }))
    .filter((g) => g.items.length > 0)
})

const demandGroups = computed((): ItemGroup[] => {
  const groups: { label: string; test: (i: (typeof items)[0]) => boolean }[] = [
    { label: '固体', test: (i) => i.transportType !== 'pipe' },
    { label: '流体', test: (i) => i.transportType === 'pipe' },
  ]
  return groups
    .map((g) => ({ label: g.label, items: relevantItems.value.filter(g.test) }))
    .filter((g) => g.items.length > 0)
})

// ---- Data: recipes grouped by facility ----

interface RecipeEntry {
  recipeId: string
  facilityId: string
  facilityName: string
  label: string
  shortLabel: string
  transportHint: 'pipe' | 'belt' | 'mixed'
}

interface FacilityGroup {
  facilityId: string
  facilityName: string
  recipes: RecipeEntry[]
}

function buildRecipeEntry(recipe: Recipe): RecipeEntry | null {
  const label = getRecipeLabel(recipe.id, t)
  if (!label) return null
  return {
    recipeId: recipe.id,
    facilityId: recipe.facilityId,
    facilityName: t(`facility.${recipe.facilityId}`),
    label: label.full,
    shortLabel: label.short,
    transportHint: getRecipeTransportHint(recipe.id),
  }
}

const facilityGroups = computed((): FacilityGroup[] => {
  const q = search.value.toLowerCase()
  const groups: FacilityGroup[] = []

  for (const facility of facilities) {
    const facilityName = t(`facility.${facility.id}`)
    const facRecipes = getRecipesByFacility(facility.id)

    const matchedRecipes: RecipeEntry[] = []
    for (const recipe of facRecipes) {
      const entry = buildRecipeEntry(recipe)
      if (!entry) continue

      if (!q) {
        matchedRecipes.push(entry)
        continue
      }

      const label = getRecipeLabel(recipe.id, t)
      const searchable = [
        entry.label,
        entry.facilityName,
        recipe.id,
        facility.id,
        ...(label?.inputNames ?? []),
        ...(label?.outputNames ?? []),
      ]
        .join(' ')
        .toLowerCase()

      if (searchable.includes(q)) {
        matchedRecipes.push(entry)
      }
    }

    if (matchedRecipes.length > 0) {
      groups.push({ facilityId: facility.id, facilityName, recipes: matchedRecipes })
    }
  }

  return groups
})

// ---- Expanded facility in recipe tab ----
const expandedFacility = ref<string | null>(null)

// ---- Inline recipe picker in demand tab ----
const pickerItemId = ref<string | null>(null)

const pickerRecipes = computed((): RecipeEntry[] => {
  if (!pickerItemId.value) return []
  return getRecipesByOutput(pickerItemId.value)
    .map((r) => buildRecipeEntry(r))
    .filter((e): e is RecipeEntry => e !== null)
})

// ---- Highlighted item/facility (from selection) ----

const highlightedItemId = computed(() => {
  const node = props.selectedNode
  if (!node) return null
  if (node.type === 'supply') return node.itemId
  if (node.type === 'sink') return node.itemId
  return null
})

const highlightedFacilityId = computed(() => {
  const node = props.selectedNode
  if (!node) return null
  if (node.type === 'facility') return node.facilityId
  if (node.type === 'sink' && node.purpose === 'disposal') {
    // Highlight facilities that consume this item
    const consumers = getRecipesByInput(node.itemId)
    return consumers.length === 1 ? consumers[0]!.facilityId : null
  }
  return null
})

// ---- Actions ----

function selectSupply(itemId: string) {
  props.onAddSupply(itemId, { x: 100, y: 300 })
}

function selectRecipe(facilityId: string, recipeId: string) {
  props.onAddFacility(facilityId, recipeId, { x: 400, y: 300 })
}

function addDemandSink(itemId: string) {
  // Add the sink
  props.onAddSink(itemId, { x: 700, y: 300 }, 'demand')

  // Then show inline recipe picker: "how is this item produced?"
  const recipes = getRecipesByOutput(itemId)

  if (recipes.length === 1) {
    // Auto-select: only one recipe makes this item → add facility directly
    const recipe = recipes[0]!
    selectRecipe(recipe.facilityId, recipe.id)
  } else if (recipes.length > 1) {
    // Multiple recipes: show inline picker
    pickerItemId.value = itemId
  }
  // If no recipes (raw resource), user needs to add Supply manually
}

function addDisposalSink(itemId: string) {
  props.onAddSink(itemId, { x: 700, y: 300 }, 'disposal')
}

function pickRecipe(entry: RecipeEntry) {
  selectRecipe(entry.facilityId, entry.recipeId)
  pickerItemId.value = null
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'demand', label: '需求' },
  { key: 'recipe', label: '配方' },
  { key: 'supply', label: '供给' },
]
</script>

<template>
  <aside class="sidebar">
    <!-- Tabs -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab-btn', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Search -->
    <input v-model="search" class="search" placeholder="搜索..." />

    <!-- ════════════════════════════════════════════ -->
    <!-- Demand tab: "我要什么" → add Sink + auto-chain -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'demand'" class="tab-content">
      <div v-for="group in demandGroups" :key="group.label" class="item-group">
        <div class="group-header">{{ group.label }}</div>
        <ul class="item-list">
          <li
            v-for="item in group.items"
            :id="`sidebar-item-${item.id}`"
            :key="item.id"
            :class="{ highlighted: highlightedItemId === item.id }"
          >
            <img :src="getItemIconUrl(item.id)" class="list-icon" />
            <span class="list-name">{{ t(`item.${item.id}`) }}</span>
            <div class="sink-actions">
              <button class="sink-btn demand" @click="addDemandSink(item.id)">需</button>
              <button
                v-if="item.transportType === 'pipe'"
                class="sink-btn disposal"
                @click="addDisposalSink(item.id)"
              >
                排
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Inline recipe picker overlay -->
      <div v-if="pickerItemId && pickerRecipes.length > 0" class="picker-overlay">
        <div class="picker-header">
          <span>生产「{{ t(`item.${pickerItemId}`) }}」的配方</span>
          <button class="picker-close" @click="pickerItemId = null">×</button>
        </div>
        <ul class="item-list">
          <li
            v-for="entry in pickerRecipes"
            :key="entry.recipeId"
            class="recipe-entry"
            @click="pickRecipe(entry)"
          >
            <img :src="getFacilityIconUrl(entry.facilityId)" class="list-icon" />
            <div class="recipe-info">
              <span class="recipe-label">{{ entry.shortLabel }}</span>
              <span class="recipe-facility">{{ entry.facilityName }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- Recipe tab: "怎么生产" → add Facility -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'recipe'" class="tab-content">
      <div v-for="group in facilityGroups" :key="group.facilityId" class="item-group">
        <div
          :id="`sidebar-facility-${group.facilityId}`"
          :class="[
            'group-header clickable',
            { highlighted: highlightedFacilityId === group.facilityId },
          ]"
          @click="
            expandedFacility = expandedFacility === group.facilityId ? null : group.facilityId
          "
        >
          <span class="expand-icon">{{ expandedFacility === group.facilityId ? '▾' : '▸' }}</span>
          <img :src="getFacilityIconUrl(group.facilityId)" class="group-icon" />
          {{ group.facilityName }}
          <span class="group-count">{{ group.recipes.length }}</span>
        </div>
        <ul v-if="expandedFacility === group.facilityId" class="item-list">
          <li
            v-for="entry in group.recipes"
            :key="entry.recipeId"
            class="recipe-entry"
            @click="selectRecipe(entry.facilityId, entry.recipeId)"
          >
            <div class="recipe-info">
              <span class="recipe-label">{{ entry.shortLabel }}</span>
            </div>
            <span v-if="entry.transportHint === 'pipe'" class="list-badge pipe">pipe</span>
            <span v-else-if="entry.transportHint === 'mixed'" class="list-badge mixed">mixed</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ════════════════════════════════════════════ -->
    <!-- Supply tab: "原料从哪来" → add Supply -->
    <!-- ════════════════════════════════════════════ -->
    <div v-if="activeTab === 'supply'" class="tab-content">
      <div v-for="group in supplyGroups" :key="group.label" class="item-group">
        <div class="group-header">{{ group.label }}</div>
        <ul class="item-list">
          <li
            v-for="item in group.items"
            :id="`sidebar-item-${item.id}`"
            :key="item.id"
            :class="{ highlighted: highlightedItemId === item.id }"
            @click="selectSupply(item.id)"
          >
            <img :src="getItemIconUrl(item.id)" class="list-icon" />
            <span class="list-name">{{ t(`item.${item.id}`) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 260px;
  min-width: 260px;
  background: #111;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-bar {
  display: flex;
  border-bottom: 1px solid #333;
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  background: transparent;
  border: none;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.tab-btn:hover {
  color: #ededed;
}

.tab-btn.active {
  color: #42b883;
  border-bottom-color: #42b883;
}

.search {
  margin: 8px;
  padding: 8px 10px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ededed;
  font-size: 13px;
  outline: none;
}

.search:focus {
  border-color: #42b883;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

/* ---- Item groups ---- */

.item-group {
  border-bottom: 1px solid #222;
}

.group-header {
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-header.clickable {
  cursor: pointer;
  color: #999;
}

.group-header.clickable:hover {
  color: #ededed;
  background: #151515;
}

.group-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.expand-icon {
  font-size: 10px;
  width: 10px;
}

.group-count {
  margin-left: auto;
  font-size: 9px;
  color: #555;
  background: #1a1a1a;
  padding: 1px 5px;
  border-radius: 8px;
}

/* ---- Item list ---- */

.item-list {
  list-style: none;
  padding: 2px 8px 4px;
  margin: 0;
}

.item-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.1s;
}

.item-list li:hover {
  background: #1a2a1a;
}

/* ---- Highlighted (context-matched) items ---- */

li.highlighted {
  background: #1a2a1a;
  outline: 1px solid #42b883;
  outline-offset: -1px;
}

.group-header.highlighted {
  color: #42b883;
  background: #112211;
}

/* ---- List elements ---- */

.list-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  flex-shrink: 0;
}

.list-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.list-badge {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.list-badge.pipe {
  background: #1a2a3a;
  color: #4a9eff;
}

.list-badge.mixed {
  background: #2a1a2a;
  color: #b070d0;
}

/* ---- Recipe entry ---- */

.recipe-entry {
  padding-left: 20px !important;
}

.recipe-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.recipe-label {
  font-size: 12px;
  color: #ededed;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-facility {
  font-size: 10px;
  color: #888;
}

/* ---- Sink actions ---- */

.sink-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.sink-btn {
  min-width: 24px;
  height: 22px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.sink-btn.demand {
  background: #1a2a3a;
  color: #4a9eff;
}

.sink-btn.demand:hover {
  background: #2a3a4a;
}

.sink-btn.disposal {
  background: #3a1a1a;
  color: #ff8c42;
}

.sink-btn.disposal:hover {
  background: #4a2a2a;
}

/* ---- Inline recipe picker ---- */

.picker-overlay {
  position: sticky;
  bottom: 0;
  background: #181818;
  border-top: 1px solid #42b883;
  padding: 4px 0;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  font-size: 11px;
  color: #42b883;
  font-weight: 600;
}

.picker-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.picker-close:hover {
  color: #ededed;
}
</style>
