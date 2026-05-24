/**
 * Graph editor types for the AIC production line visual editor.
 *
 * The production line is modelled as a directed graph where:
 * - Source nodes supply items (any item: raw, intermediate, or finished)
 * - Facility nodes process inputs into outputs via recipes
 * - Sink nodes consume items (any item: raw, intermediate, or finished)
 * - Edges represent material flows between ports
 *
 * Source and Sink are *node roles* in the graph, not item categories.
 * Any item can appear as a Source (producing) or Sink (consuming).
 * For example, an intermediate product can be a Source (produced by one
 * facility) and also a Sink (consumed by another facility) in the same
 * production line.
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

/** Item source node — produces an item at a given rate. Any item can be a source. */
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

/** Item sink node — consumes an item at a given rate. Any item can be a sink. */
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
