# AICD Architecture Concepts

> This document distills the game mechanics relevant to AICD into a clean conceptual model.
> It is intentionally decoupled from implementation — the goal is to get the abstractions right.
> For CN/EN terminology, see [docs/terminology.md](docs/terminology.md).

## Core Insight

**AICD draws edges on conveyor belts and pipes, not in Depot storage.**

The graph models material flows on transport lines — what goes onto a belt or into a pipe, where it goes, and at what rate. Anything that happens wirelessly or inside Depot storage is outside the graph.

This has a crucial implication: miners do not appear as nodes in the graph. Miners send ore to the Depot wirelessly (no belt, no pipe, no edge). The ore re-enters the graph only when a Supply node pulls it from the Depot onto a belt.

## Core Abstraction

AICD models a production line as a **directed graph** of nodes and edges.

- **Nodes** are entities that put items onto or take items off transport lines.
- **Edges** are physical material flows on conveyor belts or pipes between nodes.
- The graph is **schematic**, not spatial — it captures what connects to what and at what rate, not where things are placed.

---

## Node Types

### Supply (物品入口)

A Supply node pulls items from the Depot and puts them onto a transport line. It is the **only way solid items enter the graph**.

This concept unifies three game entities that do the same thing — take items from Depot and output them onto belts/pipes:

| Game entity     | CN           | Ports                    | Notes                                               |
| --------------- | ------------ | ------------------------ | --------------------------------------------------- |
| PAC output port | PAC 输出端口 | 6 built-in               | The baseline; primary throughput bottleneck         |
| Depot Output    | 仓库取货口   | Extensible via Depot Bus | Expand beyond PAC's 6-port limit                    |
| Protocol Stash  | 协议储存箱   | 6 item slots             | Wireless Depot access; also acts as overflow buffer |

Key properties:

- **Finite output ports** — the primary throughput constraint in the game
- Each port is configured to output one specific item
- Per-port rate is determined by transport type (belt: 0.5/s, pipe: 2.0/s)
- Total output rate = `portCount × perPortRate`
- A Supply node may also output fluids (e.g., Fluid Pump) — fluids bypass Depot and go directly to pipes

**Why unify PAC / Depot Output / Protocol Stash?** Because in the graph they play the identical role: "take an item from storage and put it on a transport line." The differences (built-in vs extensible ports, wireless vs bus-attached) are parameter variations, not role differences.

### Facility (加工设施)

A building that runs a recipe, consuming inputs and producing outputs at rates determined by the recipe's crafting time.

Key properties:

- Runs exactly one recipe at a time
- Can have multiple instances (`count`), scaling throughput proportionally
- I/O ports are derived from the recipe + the facility's buffer layout
- Each port carries one item, constrained to a transport type (belt or pipe)
- Some facilities produce byproducts that must be consumed or disposed of

Facilities are the workhorses of the graph. Most of the interesting constraints come from their port layouts and recipe rates.

### Sink (消耗终点)

A Sink is an item consumption endpoint — a node with no outgoing edges where items leave the production line.

In the game, there are **two reasons** to create a Sink, and the distinction matters for the user's mental model:

#### Demand Sink (需求终点)

"I need X/s of this item" — the production goal. The user deliberately wants this item produced.

Examples:

- "I need 6 Amethyst Components/s for building"
- "I need 18 HC Valley Batteries/s for the stable-18 setup"

Corresponds to: PAC input ports, Depot Intake (仓库存货口), or abstract demand.

#### Disposal Sink (处置终点)

"This item must go somewhere or the line jams" — forced by a byproduct constraint. The user doesn't want the item; they're forced to handle it.

Examples:

- Sewage (污水) from Reactor Crucible — must route to Water Treatment Unit or the facility stops
- Inert Xircon Effluent (惰性壤晶废液) — must route to Water Treatment Unit or Purifier

Corresponds to: Water Treatment Unit (废水处理机, destroys items), or a facility that consumes the byproduct as input.

