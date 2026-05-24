<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { items, facilities, getRecipesByFacility } from '@/data'
import { getItemIconUrl, getFacilityIconUrl } from '@/data'

const props = defineProps<{
  onAddSupply: (itemId: string, position: { x: number; y: number }) => void
  onAddFacility: (facilityId: string, recipeId: string, position: { x: number; y: number }) => void
  onAddSink: (
    itemId: string,
    position: { x: number; y: number },
    purpose: 'demand' | 'disposal',
  ) => void
}>()

const { t } = useI18n()

type Tab = 'supply' | 'facility' | 'sink'
const activeTab = ref<Tab>('supply')
const search = ref('')

// All items — Supply and Sink are node roles, not item categories.
// Any item can be pulled from the Depot (Supply) or be a demand target (Sink).
const allItems = computed(() => {
  const q = search.value.toLowerCase()
  return items.filter((i) => {
    const name = t(`item.${i.id}`).toLowerCase()
    return !q || name.includes(q) || i.id.toLowerCase().includes(q)
  })
})

// Facilities with their recipes
const facilityList = computed(() => {
  const q = search.value.toLowerCase()
  return facilities
    .map((f) => ({
      id: f.id,
      name: t(`facility.${f.id}`),
      recipes: getRecipesByFacility(f.id),
    }))
    .filter((f) => {
      if (!q) return true
      return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
    })
})

// Expanded facility (showing recipe list)
const expandedFacility = ref<string | null>(null)

function selectSupply(itemId: string) {
  props.onAddSupply(itemId, { x: 100, y: 300 })
}

function selectRecipe(facilityId: string, recipeId: string) {
  props.onAddFacility(facilityId, recipeId, { x: 400, y: 300 })
  expandedFacility.value = null
}

function selectSink(itemId: string, purpose: 'demand' | 'disposal') {
  props.onAddSink(itemId, { x: 700, y: 300 }, purpose)
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'supply', label: 'Supply' },
  { key: 'facility', label: 'Facility' },
  { key: 'sink', label: 'Sink' },
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
    <input v-model="search" class="search" placeholder="Search..." />

    <!-- Supply tab -->
    <ul v-if="activeTab === 'supply'" class="item-list">
      <li
        v-for="item in allItems"
        :key="item.id"
        :class="{ intermediate: item.asTarget === false }"
        @click="selectSupply(item.id)"
      >
        <img :src="getItemIconUrl(item.id)" class="list-icon" />
        <span class="list-name">{{ t(`item.${item.id}`) }}</span>
        <span v-if="item.asTarget === false" class="list-badge intermediate-badge">
          intermediate
        </span>
        <span v-if="item.transportType === 'pipe'" class="list-badge pipe">pipe</span>
      </li>
    </ul>

    <!-- Facility tab -->
    <ul v-if="activeTab === 'facility'" class="item-list">
      <li
        v-for="fac in facilityList"
        :key="fac.id"
        @click="expandedFacility = expandedFacility === fac.id ? null : fac.id"
      >
        <img :src="getFacilityIconUrl(fac.id)" class="list-icon" />
        <span class="list-name">{{ fac.name }}</span>
      </li>
      <!-- Recipe sub-list -->
      <template v-if="expandedFacility">
        <li
          v-for="recipe in facilityList.find((f) => f.id === expandedFacility)?.recipes ?? []"
          :key="recipe.id"
          class="recipe-item"
          @click="selectRecipe(expandedFacility!, recipe.id)"
        >
          <span class="list-name">{{ recipe.id }}</span>
        </li>
      </template>
    </ul>

    <!-- Sink tab -->
    <ul v-if="activeTab === 'sink'" class="item-list">
      <li
        v-for="item in allItems"
        :key="item.id"
        :class="{ intermediate: item.asTarget === false }"
      >
        <img :src="getItemIconUrl(item.id)" class="list-icon" />
        <span class="list-name">{{ t(`item.${item.id}`) }}</span>
        <span v-if="item.asTarget === false" class="list-badge intermediate-badge">
          intermediate
        </span>
        <span v-if="item.transportType === 'pipe'" class="list-badge pipe">pipe</span>
        <div class="sink-actions">
          <button
            class="sink-btn demand"
            title="Demand: I need this item"
            @click.stop="selectSink(item.id, 'demand')"
          >
            D
          </button>
          <button
            class="sink-btn disposal"
            title="Disposal: must handle this byproduct"
            @click.stop="selectSink(item.id, 'disposal')"
          >
            X
          </button>
        </div>
      </li>
    </ul>
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
  font-size: 12px;
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

.item-list {
  list-style: none;
  padding: 4px 8px;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.item-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.1s;
}

.item-list li:hover {
  background: #1a2a1a;
}

.recipe-item {
  padding-left: 28px !important;
  font-size: 11px !important;
  color: #aaa;
}

.recipe-item:hover {
  color: #ededed !important;
}

.list-icon {
  width: 22px;
  height: 22px;
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
}

.list-badge.pipe {
  background: #1a2a3a;
  color: #4a9eff;
}

.list-badge.intermediate-badge {
  background: #2a2a1a;
  color: #c9a825;
}

.item-list li.intermediate {
  opacity: 0.7;
}

.sink-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.sink-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
</style>
