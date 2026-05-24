<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SinkNodeData } from '@/types'
import { getItemIconUrl } from '@/data'
import { useI18n } from 'vue-i18n'

const props = defineProps<NodeProps<SinkNodeData>>()
const { t } = useI18n()

const isDisposal = props.data?.purpose === 'disposal'
</script>

<template>
  <div class="aicd-node" :class="isDisposal ? 'aicd-sink-disposal' : 'aicd-sink-demand'">
    <div class="node-header">
      <img v-if="props.data?.itemId" :src="getItemIconUrl(props.data.itemId)" class="node-icon" />
      <span>{{ t(`item.${props.data?.itemId}`) }}</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="label">{{ isDisposal ? 'Disposal' : 'Demand' }}</span>
        <span class="value">{{ props.data?.rate?.toFixed(1) ?? '0.0' }}/s</span>
      </div>
    </div>
    <Handle :id="'in-0-0'" type="target" :position="Position.Left" />
  </div>
</template>

<style scoped>
.aicd-sink-demand {
  background: #1a2a3a;
  border: 2px solid #4a9eff;
}

.aicd-sink-disposal {
  background: #3a1a1a;
  border: 2px solid #ff8c42;
}
</style>
