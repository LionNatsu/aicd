<script setup lang="ts">
import { markRaw } from 'vue'
import { VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import SourceNodeVue from './nodes/SourceNode.vue'
import FacilityNodeVue from './nodes/FacilityNode.vue'
import SinkNodeVue from './nodes/SinkNode.vue'
import FlowEdgeVue from './edges/FlowEdge.vue'
import './nodes/node.css'

import { useProductionLine } from '@/composables/useProductionLine'
import { useGraphAdapter } from '@/composables/useGraphAdapter'

const { line, addSource, addFacility, addSink, addEdge } = useProductionLine()
const { nodes, edges, pendingConnection } = useGraphAdapter(line)

// Register custom node/edge types
const nodeTypes = {
  source: markRaw(SourceNodeVue),
  facility: markRaw(FacilityNodeVue),
  sink: markRaw(SinkNodeVue),
}

const edgeTypes = {
  flow: markRaw(FlowEdgeVue),
}

// ---- Quick-add demo nodes ----

function addDemoSource() {
  addSource({ itemId: 'item_1001', rate: 10, position: { x: 50, y: 200 } })
}

function addDemoFacility() {
  addFacility({
    facilityId: 'crafter_1',
    recipeId: 'recipe_crafter_1_1',
    count: 1,
    position: { x: 350, y: 200 },
  })
}

function addDemoSink() {
  addSink({ itemId: 'item_1002', rate: 5, position: { x: 650, y: 200 } })
}

// ---- Diagnostics ----

function diagLevelClass(level: string): string {
  return `diag-${level}`
}
</script>

<template>
  <div class="production-editor">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2>Palette</h2>
      <div class="palette-actions">
        <button @click="addDemoSource">+ Source</button>
        <button @click="addDemoFacility">+ Facility</button>
        <button @click="addDemoSink">+ Sink</button>
      </div>

      <h3>Diagnostics</h3>
      <ul v-if="line.diagnostics.length" class="diagnostics">
        <li v-for="(d, i) in line.diagnostics" :key="i" :class="diagLevelClass(d.level)">
          <span class="diag-level">{{ d.level }}</span>
          {{ d.message }}
        </li>
      </ul>
      <p v-else class="diag-empty">No issues</p>
    </aside>

    <!-- Canvas -->
    <main class="canvas-container">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        fit-view-on-init
        :default-edge-options="{ type: 'flow' }"
        :connection-line-style="{ stroke: '#42b883' }"
        @connect="
          () => {
            if (pendingConnection) {
              addEdge(pendingConnection)
              pendingConnection = null
            }
          }
        "
      />
    </main>
  </div>
</template>

<style scoped>
.production-editor {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  min-width: 240px;
  background: #111;
  border-right: 1px solid #333;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.sidebar h2 {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #42b883;
  margin: 0;
}

.sidebar h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #888;
  margin: 0;
  margin-top: 8px;
}

.palette-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.palette-actions button {
  padding: 8px 12px;
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #ededed;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: border-color 0.15s;
}

.palette-actions button:hover {
  border-color: #42b883;
}

.canvas-container {
  flex: 1;
  height: 100vh;
  background: #0d0d0d;
}

.diagnostics {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.diagnostics li {
  padding: 4px 8px;
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
  font-size: 11px;
  color: #555;
}
</style>
