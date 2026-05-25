<script setup lang="ts">
import { computed } from 'vue'
import { BaseEdge, getBezierPath, EdgeLabelRenderer } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import type { FlowEdgeData } from '@/types'
import { useI18n } from 'vue-i18n'

const props = defineProps<EdgeProps<FlowEdgeData>>()
const { t } = useI18n()

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
  if (type === 'conduit') return '#7b68ee'
  return '#42b883'
})

// Unique marker ID so each edge gets an arrow matching its color
const markerId = computed(() => `arrow-${props.id}`)
</script>

<template>
  <svg style="position: absolute; pointer-events: none; overflow: visible">
    <defs>
      <marker
        :id="markerId"
        viewBox="0 0 10 10"
        refX="10"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" :fill="edgeColor" />
      </marker>
    </defs>
  </svg>
  <BaseEdge
    :path="path"
    :style="{ stroke: edgeColor, strokeWidth: 2 }"
    :marker-end="`url(#${markerId})`"
  />
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
      {{
        t(`item.${props.data.itemId}`) !== `item.${props.data.itemId}`
          ? t(`item.${props.data.itemId}`)
          : props.data.itemId
      }}
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
