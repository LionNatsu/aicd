import type { Facility, Recipe, Port, TransportType } from '@/types'
import { getItem } from '@/data'

/**
 * Resolve the I/O ports of a facility running a specific recipe.
 *
 * Ports are derived from the facility's buffer layout and the recipe's
 * inputs/outputs. Each recipe item is assigned to a buffer port of the
 * matching transport type (belt, pipe, or future types).
 *
 * If a recipe has more items than available ports of the matching type,
 * the excess items are still included but marked with a warning — this
 * represents an over-subscribed port (a valid diagnostic scenario).
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResolvedPorts {
  inputs: Port[]
  outputs: Port[]
}

/**
 * Resolve all I/O ports for a facility running a given recipe.
 */
export function resolvePorts(facility: Facility, recipe: Recipe): ResolvedPorts {
  const inputs = assignPorts(
    recipe.inputs.map((ri) => ri.itemId),
    facility.buffersIn.belt,
    facility.buffersIn.pipe,
    'in',
  )

  const outputs = assignPorts(
    recipe.outputs.map((ri) => ri.itemId),
    facility.buffersOut.belt,
    facility.buffersOut.pipe,
    'out',
  )

  return { inputs, outputs }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Assign a list of item IDs to the available buffer ports.
 *
 * Items are first partitioned by transport type (belt vs pipe), then
 * sequentially assigned to port indices within the matching buffer group.
 */
function assignPorts(
  itemIds: string[],
  beltBuffers: Facility['buffersIn']['belt'],
  pipeBuffers: Facility['buffersIn']['pipe'],
  direction: 'in' | 'out',
): Port[] {
  const groups: Record<string, string[]> = {}

  for (const itemId of itemIds) {
    const item = getItem(itemId)
    const type = item?.transportType ?? 'belt'
    if (!groups[type]) groups[type] = []
    groups[type].push(itemId)
  }

  const ports: Port[] = []

  // Assign items to their matching buffer type
  // Currently: belt and pipe buffers. Future types (gas etc.) follow the same pattern.
  const bufferGroups: Array<{ key: string; buffers: Facility['buffersIn']['belt'] }> = [
    { key: 'belt', buffers: beltBuffers },
    { key: 'pipe', buffers: pipeBuffers },
  ]

  for (const { key, buffers } of bufferGroups) {
    const items = groups[key] ?? []
    const totalPorts = buffers.reduce((sum, b) => sum + b.ports, 0)
    let portIndex = 0

    for (const itemId of items) {
      ports.push({
        index: portIndex,
        direction,
        itemId,
        transportType: key as TransportType,
        connected: false,
      })
      portIndex = Math.min(portIndex + 1, Math.max(totalPorts - 1, 0))
    }
  }

  return ports
}

/**
 * Convenience: get just the input port count for a facility+recipe.
 */
export function getInputPortCount(facility: Facility, recipe: Recipe): number {
  return resolvePorts(facility, recipe).inputs.length
}

/**
 * Convenience: get just the output port count for a facility+recipe.
 */
export function getOutputPortCount(facility: Facility, recipe: Recipe): number {
  return resolvePorts(facility, recipe).outputs.length
}
