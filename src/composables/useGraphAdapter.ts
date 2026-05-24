import { ref, watch } from 'vue'
import type { Connection } from '@vue-flow/core'
import { useVueFlow } from '@vue-flow/core'
import type { AicdNode, AicdEdge, FlowEdgeData, TransportType } from '@/types'
import { toVFNode, toVFEdge, parseHandleId } from '@/types'
import type { ProductionLineState } from './useProductionLine'

/**
 * Bridges useProductionLine state ↔ Vue Flow's reactive node/edge model.
 *
 * - Syncs domain nodes/edges to Vue Flow arrays
 * - Handles user connections (drag-to-connect) → pending connection for editor
 * - Syncs node position changes back to domain model
 */
export function useGraphAdapter(line: ProductionLineState) {
  const { onConnect, onNodesChange } = useVueFlow()

  const nodes = ref<AicdNode[]>([])
  const edges = ref<AicdEdge[]>([])

  // ---- Domain → Vue Flow ----

  function syncToVF() {
    nodes.value = [...line.nodes.values()].map(toVFNode)
    edges.value = [...line.edges.values()].map(toVFEdge)
  }

  // Watch domain state for changes
  watch(
    () => [line.nodes.size, line.edges.size, line.diagnostics.length],
    () => syncToVF(),
    { immediate: true },
  )

  // ---- Vue Flow → Domain ----

  // Handle new connections from drag-to-connect
  onConnect((connection: Connection) => {
    const srcHandle = connection.sourceHandle ? parseHandleId(connection.sourceHandle) : null
    const tgtHandle = connection.targetHandle ? parseHandleId(connection.targetHandle) : null

    const edgeData: FlowEdgeData = {
      itemId: '',
      rate: 0,
      transportType: 'belt' as TransportType,
    }

    pendingConnection.value = {
      sourceId: connection.source,
      sourcePort: srcHandle?.portIndex ?? 0,
      targetId: connection.target,
      targetPort: tgtHandle?.portIndex ?? 0,
      ...edgeData,
    }
  })

  /** Pending connection from a user drag-to-connect action. */
  const pendingConnection = ref<{
    sourceId: string
    sourcePort: number
    targetId: string
    targetPort: number
    itemId: string
    rate: number
    transportType: TransportType
  } | null>(null)

  // Sync node position changes back to domain model
  onNodesChange((changes) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const node = line.nodes.get(change.id)
        if (node) {
          node.position = { ...change.position }
        }
      }
    }
  })

  return {
    nodes,
    edges,
    pendingConnection,
    syncToVF,
  }
}
