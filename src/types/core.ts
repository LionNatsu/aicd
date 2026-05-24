/**
 * Core data types for the AIC (Automated Industry Complex) game system.
 *
 * Aligned with the endfield-calc project data model for future data sharing.
 * Item/Facility names are not embedded here — they live in i18n JSON files.
 */

// ---------------------------------------------------------------------------
// Transport type
// ---------------------------------------------------------------------------

/**
 * Logistics transport type. Extensible for future game updates
 * (e.g. gas pipelines).
 */
export type TransportType = 'belt' | 'pipe'

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------

/**
 * A game item — raw resource, intermediate material, or finished product.
 * Names are resolved via i18n, not stored here.
 */
export interface Item {
  id: string
  tier: number
  /** How this item is transported. Defaults to 'belt' if omitted. */
  transportType?: TransportType
  /** false = only an intermediate, not a valid user production target. */
  asTarget?: boolean
}

// ---------------------------------------------------------------------------
// Recipe
// ---------------------------------------------------------------------------

/**
 * An item–quantity pair used in recipe inputs and outputs.
 */
export interface RecipeItem {
  itemId: string
  amount: number
}

/**
 * A production recipe that runs in a single facility.
 *
 * Production rate for a given output = `outputs[i].amount / craftingTime`
 * (items per second).
 */
export interface Recipe {
  id: string
  facilityId: string
  inputs: RecipeItem[]
  outputs: RecipeItem[]
  /** Single crafting cycle duration in seconds. */
  craftingTime: number
}

// ---------------------------------------------------------------------------
// Facility
// ---------------------------------------------------------------------------

/**
 * One logical I/O stream of a building, carrying its physical port count.
 * The port count determines how many distinct items can flow through this
 * buffer simultaneously — a key constraint for line-balancing.
 */
export interface Buffer {
  ports: number
}

/**
 * Belt and pipe buffers for one direction (in or out).
 * Belt = solid items, Pipe = liquid items.
 */
export interface Buffers {
  belt: Buffer[]
  pipe: Buffer[]
}

/**
 * Per-domain placement cap. The instance limit is `base + sum(increments)`.
 * `null` on a Facility means uncapped.
 */
export interface PlacementCap {
  base: number
  increments: number[]
}

/**
 * Building categories from the game enum `GEnums.FacBuildingType`.
 */
export enum FacilityCategory {
  MachineCrafter = 6,
  Loader = 10,
  Pump = 25,
  FluidReaction = 27,
  LiquidCleaner = 28,
}

/**
 * A factory building / production facility.
 *
 * Multi-formula capability is signalled by the presence of `cacheSlots`
 * (e.g. mix_pool_1 has 5 slots, mix_pool_2 has 8). Without `cacheSlots`,
 * the building is single-formula (one recipe at a time).
 */
export interface Facility {
  id: string
  /** Numeric entity id from game data. */
  numId: number
  tier: number
  category: FacilityCategory
  /** Power draw per active building (0 = passive). */
  powerConsumption: number
  buffersIn: Buffers
  buffersOut: Buffers
  /**
   * Mix-pool inner-slot budget. Present only on FluidReaction buildings;
   * its presence is the multi-formula capability flag.
   */
  cacheSlots?: number
  /** Numeric domain IDs where this facility can be placed. Empty = anywhere. */
  domains: number[]
  cap: PlacementCap | null
  iconUrl?: string
}
