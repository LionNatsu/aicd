# AIC Terminology (CN / EN)

> Facility and concept names in Arknights: Endfield's AIC system.
> CN names are in-game simplified Chinese; EN names are community translations where no official English localization exists.

## Core Concepts

| CN               | EN                             | Description                                                                                                 |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 集成工业中心     | Depot                          | Central shared storage; receives, stores, and distributes materials. Shared by PAC/Sub-PAC within a region. |
| 协议自动化核心   | PAC (Protocol Automation Core) | Central hub with built-in I/O ports; pulls items from Depot via configured output ports.                    |
| 子协议自动化核心 | Sub-PAC                        | Secondary PAC at outposts; shares Depot with main PAC. Has fewer Depot Bus sides.                           |
| 区域             | Region                         | A map area with its own PAC, Depot, and facility limits. E.g. Valley IV, Wuling.                            |

## Storage & Logistics Facilities

| CN             | EN                            | Facility ID            | Function                                                                                                                                       |
| -------------- | ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 仓库存货口     | Depot Intake / Depot Loader   | `loader-1`             | Sends items INTO the Depot via Depot Bus. Must be adjacent to 仓库存取线. 0.5/s per port.                                                      |
| 仓库取货口     | Depot Output / Depot Unloader | `unloader-1`           | Pulls items OUT of the Depot via Depot Bus. Must be adjacent to 仓库存取线. 0.5/s per port.                                                    |
| 协议储存箱     | Protocol Stash                | `storager-1`           | Storage with 6 slots. When powered, wirelessly transfers items to Depot. Acts as overflow buffer on belts. 0.5/s per port. Bypasses Depot Bus. |
| 仓库存取线源桩 | Depot Bus Port                | `log-hongs-bus-source` | Origin point of the Depot Bus. Placed in Core AIC Area. No power required.                                                                     |
| 仓库存取线基段 | Depot Bus Section             | `log-hongs-bus`        | Extends the Depot Bus. Depot Loaders/Unloaders attach to it. No power required.                                                                |
| 便捷存取站     | Easy Stash                    | `carrier-1`            | Quick access to Depot items in the field. Power: 5.                                                                                            |
| 储液罐         | Fluid Tank                    | `liquid-storager-1`    | Stores a single type of liquid. Separate from Depot — fluids do NOT go into the Depot.                                                         |

## Pipeline Facilities

| CN                   | EN                      | Facility ID         | Function                                                          |
| -------------------- | ----------------------- | ------------------- | ----------------------------------------------------------------- |
| 管道准入口           | Conduit Inlet           | `udpipe-loader-1`   | Inlet for underground pipeline. Pairs with Conduit Outlet. 1.5/s. |
| 管道准出口           | Conduit Outlet          | `udpipe-unloader-1` | Outlet for underground pipeline. Pairs with Conduit Inlet. 1.5/s. |
| 管道准入口（多歧管） | Conduit Inlet Manifold  | `udpipe-loader-2`   | Multi-port underground pipeline inlet.                            |
| 管道准出口（多歧管） | Conduit Outlet Manifold | `udpipe-unloader-2` | Multi-port underground pipeline outlet.                           |

## Mining Facilities

| CN                 | EN                        | Notes                                                                                                         |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 便携式源石钻机     | Portable Originium Rig    | Self-powered. Outputs Originium Ore to Depot automatically (wireless).                                        |
| 电动采矿钻机       | Electric Mining Rig       | Requires power. Outputs Originium Ore / Krystallite to Depot automatically.                                   |
| 电动采矿钻机 Mk II | Electric Mining Rig Mk II | Requires power. Outputs Ferrium Ore to Depot automatically.                                                   |
| 水力采矿钻机       | Hydro Mining Rig          | No power needed (water-driven). Outputs Cuprium Ore + Sewage. Does NOT send to Depot — must pipe Sewage away. |
| 流体泵             | Fluid Pump                | Requires power. Pumps fluids from the environment. Outputs to pipe, not Depot.                                |

## Waste & Disposal Facilities

| CN         | EN                   | Facility ID        | Function                                                                                                                                                     |
| ---------- | -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 废水处理机 | Water Treatment Unit | `liquid_cleaner_1` | Consumes Sewage (destroys it completely). Can also process Xircon Effluent / Inert Xircon Effluent with limited efficiency. Zero outputs.                    |
| 给水器     | Water Dispenser      | —                  | Discharges liquids into the environment (pond/lake). Requires water proximity, 10 power, 3 units/s. Not pure destruction — water remains in the environment. |

## Key Byproducts

| CN           | EN                    | Source                             | Must be handled? | How                                                                              |
| ------------ | --------------------- | ---------------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| 污水         | Sewage                | Reactor Crucible, Hydro Mining Rig | **Yes**          | Route to Water Treatment Unit, or consume in other recipes                       |
| 惰性壤晶废液 | Inert Xircon Effluent | Reactor Crucible                   | **Yes**          | Purifier → Xircon Liquid + Clean Water; or Water Treatment Unit (less efficient) |
| 壤晶废液     | Xircon Effluent       | Reactor Crucible                   | **Yes**          | Purifier, or route to other recipes; or Water Treatment Unit                     |
| 沉积酸       | Acidic Sludge         | Copper refining                    | **Yes**          | Route back to copper solution recipes                                            |
| 清水         | Clean Water           | Purifier (byproduct), Water Pump   | Useful           | Consume in recipes (e.g. Forge of the Sky)                                       |

**Core rule: there is no "ignorable waste" in the game.** Every byproduct must have somewhere to go (consumed by another facility or destroyed by Water Treatment Unit), or the producing facility jams and the jam cascades upstream.

## Key Distinctions

### Items that go through the Depot (solid)

- Raw ores (Originium, Amethyst, Ferrium) → Miner sends to Depot automatically (wireless, no belt needed)
- To get items OUT of Depot → Use PAC output port or 仓库取货口 (Depot Output)
- To put items INTO Depot → Use PAC input port, 仓库存货口 (Depot Intake), or 协议储存箱 (Protocol Stash)

### Items that do NOT go through the Depot (fluid)

- Clean Water, Sewage, Xircon Effluent, Liquid Xiranite, etc.
- Must be piped directly between facilities
- Stored in 储液罐 (Fluid Tank), not in Depot
- This means fluid supply chains are entirely separate from the Depot Bus system

### PAC ports vs Depot Bus ports

- PAC has 6 built-in output ports — the baseline throughput
- Depot Bus (仓库存取线) + Depot Loaders/Unloaders expand beyond the PAC's 6-port limit
- All ports (PAC, Depot Bus, Protocol Stash) flow at 0.5/s per port for belts, 2.0/s for pipes
