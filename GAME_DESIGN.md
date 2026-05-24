# AIC Game Mechanics Reference

> Arknights: Endfield — Automated Industry Complex (AIC) system design reference.
> This document captures the actual game mechanics to inform AICD's data model and feature design.

## Overview

The AIC is a Factorio-style factory automation system that runs **24/7, including while offline**. It is described as "half the game." The core loop:

**Extract** raw resources → **Move** into storage (Depot) → **Output** from PAC → **Process** via facilities → **Consume** intermediates to make end products

Every production chain follows the same repeating pattern at different material tiers:

| Layer  | Function                    |
| ------ | --------------------------- |
| Raw    | Miners → Depot              |
| Refine | Raw → Refined basics        |
| Build  | Basics → Components         |
| Finish | Components → Final products |

**Critical design rule:** Never scale end products until intermediates are comfortably overproduced. Most stalls are caused by one missing intermediate that feeds multiple end products.

---

## PAC (Protocol Automation Core)

The PAC is the **central hub** of every AIC. Each region has one main PAC, plus Sub-PACs at outposts.

### Key Mechanics

- **Output Ports** can be configured to output a specific item from the Depot
- When a conveyor belt is attached to a configured output port, it supplies that item as long as Depot has stock and the output is not backed up
- **Ports are a limited resource** — once all ports are consumed, you hit the absolute throughput ceiling
- **Automation starts at the PAC, not at the machine**
- Sub-PACs share storage (Depot) with the main PAC within each region
- Best practice: dedicate main PAC to manufacturing, Sub-PAC to power generation/battery production

### Item Flow

```
PAC (output configured item)
  → Conveyor Belt
    → Facility Input
      → [Processing]
        → Facility Output
          → Conveyor Belt
            → Next Facility / PAC Input / Protocol Stash → Depot
```

### Port Flow Rate

- **0.5 units/s per port** (identical to belt speed)
- This is a hard simulation constant, not a soft cap

---

## Transport Types

### Conveyor Belts (Solid Items)

- **Flow rate:** 0.5 units/s (1 item every 2 seconds) — hard simulation constant
- **Throughput:** 60 items/minute per belt
- Any machine consuming faster than 0.5/s requires **multiple parallel input belts**
- **Splitters** divide one belt into 2–3 output lines (free, unlimited placement)
- **Belt Bridges** allow belts to cross without interference

### Pipes (Fluids — Above Ground)

- **Standard Pipes:** 2.0 units/s — for high-demand facilities
- **Conduits (Underground):** 1.5 units/s — 25% slower than standard pipes
- Conduits consist of matched Inlet/Outlet pairs for underground fluid transport
- **Critical warning:** Forge of the Sky requires the full 2.0/s from standard pipes; using Conduits starves it

### Depot Bus System

- Provides standardized routing for items to/from Depot
- In Wuling: Depot Bus is **free-placement** (more flexible)
- In Valley IV: Depot Bus has **fixed positions**

---

## Facility Categories

### Processing Facilities

| Facility             | Function                                                |
| -------------------- | ------------------------------------------------------- |
| Refining Unit        | High-temperature smelting of raw materials              |
| Moulding Unit        | Produces containers via stamp moulding                  |
| Fitting Unit         | Processes various parts and components                  |
| Shredding Unit       | Shreds/pulverizes materials; critical for battery lines |
| Planting Unit        | Silo for growing common plants/crops                    |
| Seed-Picking Unit    | Extracts seeds from common crops                        |
| Water Treatment Unit | Processes/destroys Sewage and Xircon Effluent           |

### Gear Facilities

| Facility         | Function                                                    |
| ---------------- | ----------------------------------------------------------- |
| Reactor Crucible | Runs solid or liquid-state chemical reactions (mixing pool) |
| Forge of the Sky | Produces Xiranite-based products (Wuling only, max 2 total) |
| Gearing Unit     | Laminates different materials together                      |
| Grinding Unit    | Fine grinding of powdered materials                         |
| Packaging Unit   | Packages power components (e.g., batteries)                 |
| Filling Unit     | Fills containers with various materials                     |
| Separating Unit  | Physically separates items                                  |

### Power Facilities

| Facility       | Function                                                                  |
| -------------- | ------------------------------------------------------------------------- |
| Thermal Bank   | Converts fuel (ore/batteries) into electrical power via pulsed generation |
| Relay Tower    | Transmits power within **80m radius**; doesn't power machines directly    |
| Electric Pylon | Wirelessly powers all facilities within **30m radius**                    |
| Xiranite Pylon | Auto-connects to PAC & Xiranite Relays (80m); Wuling only                 |
| Xiranite Relay | Auto-connects to PAC & Xiranite facilities (80m); Wuling only             |

