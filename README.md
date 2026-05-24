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
bun run dev
```

**Prerequisites:** [Bun](https://bun.sh/)

## Tech Stack

- Vue 3 + TypeScript + Vite
- Bun (package manager & runtime)

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