**Key game rule: every byproduct must have somewhere to go.** If any facility output has no outgoing edge, the facility jams, and the jam cascades upstream. In AICD, this is flagged by the `unconnected_output` diagnostic.

**Modeling choice: Demand and Disposal are the same Sink type with a `purpose` tag.** The graph structure and diagnostic logic are identical — both are nodes that consume items at a rate with no outgoing edges. The `purpose` field only affects:

- **UI presentation**: Disposal Sinks get a distinct visual style (e.g. red/orange accent vs green) to signal "you must handle this"
- **Default rate**: Demand Sinks have a user-specified rate (the target); Disposal Sinks default to consuming everything arriving (rate = sum of incoming edge rates)
- **Sidebar UX**: The Sink tab should make it easy to add disposal targets for common byproducts (Sewage, Inert Xircon Effluent, etc.)

---

## What About Miners?

Miners (Portable Originium Rig, Electric Mining Rig, etc.) produce raw resources and **wirelessly deposit them into the Depot**. Because:

- Miner → Depot is wireless (no belt, no pipe)
- No edge exists on the transport layer
- The ore re-enters the graph only when a Supply node pulls it out

Therefore, **miners are not nodes in the graph**. Their effect is modeled as a Depot supply rate — "how fast is this ore entering the Depot?" — which constrains how fast Supply nodes can output that ore. This can be tracked as a Depot inventory readout, not a graph element.

The one exception is the **Hydro Mining Rig** (水力采矿钻机), which produces Cuprium Ore + Sewage. Since Sewage cannot go into the Depot, the Hydro Mining Rig does produce a pipe-level output (Sewage) that must be routed. In this case, it can be modeled as a Facility with 0 solid inputs and 2 outputs (one solid to Depot, one fluid to pipe).

---

## Two Logistics Systems

The game has two parallel logistics systems with fundamentally different routing:

### Solid items (belt-routed, Depot-mediated)

```
Miner ──(wireless)──▶ Depot ──(Supply node)──▶ Belt ──▶ Facility ──▶ Belt ──▶ Facility ──▶ ... ──▶ Sink
                       ▲                                                                    │
                       └───────────────(Depot Intake / Protocol Stash)──────────────────────┘
```

All solid items pass through the Depot. The Supply node is the only way to get them onto a belt.

### Fluid items (pipe-routed, no Depot)

```
Fluid Pump ──▶ Pipe ──▶ Facility ──▶ Pipe ──▶ Facility ──▶ ... ──▶ Sink
                  │
                  └──▶ Fluid Tank (storage, not Depot)
```

Fluids never enter the Depot. They are piped directly between facilities or stored in Fluid Tanks. The Supply node for fluids corresponds to a Fluid Pump, not a PAC port.

**This distinction is important for rate calculation and constraint checking** — a belt-routed Supply is Depot-constrained (how much is in the Depot?), while a pipe-routed Supply is production-constrained (how fast is the pump producing?).

---

## Edge Concepts

### Flow

A directed connection from one node's output port to another node's input port, carrying a single item type.

Key properties:

- **Item**: which item flows through this edge (inferred from the source port)
- **Transport type**: belt, pipe, or conduit — determines the rate per line
- **Parallel count**: how many parallel transport lines carry this flow
- **Rate**: derived as `parallelCount × transportRate`, not manually entered

### Transport Rates (Fixed Constants)

These are hard simulation constants in the game, not user-configurable:

| Transport | Rate per line | Notes                        |
| --------- | ------------- | ---------------------------- |
| Belt      | 0.5 /s        | 1 item every 2 seconds       |
| Pipe      | 2.0 /s        | Standard above-ground pipe   |
| Conduit   | 1.5 /s        | Underground pipe; 25% slower |

Important: Forge of the Sky requires the full 2.0/s from standard pipes. Using Conduits (1.5/s) starves it.

### Port Rate

A Supply output port or facility I/O port flows at the same rate as the attached transport line. This is because a port IS a belt/pipe connection point — the per-port rate equals the transport rate.

---

## Constraints AICD Should Check

### Port Constraints

