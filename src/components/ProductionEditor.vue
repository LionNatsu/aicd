<script setup lang="ts">
import { markRaw, ref, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import type { NodeMouseEvent, EdgeMouseEvent } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import SupplyNodeVue from './nodes/SupplyNode.vue'
import FacilityNodeVue from './nodes/FacilityNode.vue'
import SinkNodeVue from './nodes/SinkNode.vue'
import FlowEdgeVue from './edges/FlowEdge.vue'
import SidebarVue from './Sidebar.vue'
import './nodes/node.css'

import { useProductionLine } from '@/composables/useProductionLine'
import { useGraphAdapter } from '@/composables/useGraphAdapter'
import { useI18n } from 'vue-i18n'
import { getRecipe, getFacility } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'

const { line, addSupply, addFacility, addSink, addEdge, removeNode, removeEdge } =
  useProductionLine()
const { nodes, edges } = useGraphAdapter(line, addEdge)
const { t } = useI18n()

// ---- Selected node for context-aware sidebar ----

const selectedNodeId = ref<string | null>(null)

function onNodeClick(event: NodeMouseEvent) {
  selectedNodeId.value = event.node.id
}

function onPaneClick() {
  contextMenu.value = null
  selectedNodeId.value = null
}

// Pass live domain node to sidebar (reactive lookup from graph state)
const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  return line.nodes.get(selectedNodeId.value) ?? null
})

/**
 * Translate raw item IDs in diagnostic messages to i18n names.
 * Matches patterns like "item_xxx" and replaces with the translated name.
 */
function translateDiagMessage(msg: string): string {
  return msg
    .replace(/\b(item_\w+)\b/g, (match) => {
      const name = t(`item.${match}`)
      return name === `item.${match}` ? match : name
    })
    .replace(/\b(facility_\w+)\b/g, (match) => {
      const name = t(`facility.${match}`)
      return name === `facility.${match}` ? match : name
    })
}

// Register custom node/edge types
const nodeTypes = {
  supply: markRaw(SupplyNodeVue),
  facility: markRaw(FacilityNodeVue),
  sink: markRaw(SinkNodeVue),
}

const edgeTypes = {
  flow: markRaw(FlowEdgeVue),
}

// ---- Node placement (auto-offset from last position) ----

let nextY = 200

function handleAddSupply(itemId: string, position: { x: number; y: number }) {
  addSupply({ itemId, position: { x: position.x, y: nextY } })
  nextY += 120
}

function handleAddFacility(
  facilityId: string,
  recipeId: string,
  position: { x: number; y: number },
) {
  const facility = getFacility(facilityId)
  const recipe = getRecipe(recipeId)
  addFacility({ facilityId, recipeId, count: 1, position: { x: position.x, y: nextY } })
  nextY += 120

  // Auto-add disposal sinks for byproduct outputs.
  // A byproduct is any recipe output that is NOT the primary demand target
  // (i.e. not the item the user originally requested).
  // We detect this by checking if there's already a demand sink for each output.
  if (facility && recipe) {
    const ports = resolvePorts(facility, recipe)
    for (const port of ports.outputs) {
      if (!port.itemId) continue
      // Check if a demand sink for this item already exists
      const hasDemandSink = [...line.nodes.values()].some(
        (n) => n.type === 'sink' && n.itemId === port.itemId && n.purpose === 'demand',
      )
      // Check if a disposal sink for this item already exists
      const hasDisposalSink = [...line.nodes.values()].some(
        (n) => n.type === 'sink' && n.itemId === port.itemId && n.purpose === 'disposal',
      )
      if (!hasDemandSink && !hasDisposalSink) {
        addSink({
          itemId: port.itemId,
          rate: 0,
          purpose: 'disposal',
          position: { x: 650, y: nextY },
        })
        nextY += 120
      }
    }
  }
}

function handleAddSink(
  itemId: string,
  position: { x: number; y: number },
  purpose: 'demand' | 'disposal' = 'demand',
) {
  addSink({ itemId, rate: 5, purpose, position: { x: position.x, y: nextY } })
  nextY += 120
}

// ---- Diagnostics ----

const showDiag = ref(true)

function diagLevelClass(level: string): string {
  return `diag-${level}`
}

