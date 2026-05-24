import { ref, watch } from 'vue'
import type { Connection } from '@vue-flow/core'
import { useVueFlow } from '@vue-flow/core'
import type { AicdNode, AicdEdge, TransportType } from '@/types'
import { toVFNode, toVFEdge, parseHandleId } from '@/types'
import { getFacility, getRecipe, getItem } from '@/data'
import { resolvePorts } from '@/utils/port-resolver'
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

    // Auto-infer itemId and transportType from source node
    const srcNode = line.nodes.get(connection.source)
    let itemId = ''
    let transportType: TransportType = 'belt'

    if (srcNode) {
      if (srcNode.type === 'supply') {
        itemId = srcNode.itemId
        const item = getItem(itemId)
        transportType = item?.transportType ?? 'belt'
      } else if (srcNode.type === 'facility') {
        // Look up which item is on this output port
        const facility = getFacility(srcNode.facilityId)
        const recipe = getRecipe(srcNode.recipeId)
        if (facility && recipe && srcHandle) {
          const ports = resolvePorts(facility, recipe)
          const port = ports.outputs.find(
            (p) => p.groupIndex === srcHandle.groupIndex && p.portInGroup === srcHandle.portInGroup,
          )
          if (port?.itemId) {
            itemId = port.itemId
            const item = getItem(itemId)
            transportType = item?.transportType ?? 'belt'
          }
        }
      }
    }

    const sourceHandle = connection.sourceHandle ?? 'out-0-0'
    const targetHandle = connection.targetHandle ?? 'in-0-0'

    pendingConnection.value = {
      sourceId: connection.source,
      sourceHandle,
      targetId: connection.target,
      targetHandle,
      itemId,
      parallelCount: 1,
      transportType,
    }
  })

  /** Pending connection from a user drag-to-connect action. */
  const pendingConnection = ref<{
    sourceId: string
    sourceHandle: string
    targetId: string
    targetHandle: string
    itemId: string
    parallelCount: number
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
