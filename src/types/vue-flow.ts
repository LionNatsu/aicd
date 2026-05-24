/**
 * Type bridge between AICD domain types and Vue Flow's Node/Edge model.
 *
 * Mapping:
 * - ProductionNode.type ('source'|'facility'|'sink') → VF Node.type
 * - ProductionNode.position → VF Node.position
 * - Port.index → VF Handle.id  (`in-0`, `in-1`, `out-0`, `out-1`, …)
 * - FlowEdge.sourceId/sourcePort → VF Edge.source/sourceHandle
 * - FlowEdge.targetId/targetPort → VF Edge.target/targetHandle
 * - Domain-specific fields → VF Node.data / Edge.data
 */

import type { Node, Edge } from '@vue-flow/core'
import type {
  TransportType,
  ProductionNode,
  SourceNode,
  FacilityNode,
  SinkNode,
  FlowEdge as DomainEdge,
} from '@/types'

// ---------------------------------------------------------------------------
// Node data payloads
// ---------------------------------------------------------------------------

export interface SourceNodeData {
  nodeType: 'source'
  itemId: string
  rate: number
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
}

export type AicdNodeData = SourceNodeData | FacilityNodeData | SinkNodeData

// ---------------------------------------------------------------------------
// Edge data payload
// ---------------------------------------------------------------------------

export interface FlowEdgeData {
  itemId: string
  rate: number
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

/** Format a port index into a Vue Flow Handle id. */
export function handleId(direction: 'in' | 'out', portIndex: number): string {
  return `${direction}-${portIndex}`
}

/** Parse a Vue Flow Handle id back into direction + port index. */
export function parseHandleId(id: string): { direction: 'in' | 'out'; portIndex: number } | null {
  const match = id.match(/^(in|out)-(\d+)$/)
  if (!match) return null
  return { direction: match[1] as 'in' | 'out', portIndex: Number(match[2]) }
}

// ---------------------------------------------------------------------------
// Conversion: Domain → Vue Flow
// ---------------------------------------------------------------------------

function toSourceData(node: SourceNode): SourceNodeData {
  return { nodeType: 'source', itemId: node.itemId, rate: node.rate }
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
  return { nodeType: 'sink', itemId: node.itemId, rate: node.rate }
}

export function toVFNode(node: ProductionNode): AicdNode {
  let data: AicdNodeData
  switch (node.type) {
    case 'source':
      data = toSourceData(node)
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
  return {
    id: edge.id,
    source: edge.sourceId,
    sourceHandle: handleId('out', edge.sourcePort),
    target: edge.targetId,
    targetHandle: handleId('in', edge.targetPort),
    type: 'flow',
    data: {
      itemId: edge.itemId,
      rate: edge.rate,
      transportType: edge.transportType,
    },
    animated: edge.transportType === 'pipe',
  }
}

// ---------------------------------------------------------------------------
// Conversion: Vue Flow → Domain (for connection events)
// ---------------------------------------------------------------------------

export function fromVFEdge(edge: AicdEdge): Omit<DomainEdge, 'id'> {
  const srcHandle = edge.sourceHandle ? parseHandleId(edge.sourceHandle) : null
  const tgtHandle = edge.targetHandle ? parseHandleId(edge.targetHandle) : null

  return {
    sourceId: edge.source,
    sourcePort: srcHandle?.portIndex ?? 0,
    targetId: edge.target,
    targetPort: tgtHandle?.portIndex ?? 0,
    itemId: edge.data?.itemId ?? '',
    rate: edge.data?.rate ?? 0,
    transportType: edge.data?.transportType ?? 'belt',
  }
}
