<script setup lang="ts">
import { markRaw, ref } from 'vue'
import { VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

import SourceNodeVue from './nodes/SourceNode.vue'
import FacilityNodeVue from './nodes/FacilityNode.vue'
import SinkNodeVue from './nodes/SinkNode.vue'
import FlowEdgeVue from './edges/FlowEdge.vue'
import SidebarVue from './Sidebar.vue'
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

// ---- Node placement (auto-offset from last position) ----

let nextY = 200

function handleAddSource(itemId: string, position: { x: number; y: number }) {
  addSource({ itemId, rate: 10, position: { x: position.x, y: nextY } })
  nextY += 120
}

function handleAddFacility(
  facilityId: string,
  recipeId: string,
  position: { x: number; y: number },
) {
  addFacility({ facilityId, recipeId, count: 1, position: { x: position.x, y: nextY } })
  nextY += 120
}

function handleAddSink(itemId: string, position: { x: number; y: number }) {
  addSink({ itemId, rate: 5, position: { x: position.x, y: nextY } })
  nextY += 120
}

// ---- Diagnostics ----

const showDiag = ref(true)

function diagLevelClass(level: string): string {
  return `diag-${level}`
}
</script>

<template>
  <div class="production-editor">
    <!-- Sidebar -->
    <SidebarVue
      :on-add-source="handleAddSource"
      :on-add-facility="handleAddFacility"
      :on-add-sink="handleAddSink"
    />

    <!-- Main area -->
    <div class="main-area">
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
            {{ d.message }}
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
</style>
