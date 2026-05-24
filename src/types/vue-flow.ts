/**
 * Type bridge between AICD domain types and Vue Flow's Node/Edge model.
 *
 * Mapping:
 * - ProductionNode.type ('supply'|'facility'|'sink') → VF Node.type
 * - ProductionNode.position → VF Node.position
 * - Port.handleId → VF Handle.id  (`in-0-0`, `out-1-0`, …)
 * - FlowEdge.sourceId/sourceHandle → VF Edge.source/sourceHandle
 * - FlowEdge.targetId/targetHandle → VF Edge.target/targetHandle
 * - Domain-specific fields → VF Node.data / Edge.data
 */

import type { Node, Edge } from '@vue-flow/core'
import type {
  TransportType,
  ProductionNode,
  SupplyNode,
  FacilityNode,
  SinkNode,
  FlowEdge as DomainEdge,
} from '@/types'
import { TRANSPORT_RATES } from '@/types'

// ---------------------------------------------------------------------------
// Node data payloads
// ---------------------------------------------------------------------------

export interface SupplyNodeData {
  nodeType: 'supply'
  itemId: string
}

export interface FacilityNodeData {
  nodeType: 'facility'
  facilityId: string
  recipeId: string
  count: number
}

export interface SinkNodeData {
  nodeType: 'sink'
  itemId: string
  rate: number
  purpose: 'demand' | 'disposal'
}

export type AicdNodeData = SupplyNodeData | FacilityNodeData | SinkNodeData

// ---------------------------------------------------------------------------
// Edge data payload
// ---------------------------------------------------------------------------

export interface FlowEdgeData {
  itemId: string
  /** Derived rate: parallelCount × TRANSPORT_RATES[transportType] */
  rate: number
  parallelCount: number
  transportType: TransportType
}

// ---------------------------------------------------------------------------
// Typed Vue Flow aliases
// ---------------------------------------------------------------------------

export type AicdNode = Node<AicdNodeData>
export type AicdEdge = Edge<FlowEdgeData>

// ---------------------------------------------------------------------------
// Handle ID helpers
// ---------------------------------------------------------------------------

/** Format a handle ID from direction, group index, and port within group. */
export function handleId(direction: 'in' | 'out', groupIndex: number, portInGroup: number): string {
  return `${direction}-${groupIndex}-${portInGroup}`
}

/** Parse a handle ID back into direction, group index, and port within group. */
export function parseHandleId(id: string): {
  direction: 'in' | 'out'
  groupIndex: number
  portInGroup: number
} | null {
  const match = id.match(/^(in|out)-(\d+)-(\d+)$/)
  if (!match) return null
  return {
    direction: match[1] as 'in' | 'out',
    groupIndex: Number(match[2]),
    portInGroup: Number(match[3]),
  }
}

// ---------------------------------------------------------------------------
// Conversion: Domain → Vue Flow
// ---------------------------------------------------------------------------

function toSupplyData(node: SupplyNode): SupplyNodeData {
  return { nodeType: 'supply', itemId: node.itemId }
}

function toFacilityData(node: FacilityNode): FacilityNodeData {
  return {
    nodeType: 'facility',
    facilityId: node.facilityId,
    recipeId: node.recipeId,
    count: node.count,
  }
}

function toSinkData(node: SinkNode): SinkNodeData {
  return { nodeType: 'sink', itemId: node.itemId, rate: node.rate, purpose: node.purpose }
}

export function toVFNode(node: ProductionNode): AicdNode {
  let data: AicdNodeData
  switch (node.type) {
    case 'supply':
      data = toSupplyData(node)
      break
    case 'facility':
      data = toFacilityData(node)
      break
    case 'sink':
      data = toSinkData(node)
      break
  }

  return {
    id: node.id,
    type: node.type,
    position: { ...node.position },
    data,
  }
}

export function toVFEdge(edge: DomainEdge): AicdEdge {
  const rate = edge.parallelCount * TRANSPORT_RATES[edge.transportType]
  return {
    id: edge.id,
    source: edge.sourceId,
    sourceHandle: edge.sourceHandle,
    target: edge.targetId,
    targetHandle: edge.targetHandle,
    type: 'flow',
    data: {
      itemId: edge.itemId,
      rate,
      parallelCount: edge.parallelCount,
      transportType: edge.transportType,
    },
    animated: edge.transportType === 'pipe' || edge.transportType === 'conduit',
  }
}
