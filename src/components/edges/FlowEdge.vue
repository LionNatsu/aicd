<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import type { FlowEdgeData } from '@/types'

const props = defineProps<EdgeProps<FlowEdgeData>>()

const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  })
  return edgePath
})

const edgeColor = computed(() => {
  const type = props.data?.transportType
  if (type === 'pipe') return '#4a9eff'
  return '#42b883'
})
</script>

<template>
  <BaseEdge :path="path" :style="{ stroke: edgeColor, strokeWidth: 2 }" />
  <EdgeLabelRenderer v-if="props.data?.itemId">
    <div
      :style="{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${(props.sourceX + props.targetX) / 2}px,${(props.sourceY + props.targetY) / 2}px)`,
        pointerEvents: 'all',
        fontSize: '10px',
        color: '#ededed',
        background: '#222',
        padding: '2px 6px',
        borderRadius: '4px',
        whiteSpace: 'nowrap',
      }"
      class="flow-edge-label"
    >
      {{ props.data.itemId }}
      <span v-if="props.data.rate > 0" class="rate">{{ props.data.rate.toFixed(1) }}/s</span>
    </div>
  </EdgeLabelRenderer>
</template>

<style scoped>
.flow-edge-label {
  font-family: monospace;
}

.flow-edge-label .rate {
  color: #888;
}
</style>