- **Unconnected output**: A facility recipe output with no outgoing edge will cause the facility to jam in-game.
- **Port oversubscription**: More recipe items than available buffer ports of the matching transport type.
- **Supply port limit**: Total configured Supply output ports exceed the Supply node's maximum.

### Rate Balancing

- **Underproduction**: Input edges deliver less than the facility's recipe requires.
- **Overproduction**: A Supply port outputs more than downstream edges carry (material backs up).
- **Transport bottleneck**: A single belt (0.5/s) feeding a facility that needs > 0.5/s — flag that parallel lines are needed.

### Depot Supply Constraint

- **Depot depletion**: If the total output rate of Supply nodes for a given item exceeds the Depot input rate (from miners, etc.), the Depot will eventually empty. This is a sustainability warning.

### Placement Constraints

- **Region restriction**: Some facilities can only be placed in certain regions (e.g., Forge of the Sky in Wuling only).
- **Quantity cap**: Some facilities have a maximum count across the entire production line (e.g., Forge of the Sky: max 2).
- These are enforced when the production line is associated with a specific region.

### Structural

- **Cycles**: Valid and common in the game (seed loops, byproduct recycling). Flagged as informational, not errors.
- **Wrong item**: An edge carries a different item than the target port expects.

### Byproduct Cascade

In the game, **every facility output must have somewhere to go**. If an output port has no outgoing edge:

1. The facility jams (stops producing)
2. The jam propagates upstream (facilities feeding this one also back up)
3. This can cascade across the entire production line

This is especially critical for fluid byproducts (Sewage, Xircon Effluent) — they cannot enter the Depot and must be piped directly to a consumer or disposal facility. The `unconnected_output` diagnostic and Disposal Sink type address this.

---

## What AICD Does NOT Model

These game mechanics are out of scope for a schematic balancing tool:

- **Physical layout**: 3D placement, cable reach, pylon radius, building adjacency
- **Power grid**: Thermal Banks, Relay Towers, Pylons, cable wiring — instead, AICD shows a power budget summary (total draw → recommended Thermal Bank count by fuel type)
- **Real-time simulation**: AICD computes steady-state rates, not time-dependent behavior
- **Combat**: Gun towers, sentries, etc. are not production facilities
- **Miner→Depot wireless transfer**: This happens outside the transport layer; tracked as a Depot supply rate, not graph edges
- **Depot Bus routing**: Whether items go through PAC ports or Depot Bus ports is a parameter of the Supply node, not a separate graph element

---

## Conceptual Flow

```
 ┌─────────┐                              ┌──────────────┐
 │  Supply  │─── belt/pipe ───────────────▶│   Facility   │
 │(PAC/ Depot│   rate = ports × 0.5/2.0   │  (recipe)    │
 │ Output/  │                              └──────┬───────┘
 │ Stash)   │                              ┌──────▼───────┐
 └─────────┘                              │   Facility   │───┐
                                          └──────┬───────┘   │ cycle
                                          ┌──────▼───────┐   │
                                          │   Facility   │◀──┘
                                          └──────┬───────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                         │
                              ┌─────▼──────┐          ┌───────▼──────┐
                              │Sink (demand)│          │Sink (disposal)│
                              │"I want X/s" │          │"must handle" │
                              └────────────┘          └──────────────┘
```

---

## Modeling Priorities

1. **Supply node** — replace current Source with a Depot-output model (finite ports, auto-calculated rate). This is the most impactful change; it correctly models the game's primary bottleneck.
2. **Transport rate accuracy** — rates derived from fixed constants (belt/pipe/conduit) × parallel count, not user-typed. Foundation of correct balancing.
3. **Unconnected output diagnostics** — byproduct handling is critical for avoiding jams.
4. **Mining data in catalog** — miners as facilities (0 inputs) for completeness, even though they don't appear as graph nodes.
5. **Power budget summary** — total draw → recommended Thermal Banks. Helpful but secondary.
6. **Region/placement constraints** — data model is ready; UI enforcement comes later.
