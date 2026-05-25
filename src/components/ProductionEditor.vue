<script setup lang="ts">
import { markRaw, ref, computed, nextTick } from 'vue'
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
import { getRecipe, getFacility, getItem } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'
import type { TransportType } from '@/types'

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

// ---- Auto-connect: wire edges to matching existing nodes ----

function edgeExists(
  sourceId: string,
  sourceHandle: string,
  targetId: string,
  targetHandle: string,
): boolean {
  for (const edge of line.edges.values()) {
    if (
      edge.sourceId === sourceId &&
      edge.sourceHandle === sourceHandle &&
      edge.targetId === targetId &&
      edge.targetHandle === targetHandle
    ) {
      return true
    }
  }
  return false
}

function autoConnectSupply(supplyNodeId: string) {
  const supplyNode = line.nodes.get(supplyNodeId)
  if (!supplyNode || supplyNode.type !== 'supply') return
  const itemId = supplyNode.itemId
  const item = getItem(itemId)
  const transportType: TransportType = item?.transportType ?? 'belt'

  // Connect to facility input ports that need this item
  for (const [nodeId, node] of line.nodes) {
    if (node.type !== 'facility') continue
    const facility = getFacility(node.facilityId)
    const recipe = getRecipe(node.recipeId)
    if (!facility || !recipe) continue
    const ports = resolvePorts(facility, recipe)
    for (const port of ports.inputs) {
      if (port.itemId === itemId) {
        const sourceHandle = 'out-0-0'
        const targetHandle = port.handleId
        if (!edgeExists(supplyNodeId, sourceHandle, nodeId, targetHandle)) {
          addEdge({
            sourceId: supplyNodeId,
            sourceHandle,
            targetId: nodeId,
            targetHandle,
            itemId,
            parallelCount: 1,
            transportType,
          })
        }
      }
    }
  }
}

function autoConnectFacility(facilityNodeId: string) {
  const facilityNode = line.nodes.get(facilityNodeId)
  if (!facilityNode || facilityNode.type !== 'facility') return
  const facility = getFacility(facilityNode.facilityId)
  const recipe = getRecipe(facilityNode.recipeId)
  if (!facility || !recipe) return

  const ports = resolvePorts(facility, recipe)

  // Connect facility output ports to matching sink nodes
  for (const port of ports.outputs) {
    if (!port.itemId) continue
    const item = getItem(port.itemId)
    const transportType: TransportType = item?.transportType ?? 'belt'

    for (const [nodeId, node] of line.nodes) {
      if (node.type !== 'sink' || node.itemId !== port.itemId) continue
      const sourceHandle = port.handleId
      const targetHandle = 'in-0-0'
      if (!edgeExists(facilityNodeId, sourceHandle, nodeId, targetHandle)) {
        addEdge({
          sourceId: facilityNodeId,
          sourceHandle,
          targetId: nodeId,
          targetHandle,
          itemId: port.itemId,
          parallelCount: 1,
          transportType,
        })
      }
    }
  }

  // Connect existing supply nodes to facility input ports
  for (const port of ports.inputs) {
    if (!port.itemId) continue
    for (const [nodeId, node] of line.nodes) {
      if (node.type !== 'supply' || node.itemId !== port.itemId) continue
      const item = getItem(port.itemId)
      const transportType: TransportType = item?.transportType ?? 'belt'
      const sourceHandle = 'out-0-0'
      const targetHandle = port.handleId
      if (!edgeExists(nodeId, sourceHandle, facilityNodeId, targetHandle)) {
        addEdge({
          sourceId: nodeId,
          sourceHandle,
          targetId: facilityNodeId,
          targetHandle,
          itemId: port.itemId,
          parallelCount: 1,
          transportType,
        })
      }
    }
  }
}

function autoConnectSink(sinkNodeId: string) {
  const sinkNode = line.nodes.get(sinkNodeId)
  if (!sinkNode || sinkNode.type !== 'sink') return
  const itemId = sinkNode.itemId
  const item = getItem(itemId)
  const transportType: TransportType = item?.transportType ?? 'belt'

  // Connect from facility output ports that produce this item
  for (const [nodeId, node] of line.nodes) {
    if (node.type !== 'facility') continue
    const facility = getFacility(node.facilityId)
    const recipe = getRecipe(node.recipeId)
    if (!facility || !recipe) continue
    const ports = resolvePorts(facility, recipe)
    for (const port of ports.outputs) {
      if (port.itemId === itemId) {
        const sourceHandle = port.handleId
        const targetHandle = 'in-0-0'
        if (!edgeExists(nodeId, sourceHandle, sinkNodeId, targetHandle)) {
          addEdge({
            sourceId: nodeId,
            sourceHandle,
            targetId: sinkNodeId,
            targetHandle,
            itemId,
            parallelCount: 1,
            transportType,
          })
        }
      }
    }
  }
}

// ---- Node placement (per-column auto-offset) ----

function nextYForColumn(x: number): number {
  let maxY = 100
  for (const node of line.nodes.values()) {
    if (Math.abs(node.position.x - x) < 300) {
      maxY = Math.max(maxY, node.position.y + 120)
    }
  }
  return maxY
}

function handleAddSupply(itemId: string, position: { x: number; y: number }) {
  const id = addSupply({ itemId, position: { x: position.x, y: nextYForColumn(position.x) } })
  autoConnectSupply(id)
  autoFitView()
}

function handleAddFacility(
  facilityId: string,
  recipeId: string,
  position: { x: number; y: number },
) {
  const facility = getFacility(facilityId)
  const recipe = getRecipe(recipeId)
  const facilityNodeId = addFacility({
    facilityId,
    recipeId,
    count: 1,
    position: { x: position.x, y: nextYForColumn(position.x) },
  })

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
          position: { x: 650, y: nextYForColumn(650) },
        })
      }
    }
  }
  autoConnectFacility(facilityNodeId)
  autoFitView()
}

function handleAddSink(
  itemId: string,
  position: { x: number; y: number },
  purpose: 'demand' | 'disposal' = 'demand',
) {
  const id = addSink({
    itemId,
    rate: 5,
    purpose,
    position: { x: position.x, y: nextYForColumn(position.x) },
  })
  autoConnectSink(id)
  autoFitView()
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
const { getSelectedNodes, getSelectedEdges, fitView } = useVueFlow()

function autoFitView() {
  nextTick(() => fitView({ padding: 0.2, duration: 300 }))
}

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

        <!-- Canvas controls -->
        <div class="canvas-controls">
          <button class="ctrl-btn" title="Fit View" @click="autoFitView()">⊞</button>
        </div>

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

.canvas-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 5;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #444;
  border-radius: 6px;
  background: #1a1a1a;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ctrl-btn:hover {
  background: #2a2a2a;
  color: #ededed;
}
</style>
