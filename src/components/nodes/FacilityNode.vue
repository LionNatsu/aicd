<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { FacilityNodeData, Port, TransportType } from '@/types'
import { getFacility, getRecipe, getFacilityIconUrl } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'
import { getRecipeLabel } from '@/utils/recipe-label'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const props = defineProps<NodeProps<FacilityNodeData>>()
const { t } = useI18n()

interface PortInfo {
  handleId: string
  /** Visual row index (for vertical positioning of handles). */
  rowIndex: number
  itemId: string
  itemName: string
  transportType: TransportType
}

const resolved = computed(() => {
  const facility = getFacility(props.data?.facilityId ?? '')
  const recipe = getRecipe(props.data?.recipeId ?? '')
  if (!facility || !recipe) return { inputs: [] as PortInfo[], outputs: [] as PortInfo[] }

  const { inputs, outputs } = resolvePorts(facility, recipe)

  const toInfo = (p: Port, rowIndex: number): PortInfo => ({
    handleId: p.handleId,
    rowIndex,
    itemId: p.itemId ?? '',
    itemName: p.itemId ? t(`item.${p.itemId}`) : '',
    transportType: p.transportType,
  })

  return {
    inputs: inputs.map((p, i) => toInfo(p, i)),
    outputs: outputs.map((p, i) => toInfo(p, i)),
  }
})

const recipeLabel = computed(() => {
  const recipeId = props.data?.recipeId ?? ''
  return getRecipeLabel(recipeId, t)
})

const portCount = computed(() =>
  Math.max(resolved.value.inputs.length, resolved.value.outputs.length),
)
</script>

<template>
  <div class="aicd-node aicd-facility" :style="{ '--port-count': portCount }">
    <div class="node-header">
      <img
        v-if="props.data?.facilityId"
        :src="getFacilityIconUrl(props.data.facilityId)"
        class="node-icon"
      />
      <span>{{ t(`facility.${props.data?.facilityId}`) }}</span>
    </div>
    <div class="node-body">
      <div v-if="recipeLabel" class="node-recipe">{{ recipeLabel.short }}</div>
      <div class="node-field">
        <span class="label">Count</span>
        <span class="value">x{{ props.data?.count ?? 1 }}</span>
      </div>
    </div>
    <!-- Port labels -->
    <div class="port-area">
      <div class="port-col port-in">
        <div v-for="p in resolved.inputs" :key="p.handleId" class="port-row">
          <span :class="['port-name', p.transportType]">{{ p.itemName }}</span>
        </div>
      </div>
      <div class="port-col port-out">
        <div v-for="p in resolved.outputs" :key="p.handleId" class="port-row">
          <span :class="['port-name', p.transportType]">{{ p.itemName }}</span>
        </div>
      </div>
    </div>
    <!-- Dynamic input handles (positioned alongside port labels) -->
    <Handle
      v-for="p in resolved.inputs"
      :id="p.handleId"
      :key="p.handleId"
      type="target"
      :position="Position.Left"
      :class="['port-handle', p.transportType]"
      :style="{ top: `calc(var(--header-h) + var(--body-h) + ${p.rowIndex * 20 + 6}px)` }"
    />
    <!-- Dynamic output handles -->
    <Handle
      v-for="p in resolved.outputs"
      :id="p.handleId"
      :key="p.handleId"
      type="source"
      :position="Position.Right"
      :class="['port-handle', p.transportType]"
      :style="{ top: `calc(var(--header-h) + var(--body-h) + ${p.rowIndex * 20 + 6}px)` }"
    />
  </div>
</template>

<style scoped>
.aicd-facility {
  --header-h: 30px;
  --body-h: 36px;
  background: #1a2a3a;
  border: 2px solid #4a9eff;
}

.node-recipe {
  font-size: 10px;
  color: #aaa;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130px;
}

.port-area {
  display: flex;
  justify-content: space-between;
  padding: 2px 4px 6px;
  gap: 8px;
}

.port-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.port-in {
  align-items: flex-start;
  padding-left: 2px;
}

.port-out {
  align-items: flex-end;
  padding-right: 2px;
}

.port-row {
  height: 18px;
  display: flex;
  align-items: center;
}

.port-name {
  font-size: 9px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.port-name.belt {
  color: #ccc;
}

.port-name.pipe {
  color: #4a9eff;
}

/* Handle styling by transport type */
:deep(.port-handle) {
  width: 8px;
  height: 8px;
}

:deep(.port-handle.belt) {
  background: #ccc;
  border-color: #999;
}

:deep(.port-handle.pipe) {
  background: #4a9eff;
  border-color: #3a7acc;
}
</style>
