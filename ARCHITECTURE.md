# AICD Architecture Concepts

> This document distills the game mechanics relevant to AICD into a clean conceptual model.
> It is intentionally decoupled from implementation — the goal is to get the abstractions right.

## Core Abstraction

AICD models a production line as a **directed graph** of nodes and edges.

- **Nodes** are production entities that consume and/or produce items.
- **Edges** are material flows carrying a specific item at a specific rate between nodes.
- The graph is **schematic**, not spatial — it captures what connects to what and at what rate, not where things are physically placed.

---

## Node Types

### PAC (Protocol Automation Core)

The PAC is the source of all items entering a production chain. It pulls items from the shared Depot and outputs them through **finite, configurable ports**.

Key properties:

- Has a fixed maximum number of output ports (the game's primary throughput ceiling)
- Each port is configured to output one specific item
- Per-port rate is determined by transport type (belt: 0.5/s, pipe: 2.0/s)
- Multiple PACs in the same region share a Depot

This is the most common way items enter a production line. The PAC's finite ports make it the key bottleneck to plan around.

### Source (External Supply)

An abstract item source with no port constraints. Used for "what-if" analysis: "if I had 10 Amethyst Fiber/s coming in, how many Fitting Units do I need?"

Not tied to a specific game entity. A scratchpad concept for planning without committing to a specific PAC configuration.

### Facility (Processing Building)

A building that runs a recipe, consuming inputs and producing outputs at rates determined by the recipe's crafting time.

Key properties:

- Runs exactly one recipe at a time
- Can have multiple instances (`count`), scaling throughput proportionally
- I/O ports are derived from the recipe + the facility's buffer layout
- Each port carries one item, constrained to a transport type (belt or pipe)
- Some facilities produce byproducts that must be consumed or disposed of

Facilities are the workhorses of the graph. Most of the interesting constraints come from their port layouts and recipe rates.

### Sink (Demand Target)

An item consumption endpoint. Represents "I need X/s of this item" — the production goal that the rest of the line must satisfy.

Like Source, this is an abstract role rather than a specific game entity. In practice it may correspond to a Depot intake, Protocol Stash, or an end-product demand target.

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

| Transport | Rate per line |
| --------- | ------------- |
| Belt      | 0.5 /s        |
| Pipe      | 2.0 /s        |
| Conduit   | 1.5 /s        |

Conduits are underground pipes — 25% slower than standard pipes. The game requires standard pipes for high-demand facilities (e.g., Forge of the Sky at 2.0/s).

### Port Rate

A PAC output port flows at 0.5/s (identical to belt speed). This is because a port is effectively a belt connection point. Facility I/O ports follow the same per-port rate limit determined by their buffer's transport type.

---

## Constraints AICD Should Check

### Port Constraints

- **Unconnected output**: A facility recipe output with no outgoing edge will cause the facility to jam in-game.
- **Port oversubscription**: More recipe items than available buffer ports of the matching transport type.
- **PAC port limit**: Total configured PAC output ports exceed the PAC's maximum.

### Rate Balancing

- **Underproduction**: Input edges deliver less than the facility's recipe requires.
- **Overproduction**: A source/PAC port outputs more than downstream edges carry (material backs up).
- **Transport bottleneck**: A single belt (0.5/s) feeding a facility that needs > 0.5/s — flag that parallel lines are needed.

### Placement Constraints

- **Region restriction**: Some facilities can only be placed in certain regions (e.g., Forge of the Sky in Wuling only).
- **Quantity cap**: Some facilities have a maximum count across the entire production line (e.g., Forge of the Sky: max 2).
- These are enforced when the production line is associated with a specific region.

### Structural

- **Cycles**: Valid and common in the game (seed loops, byproduct recycling). Flagged as informational, not errors.
- **Wrong item**: An edge carries a different item than the target port expects.

---

## What AICD Does NOT Model

These game mechanics are out of scope for a schematic balancing tool:

- **Physical layout**: 3D placement, cable reach, pylon radius, building adjacency
- **Power grid**: Thermal Banks, Relay Towers, Pylons, cable wiring — instead, AICD shows a power budget summary (total draw → recommended Thermal Bank count by fuel type)
- **Real-time simulation**: AICD computes steady-state rates, not time-dependent behavior
- **Combat**: Gun towers, sentries, etc. are not production facilities

---

## Conceptual Flow

```
                    ┌──────────┐
                    │   PAC    │ finite output ports, each at 0.5/s (belt) or 2.0/s (pipe)
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │ Facility │ recipe-driven I/O, multiple instances scale throughput
                    └────┬─────┘
                    ┌────▼─────┐
                    │ Facility │ byproducts must be consumed or disposed of
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │   Sink   │ "I need X/s of this item"
                    └──────────┘

  Source ──(what-if supply)──▶ Facility  (abstract, no port constraints)
```

---

## Modeling Priorities

When implementing features, follow this priority order:

1. **Transport rate accuracy** — rates must be derived from fixed constants, not user-typed. This is the foundation of correct balancing.
2. **PAC as a node type** — it is the primary throughput bottleneck in the game and the most common entry point for items.
3. **Mining facilities** — they are the game's raw material sources and should be in the facility catalog.
4. **Unconnected output diagnostics** — byproduct handling is critical for avoiding jams.
5. **Power budget summary** — helpful but secondary; can be a readout panel.
6. **Region/placement constraints** — the data model is ready; UI enforcement can come later.