// ---- Context menu + Delete ----

const contextMenu = ref<{ x: number; y: number; type: 'node' | 'edge'; id: string } | null>(null)

function onNodeContextMenu(event: NodeMouseEvent) {
  const e = event.event
  if (!e || typeof (e as Event).preventDefault !== 'function') return
  ;(e as Event).preventDefault()
  const { clientX, clientY } = e as { clientX: number; clientY: number }
  contextMenu.value = { x: clientX, y: clientY, type: 'node', id: event.node.id }
}

function onEdgeContextMenu(event: EdgeMouseEvent) {
  const e = event.event
  if (!e || typeof (e as Event).preventDefault !== 'function') return
  ;(e as Event).preventDefault()
  const { clientX, clientY } = e as { clientX: number; clientY: number }
  contextMenu.value = { x: clientX, y: clientY, type: 'edge', id: event.edge.id }
}

function deleteContextTarget() {
  if (!contextMenu.value) return
  if (contextMenu.value.type === 'node') removeNode(contextMenu.value.id)
  else removeEdge(contextMenu.value.id)
  contextMenu.value = null
}

// Keyboard delete (Backspace/Delete) for selected elements
const { getSelectedNodes, getSelectedEdges } = useVueFlow()

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    const target = event.target as Element | null
    if (target?.tagName === 'INPUT') return
    for (const node of getSelectedNodes.value) removeNode(node.id)
    for (const edge of getSelectedEdges.value) removeEdge(edge.id)
    contextMenu.value = null
  }
}
</script>

<template>
  <div class="production-editor">
    <!-- Sidebar -->
    <SidebarVue
      :on-add-supply="handleAddSupply"
      :on-add-facility="handleAddFacility"
      :on-add-sink="handleAddSink"
      :selected-node="selectedNode"
    />

    <!-- Main area -->
    <div class="main-area" @keydown="onKeyDown">
      <!-- Canvas -->
      <main class="canvas-container">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-edge-options="{ type: 'flow' }"
          :connection-line-style="{ stroke: '#42b883' }"
          @node-click="onNodeClick"
          @node-context-menu="onNodeContextMenu"
          @edge-context-menu="onEdgeContextMenu"
          @pane-click="onPaneClick"
        />

        <!-- Context menu -->
        <div
          v-if="contextMenu"
          class="context-menu"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        >
          <button @click="deleteContextTarget">Delete</button>
        </div>
      </main>

      <!-- Diagnostics bar -->
      <footer v-if="showDiag" class="diagnostics-bar">
        <div class="diag-header">
          <span>Diagnostics</span>
          <span class="diag-count">{{ line.diagnostics.length }}</span>
          <button class="diag-close" @click="showDiag = false">×</button>
        </div>
        <ul v-if="line.diagnostics.length" class="diagnostics">
          <li v-for="(d, i) in line.diagnostics" :key="i" :class="diagLevelClass(d.level)">
            <span class="diag-level">{{ d.level }}</span>
            {{ translateDiagMessage(d.message) }}
          </li>
        </ul>
        <p v-else class="diag-empty">No issues</p>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.production-editor {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  background: #0d0d0d;
}

.diagnostics-bar {
  background: #111;
  border-top: 1px solid #333;
  padding: 8px 12px;
  max-height: 160px;
  overflow-y: auto;
  font-size: 11px;
}

.diag-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
}

.diag-count {
  background: #333;
  color: #ededed;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
}

.diag-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.diagnostics {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.diagnostics li {
  padding: 3px 8px;
  border-radius: 4px;
  background: #1a1a1a;
}

.diag-level {
  font-weight: 600;
  text-transform: uppercase;
  margin-right: 4px;
  font-size: 10px;
}

.diag-error .diag-level {
  color: #ff6b6b;
}

.diag-warning .diag-level {
  color: #ffd93d;
}

.diag-info .diag-level {
  color: #4a9eff;
}

.diag-empty {
  color: #555;
  font-size: 11px;
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: #222;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 100px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.context-menu button {
  display: block;
  width: 100%;
  padding: 6px 14px;
  background: none;
  border: none;
  color: #ff6b6b;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.context-menu button:hover {
  background: #2a1a1a;
}
</style>
