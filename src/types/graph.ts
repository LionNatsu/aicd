/**
 * Graph editor types for the AIC production line visual editor.
 *
 * The production line is modelled as a directed graph where:
 * - Source nodes supply raw materials
 * - Facility nodes process inputs into outputs via recipes
 * - Sink nodes consume finished products
 * - Edges represent material flows between ports
 *
 * Cycles are natively supported (e.g. perpetual seed-plant loops,
 * byproduct recycling).
 */

import type { TransportType } from './core'

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

interface BaseNode {
  id: string
  position: { x: number; y: number }
}

/** Material input source (warehouse output, mining rig, etc.) */
export interface SourceNode extends BaseNode {
  type: 'source'
  itemId: string
  /** Output rate in items / second. */
  rate: number
}

/** A processing facility running a specific recipe. */
export interface FacilityNode extends BaseNode {
  type: 'facility'
  facilityId: string
  recipeId: string
  /** Number of facility instances. */
  count: number
}

/** Material output sink (warehouse intake, outpost delivery, disposal, etc.) */
export interface SinkNode extends BaseNode {
  type: 'sink'
  itemId: string
  /** Expected consumption rate in items / second. */
  rate: number
}

export type ProductionNode = SourceNode | FacilityNode | SinkNode

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

/** A material flow connection between two node ports. */
export interface FlowEdge {
  id: string
  sourceId: string
  sourcePort: number
  targetId: string
  targetPort: number
  itemId: string
  /** Flow rate in items / second. */
  rate: number
  transportType: TransportType
}

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

/** A resolved I/O port on a facility node. */
export interface Port {
  index: number
  direction: 'in' | 'out'
  /** Item bound to this port (determined by the selected recipe). */
  itemId?: string
  transportType: TransportType
  connected: boolean
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/** A validation diagnostic for the production line graph. */
export interface Diagnostic {
  nodeId?: string
  level: 'error' | 'warning' | 'info'
  kind: 'overproduction' | 'underproduction' | 'wrong_item' | 'port_mismatch' | 'cycle_detected'
  message: string
  relatedEdges: string[]
}

// ---------------------------------------------------------------------------
// Production line
// ---------------------------------------------------------------------------

/** A complete production line blueprint / graph. */
export interface ProductionLine {
  id: string
  name: string
  nodes: Map<string, ProductionNode>
  edges: FlowEdge[]
  diagnostics: Diagnostic[]
}