### Mining Facilities

| Facility                  | Output                | Power                   |
| ------------------------- | --------------------- | ----------------------- |
| Portable Originium Rig    | Originium Ore         | Self-powered            |
| Electric Mining Rig       | Originium/Krystallite | Required                |
| Electric Mining Rig Mk II | Ferrium Ore           | Required                |
| Hydro Mining Rig          | Cuprium Ore + Sewage  | No power (water-driven) |
| Fluid Pump                | Fluids                | Required                |

### Storage & Logistics

| Facility          | Function                                                           |
| ----------------- | ------------------------------------------------------------------ |
| Protocol Stash    | Storage with item slots; **teleports items to Depot** when powered |
| Depot Bus Port    | Origin of the Depot Bus; placed in Core AIC Area                   |
| Depot Bus Section | Extends Depot Bus; Loaders/Unloaders attach to it                  |
| Depot Loader      | Loads goods from AIC Factory to local depot                        |
| Depot Unloader    | Unloads goods from local depot into AIC Factory                    |
| Fluid Tank        | Stores fluids                                                      |
| Conduit Inlet     | Inlet for underground pipeline; pairs with Conduit Outlet          |
| Conduit Outlet    | Outlet for underground pipeline; pairs with Conduit Inlet          |

---

## Buffer & Port Mechanics

### Port System

- PAC and Depot Bus have **finite input/output ports**
- Each port flows at 0.5 units/s (matches belt speed)
- Endgame layout must be planned around total available port capacity

### Protocol Stash (Key Buffer)

- Has several item storage slots
- When powered, **teleports items directly to Depot** — eliminates need for long return belts
- Should be positioned between processing stages to keep layouts compact

### Three Jam Patterns

| Pattern           | Cause                                    | Fix                                               |
| ----------------- | ---------------------------------------- | ------------------------------------------------- |
| Output backup     | Output has nowhere to go → machines stop | Ensure outputs have clear path to storage         |
| Input competition | Two consumers fight over one input       | Dedicate a port to critical input; isolate module |
| Wrong item inject | Wrong item routed into a line            | Shorten routing, isolate module, dedicate port    |

---

## Power System

### Power Generation

| Fuel                    | Wattage | Burn Duration |
| ----------------------- | ------- | ------------- |
| Source Ore (Originium)  | 50w     | 8s            |
| LC Valley Battery       | 220w    | 40s           |
| SC Valley Battery       | 420w    | 40s           |
| HC Valley Battery       | 1,100w  | 40s           |
| LC Wuling Battery (Alt) | 1,600w  | 40s           |

### Power Consumption Examples

| Process              | Power Cost |
| -------------------- | ---------- |
| Amethyst Component   | 20w        |
| Buck Capsule [C]     | 75w        |
| Industrial Explosive | 75w        |
| LC Valley Battery    | 55w        |
| SC Valley Battery    | 90w        |
| HC Valley Battery    | 135w       |

### Key Mechanics

- Thermal Bank generation is **pulsed**, not continuous
- **Thermal Pool** buffers between banks and consumers to smooth pulse patterns
- **Death Spiral risk:** If power runs out → Shredding/Packaging stop → no batteries → Thermal Banks die → total shutdown
- Prevention: Keep one Thermal Bank connected to a dedicated Originium miner as backup

### Power Grid Wiring

| Source         | Max Cable Reach |
| -------------- | --------------- |
| PAC            | 80m             |
| Relay Tower    | 80m             |
| Electric Pylon | 30m             |

- Relay Towers **cannot** power machines directly — need Electric Pylons as intermediary
- Wuling: Xiranite Pylons/Relays auto-connect to PAC (no manual wiring)

---

## Regions & Placement

### Region System

| Region            | Signature Material     | Notes                             |
| ----------------- | ---------------------- | --------------------------------- |
| The Hub           | Originium Ore          | Starting area, basic materials    |
| Origin Lodespring | Amethyst Ore           | Mid-tier, gear crafting           |
| Valley IV         | Ferrium Ore            | Top-tier outpost production       |
| Wuling            | Cuprium Ore / Xiranite | Water-based mining, most advanced |

### Placement Limits

- Each map has a Protocol Capacity limiting buildings outside the base
- **Forge of the Sky:** Maximum **2 total** across all Wuling AICs
- Factory space can be expanded via the AIC Steward using Stock Bills
- Sub-PACs effectively expand total production capacity

### Regional Differences

| Feature            | Valley IV               | Wuling                         |
| ------------------ | ----------------------- | ------------------------------ |
| Power wiring       | Manual (Relay + Pylons) | Auto-connecting Xiranite       |
| Depot Bus          | Fixed positions         | Free-placement                 |
| Signature material | Ferrium, Amethyst       | Xiranite                       |
| Power bootstrap    | Built locally           | Must transfer Valley batteries |

