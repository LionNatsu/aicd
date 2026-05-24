/**
 * Graph editor types for the AICD production line visual editor.
 *
 * The production line is modelled as a directed graph where:
 * - Supply nodes pull items from the Depot onto transport lines
 * - Facility nodes process inputs into outputs via recipes
 * - Sink nodes represent demand targets (the production goal)
 * - Edges represent material flows on belts/pipes between ports
 *
 * The primary workflow is **reverse derivation**: specify the Sink
 * demand, build the Facility chain, then read diagnostics to see
 * how many Supply ports and parallel transport lines are needed.
 *
 * Key concepts (see ARCHITECTURE.md for full rationale):
 * - Supply unifies PAC output ports, Depot Output (仓库取货口),
 *   and Protocol Stash (协议储存箱) — they all pull from Depot
 * - Miners do NOT appear as graph nodes (miner→Depot is wireless)
 * - Edge rates are derived from parallel count × fixed transport rate
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

/**
 * A Depot-to-transport-line output point.
 *
 * Unifies PAC output ports, Depot Output (仓库取货口), and Protocol Stash
 * (协议储存箱). The user picks which item to pull from the Depot; the
 * output rate is derived from downstream demand, and the required port
 * count is a diagnostic result.
 */
export interface SupplyNode extends BaseNode {
  type: 'supply'
  itemId: string
}

/** A processing facility running a specific recipe. */
export interface FacilityNode extends BaseNode {
  type: 'facility'
  facilityId: string
  recipeId: string
  /** Number of facility instances. */
  count: number
}

/**
 * A consumption endpoint — where items leave the production line.
 *
 * Two purposes:
 * - `demand` — "I need X/s of this item" (production goal)
 * - `disposal` — "this byproduct must go somewhere or the line jams" (forced)
 *
 * The graph structure is identical regardless of purpose. The distinction
 * affects UI presentation and default rate behavior:
 * - Demand sinks: user-specified rate (the target to satisfy)
 * - Disposal sinks: rate defaults to consuming everything arriving
 */
export interface SinkNode extends BaseNode {
  type: 'sink'
  itemId: string
  /** Target consumption rate in items / second. For demand sinks, this is user-specified. For disposal sinks, defaults to incoming rate. */
  rate: number
  /** Why this sink exists. Affects UI style and default behavior. */
  purpose: 'demand' | 'disposal'
}

export type ProductionNode = SupplyNode | FacilityNode | SinkNode

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

/**
 * A material flow on a transport line between two node ports.
 *
 * The rate is derived: `parallelCount × TRANSPORT_RATES[transportType]`.
 * For Facility→Facility edges, the rate is determined by the source
 * facility's recipe output rate. For Supply→Facility edges, it is
 * determined by the target facility's recipe input demand.
 */
export interface FlowEdge {
  id: string
  sourceId: string
  sourcePort: number
  targetId: string
  targetPort: number
  itemId: string
  /** Number of parallel transport lines carrying this flow. */
  parallelCount: number
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
  kind:
    | 'overproduction'
    | 'underproduction'
    | 'wrong_item'
    | 'port_mismatch'
    | 'port_exceeded'
    | 'unconnected_output'
    | 'cycle_detected'
  message: string
  relatedEdges: string[]
}
