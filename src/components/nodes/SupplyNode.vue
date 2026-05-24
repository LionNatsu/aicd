<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import type { SupplyNodeData } from '@/types'
import { getItemIconUrl } from '@/data'
import { useI18n } from 'vue-i18n'

const props = defineProps<NodeProps<SupplyNodeData>>()
const { t } = useI18n()
</script>

<template>
  <div class="aicd-node aicd-supply">
    <div class="node-header">
      <img v-if="props.data?.itemId" :src="getItemIconUrl(props.data.itemId)" class="node-icon" />
      <span>{{ t(`item.${props.data?.itemId}`) }}</span>
    </div>
    <div class="node-body">
      <div class="node-field">
        <span class="label">Supply</span>
      </div>
    </div>
    <Handle :id="'out-0-0'" type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.aicd-supply {
  background: #1a3a2a;
  border: 2px solid #42b883;
}
</style>
