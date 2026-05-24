# AICD — Automated Industry Complex Designer

A production-line visual editor and balancing tool for the AIC (Automated Industry Complex) system in _Arknights: Endfield_.

## Features

- Visual production line editor (place facilities, connect inputs/outputs)
- Real-time rate balancing validation
- Cycle detection for perpetual loops and byproduct recycling
- i18n support (Chinese / English)
- Runs entirely in the browser — no backend needed

## Quick Start

```bash
git clone https://github.com/LionNatsu/aicd.git
cd aicd
bun install
bun run prebuild   # download game data + images from aicd-data
bun run dev
```

**Prerequisites:** [Bun](https://bun.sh/), Git

> `bun run prebuild` is required before first build. It downloads game data and images from [LionNatsu/aicd-data](https://github.com/LionNatsu/aicd-data) into the project. CI runs it automatically; locally run it once after cloning.

## Tech Stack

- Vue 3 + TypeScript + Vite
- Bun (package manager & runtime)

## Data Architecture

Game data lives in a separate repository: [LionNatsu/aicd-data](https://github.com/LionNatsu/aicd-data). This keeps the AICD codebase decoupled from game content — when game data updates, only `aicd-data` needs to change.

```
aicd-data repo                    AICD repo (this repo)
├── data/                         ├── src/data/
│   ├── items.json       ──────▶ │   ├── items.json    (prebuild download)
│   ├── recipes.json     ──────▶ │   ├── recipes.json  (prebuild download)
│   └── facilities.json  ──────▶ │   └── facilities.json (prebuild download)
├── i18n/                         ├── src/i18n/zh-Hans/
│   └── zh-Hans/        ──────▶ │   ├── item.json     (prebuild download)
│       ├── item.json            │   └── facility.json (prebuild download)
│       └── facility.json        │
└── images/                       └── public/images/
    ├── items/          ──────▶      ├── items/        (prebuild download)
    └── facilities/     ──────▶      └── facilities/   (prebuild download)
```

- **Single source of truth**: all game data is maintained in `aicd-data` only. AICD never hand-writes data files.
- **prebuild**: `bun run prebuild` clones `aicd-data` shallowly and copies data/i18n/images into the project. Downloaded files are gitignored.
- **repository_dispatch**: `aicd-data` pushes trigger AICD CI to rebuild automatically.
- **JSON import**: `src/data/index.ts` imports the downloaded JSON directly and casts `category` numbers to the `FacilityCategory` enum.

## Credits

Game data (item IDs, recipe definitions, facility stats) is aligned with and sourced from [endfield-calc](https://github.com/JamboChen/endfield-calc) by JamboChen, licensed under the MIT License.

```
Copyright (c) 2026 JamboChen
```

## Disclaimer

**明日方舟：终末地** 是鹰角网络的商标。本工具与鹰角网络无关，未获其认可。

本工具为非官方粉丝工具，仅供学习交流使用。

## License

[MIT](LICENSE)
