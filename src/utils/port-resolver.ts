import type { Facility, Recipe, Port, TransportType } from '@/types'
import { getItem } from '@/data'

/**
 * Resolve the I/O ports of a facility running a specific recipe.
 *
 * Ports are derived from the facility's buffer layout and the recipe's
 * inputs/outputs. Each recipe item is assigned to a buffer port of the
 * matching transport type (belt, pipe, or future types).
 *
 * Handle IDs use the format "{direction}-{groupIndex}-{portInGroup}" where:
 * - direction: "in" or "out"
 * - groupIndex: which buffer group, counted across all groups
 * - portInGroup: port index within that buffer group
 *
 * This ensures handle IDs are unique even when a facility has multiple
 * independent buffer groups of the same transport type (e.g. mix_pool's
 * two separate pipe groups).
 *
 * If a recipe has more items than available ports of the matching type,
 * the excess items are still included — this represents an over-subscribed
 * port (surfaced as a diagnostic, not a port assignment issue).
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve all I/O ports for a facility running a given recipe.
 */
export function resolvePorts(
  facility: Facility,
  recipe: Recipe,
): { inputs: Port[]; outputs: Port[] } {
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
 * Items are partitioned by transport type, then each item is assigned to
 * a buffer group of its type. When a transport type has multiple buffer
 * groups (e.g. two independent pipe groups), items are distributed
 * round-robin across groups — first item → group 0, second → group 1, etc.
 */
function assignPorts(
  itemIds: string[],
  beltBuffers: Facility['buffersIn']['belt'],
  pipeBuffers: Facility['buffersIn']['pipe'],
  direction: 'in' | 'out',
): Port[] {
  // Partition items by transport type
  const groups: Record<string, string[]> = {}
  for (const itemId of itemIds) {
    const item = getItem(itemId)
    const type = item?.transportType ?? 'belt'
    if (!groups[type]) groups[type] = []
    groups[type].push(itemId)
  }

  const ports: Port[] = []

  // Process buffer groups in fixed order: belt → pipe → future types.
  // groupIndex is global across all buffer groups.
  const bufferGroups: Array<{ key: string; buffers: Facility['buffersIn']['belt'] }> = [
    { key: 'belt', buffers: beltBuffers },
    { key: 'pipe', buffers: pipeBuffers },
  ]

  let groupIndex = 0

  for (const { key, buffers } of bufferGroups) {
    const items = groups[key] ?? []

    // Build a list of { groupIndex, maxPorts } for this transport type
    const groupsOfType: Array<{ gIdx: number; maxPorts: number }> = []
    for (let i = 0; i < buffers.length; i++) {
      groupsOfType.push({ gIdx: groupIndex + i, maxPorts: buffers[i]!.ports })
    }

    // Assign items round-robin across groups of this type
    // Each group tracks how many ports are occupied
    const occupancy = groupsOfType.map(() => 0)
    let groupCursor = 0

    for (const itemId of items) {
      // Find next group that still has capacity (or use first group if all full)
      let foundWithCapacity = false
      for (let attempt = 0; attempt < groupsOfType.length; attempt++) {
        const idx = (groupCursor + attempt) % groupsOfType.length
        if (occupancy[idx]! < groupsOfType[idx]!.maxPorts) {
          groupCursor = idx
          foundWithCapacity = true
          break
        }
      }
      // If all groups are full, just use current cursor (oversubscription)
      if (!foundWithCapacity) {
        groupCursor = groupCursor % groupsOfType.length
      }

      const targetGroup = groupsOfType[groupCursor]!
      const portInGroup = occupancy[groupCursor]!

      ports.push({
        handleId: `${direction}-${targetGroup.gIdx}-${portInGroup}`,
        direction,
        groupIndex: targetGroup.gIdx,
        portInGroup,
        itemId,
        transportType: key as TransportType,
        connected: false,
      })

      occupancy[groupCursor]!++
      // Move to next group for round-robin
      groupCursor = (groupCursor + 1) % groupsOfType.length
    }

    groupIndex += buffers.length
  }

  return ports
}
