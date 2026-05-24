<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SourceNodeData } from '@/types'

const props = defineProps<NodeProps<SourceNodeData>>()
</script>

<template>
  <div class="aicd-node aicd-source">
    <div class="node-header">Source</div>
    <div class="node-body">
      <div class="node-field">
        <span class="label">Item</span>
        <span class="value">{{ props.data?.itemId || '—' }}</span>
      </div>
      <div class="node-field">
        <span class="label">Rate</span>
        <span class="value">{{ props.data?.rate?.toFixed(1) ?? '0.0' }}/s</span>
      </div>
    </div>
    <Handle :id="'out-0'" type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.aicd-source {
  background: #1a3a2a;
  border: 2px solid #42b883;
}
</style>
