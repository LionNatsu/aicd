<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { FacilityNodeData } from '@/types'
import { getFacility, getRecipe } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'
import { computed } from 'vue'

const props = defineProps<NodeProps<FacilityNodeData>>()

const ports = computed(() => {
  const facility = getFacility(props.data?.facilityId ?? '')
  const recipe = getRecipe(props.data?.recipeId ?? '')
  if (!facility || !recipe) return { inputs: [] as number[], outputs: [] as number[] }
  const resolved = resolvePorts(facility, recipe)
  return {
    inputs: resolved.inputs.map((p) => p.index),
    outputs: resolved.outputs.map((p) => p.index),
  }
})
</script>

<template>
  <div class="aicd-node aicd-facility">
    <div class="node-header">Facility</div>
    <div class="node-body">
      <div class="node-field">
        <span class="label">ID</span>
        <span class="value">{{ props.data?.facilityId || '—' }}</span>
      </div>
      <div class="node-field">
        <span class="label">Recipe</span>
        <span class="value">{{ props.data?.recipeId || '—' }}</span>
      </div>
      <div class="node-field">
        <span class="label">Count</span>
        <span class="value">{{ props.data?.count ?? 1 }}</span>
      </div>
    </div>
    <!-- Dynamic input handles -->
    <Handle
      v-for="idx in ports.inputs"
      :id="'in-' + idx"
      :key="'in-' + idx"
      type="target"
      :position="Position.Left"
      :style="{ top: `${15 + idx * 20}px` }"
    />
    <!-- Dynamic output handles -->
    <Handle
      v-for="idx in ports.outputs"
      :id="'out-' + idx"
      :key="'out-' + idx"
      type="source"
      :position="Position.Right"
      :style="{ top: `${15 + idx * 20}px` }"
    />
  </div>
</template>

<style scoped>
.aicd-facility {
  background: #1a2a3a;
  border: 2px solid #4a9eff;
}
</style>