---

## Material Processing Chains

### Ore Types

| Ore           | Region            | Tier    |
| ------------- | ----------------- | ------- |
| Originium Ore | The Hub           | Lowest  |
| Amethyst Ore  | Origin Lodespring | Mid     |
| Ferrium Ore   | Valley IV         | High    |
| Cuprium Ore   | Wuling            | Highest |
| Krystallite   | Mining Rig output | Extra   |
| Xiranite      | Wuling (Forge)    | Wuling  |

### Chain Examples

**Early Game — Amethyst Components (~6/min):**

```
Amethyst Ore → Refining Unit → Amethyst Fiber ─┐
Amethyst Ore → Refining Unit → Amethyst Bottle ─┤→ Fitting Unit → Amethyst Components
Originium Ore → Shredding Unit → Origocrust ────┘
```

**Early Game — Buck Capsule C:**

```
Buckflower farm → Seed-planter loop → Shredding Unit → Filling Unit (+ Amethyst Bottle) → Buck Capsule C
```

**Battery Production:**

```
[Materials] → Shredding Unit → Packaging Unit → Battery → Thermal Bank
```

**Valley Battery Tiers:**

```
Originium Ore → Smelter → Refined Originium → Fabricator → Gear Components → ... → LC Valley Battery (220w)
                                                                        → ... → SC Valley Battery (420w)
                                                                        → ... → HC Valley Battery (1,100w)
```

**Wuling Fluid Chain:**

```
Liquid Xiranite + Sewage → Reactor Crucible → Xircon Effluent + Inert Xircon Effluent
Xircon Effluent + Ferrium Powder → Reactor Crucible → Xircon + Sewage (byproduct)
Xircon + Dense Originium Powder → Packaging Unit → SC Wuling Battery
```

### Essential Production Ratios

| Ratio | Setup                              | Explanation                                                |
| ----- | ---------------------------------- | ---------------------------------------------------------- |
| 2:1   | 2 Refining Units → 1 Moulding      | Refiners output 0.5 fiber/s each; Moulder needs 1.0/s      |
| 1:2   | 1 Seed-Picking → 2 Planting        | One loops back for re-seeding, one produces surplus        |
| 1:4   | 1 Packaging Unit → 4 Thermal Banks | 1 battery/10s from Packaging; 1/10s per Bank = equilibrium |

---

## Reactor Crucible (Mixing Pools)

The Reactor Crucible is the fluid/chemical reaction facility, unlocked via the Liquid Reaction Node.

### How It Works

- Accepts both **solid and liquid-state** inputs
- Runs chemical reactions combining fluid and/or solid ingredients
- Produces fluid products (and sometimes byproducts)
- Has `cacheSlots` (e.g. mix_pool_1 has 5 slots, mix_pool_2 has 8) indicating multi-formula capability

### Key Recipes

| Inputs                           | Output          | Byproduct             |
| -------------------------------- | --------------- | --------------------- |
| Liquid Xiranite + Sewage         | Xircon Effluent | Inert Xircon Effluent |
| Xircon Effluent + Ferrium Powder | Xircon          | Sewage (2:1 ratio)    |

### Fluid Byproducts & Disposal

- **Sewage:** Industrial byproduct from Cuprium and Xircon production. Must go to Water Treatment Unit or be used as production input
- **Inert Xircon Effluent:** No use; must be disposed of via Water Treatment Unit
- The Xircon production chain consumes 2 Sewage but only outputs 1 as byproduct, creating chronic shortage

---

## Implications for AICD Design

### What the tool should model

1. **PAC as a first-class concept** — it is the source of all items entering the production chain, not just an abstract "Source" node
2. **Depot as shared storage** — PAC/Sub-PAC share a Depot; Protocol Stash teleports to Depot
3. **Port count is a hard constraint** — PAC output ports, facility input/output buffers are finite and limit throughput
4. **Transport rates are fixed constants** — belt 0.5/s, standard pipe 2.0/s, conduit 1.5/s; these are not user-configurable
5. **Power budget** — every facility has power consumption; Thermal Banks generate power from fuel; death spirals are real
6. **Placement caps per region** — some facilities have global limits (e.g. Forge of the Sky max 2)
7. **Byproduct handling** — some recipes produce multiple outputs including waste that must be disposed of
8. **Cyclic production** — seed-plant loops, Sewage recycling are valid and common

### What the tool does NOT need to model (for a production-line balancing tool)

- Physical placement / 3D layout (this is a schematic/balancing tool, not a base builder)
- Combat tower placement
- Zipline routing
- Real-time simulation (the tool calculates rates, not animates)
