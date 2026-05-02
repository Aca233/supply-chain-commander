# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Supply Chain Commander is a deep economic simulation browser game built with React 18 + TypeScript. Players manage production facilities, trade on markets, compete with AI companies, and build business empires. The game runs a real-time economic simulation with supply/demand curves, business cycles, and a multi-tier supply chain.

## Commands

```bash
npm run dev              # Start dev server (Vite, port 5173)
npm run build            # TypeScript check + Vite production build
npm run preview          # Preview production build
npm run test             # Run Vitest test suite (watch mode by default)
npm run test:ui          # Run tests with Vitest UI
npm run lint             # ESLint check (TypeScript files, max warnings 0)
npm run storybook        # Start Storybook on port 6006
npm run build-storybook  # Build static Storybook
npm run deploy           # Build and publish to GitHub Pages (gh-pages)
```

### Running a single test

```bash
npm run test -- ProductionEngine     # Filter by file name substring
npm run test -- -t "demand curve"    # Filter by test name (it/describe)
npm run test -- --run                # Single run, no watch mode
npm run test -- --run path/to/file.test.ts   # Single file, no watch
```

## Architecture

### Data Flow

```
GameWorld (SoA data) → GameLoop (tick processor) → gameStore (Zustand + Immer) → React UI
                                                ↑
                                              AI + Economy + Market + Production engines
```

- **`GameWorld`** (`src/core/world/GameWorld.ts`) is the single source of truth — a Structure-of-Arrays (SoA) design using TypedArrays for cache-friendly bulk processing. Contains all entities: goods, buildings, companies, orders, trades, retail stores, construction/demolition queues.
- **`GameLoop`** (`src/core/loop/GameLoop.ts`) drives time forward in ticks (100ms base, 10 ticks/sec at 1x speed). Each tick runs a multi-phase pipeline: production → inventory → demand → AI decisions → order matching → pricing → finance → news/stats.
- **`gameStore`** (`src/stores/gameStore.ts`) is the Zustand store with Immer middleware. `worldRef` and `gameLoopRef` are held outside the store to avoid Immer freezing TypedArrays. The store wraps core engine functions into player-facing actions and handles throttled UI state sync.
- **React layer** (`src/ui/`) renders everything. `App.tsx` handles screen routing (main menu vs game), desktop/mobile layouts, keyboard shortcuts, and global providers (toast, tutorial, achievements, help).

### Module Architecture

| Module | Path | Role |
|--------|------|------|
| `world` | `src/core/world/` | GameWorld creation, initialization, bootstrap |
| `loop` | `src/core/loop/` | Game loop (tick scheduling, phase pipeline) |
| `production` | `src/core/production/` | Building production, methods, subsidiary buildings |
| `market` | `src/core/market/` | Order book, matching engine, trading fees, advanced orders |
| `economy` | `src/core/economy/` | Pricing engine, demand/supply curves, retail, consumer market, brand, logistics, seasonality, quality, substitution |
| `finance` | `src/core/finance/` | Stock market, banking/loans, acquisitions, company profiles, ownership control |
| `ai` | `src/core/ai/` | AI decision engine (personalities, trading, production, strategy), player auto-trader, AI scheduler with Web Worker support |
| `balance` | `src/core/balance/` | Tunable economic balance parameters (`BalanceConfig.ts`); the central knob for production / pricing / demand calibration |
| `construction` | `src/core/construction/` | Construction/demolition queue processing |
| `news` | `src/core/news/` | Monthly news generation, stats collection, event tracking |
| `save` | `src/core/save/` | Save/load system (`SaveManager.ts`), serialization of SoA arrays |
| `research` | `src/core/research/` | Research / tech-tree progression |
| `llm` | `src/core/llm/` | Optional LLM integration config (`LLMConfig.ts`) for AI-driven content |
| `sound` | `src/core/sound/` | Sound effects layer |
| `performance` | `src/core/performance/` | Object pools, perf monitoring, memory management, data export |
| `workers` | `src/core/workers/` | Web Worker offloading (AI scheduler, economy calculations) |
| `data` | `src/data/` | Static game data: goods definitions (88 types, 4 tiers), building types, recipes, building materials |
| `stores` | `src/stores/` | Zustand game store with Immer |
| `ui` | `src/ui/` | Pages, components, design system, hooks, utilities |

`src/core/constants.ts` holds all SoA capacity limits (`MAX_BUILDINGS`, `MAX_COMPANIES`, `MAX_ORDERS`, `GOODS_COUNT`, `MAX_INPUTS/OUTPUTS/SLOTS`, etc.). Changing these resizes TypedArrays globally — review save-format compatibility before touching.

### Key Design Decisions

- **SoA data layout**: All game entities use TypedArrays (Float32Array, Uint16Array, etc.) for performance. `MAX_BUILDINGS=3000`, `MAX_COMPANIES=100`, `MAX_ORDERS=500000`.
- **worldRef/gameLoopRef pattern**: The GameWorld and GameLoop must NOT be stored inside Zustand+Immer state. They live in module-level `let` variables referenced via getters; the store only holds UI-relevant values.
- **Tick scheduling**: Uses `setTimeout` accumulation loop. Speed multipliers (1/2/4/8x) divide the interval. Many subsystems are staggered across different tick offsets to spread CPU load.
- **Production methods system**: Dual old/new system. New system uses `ProductionMethods.ts` with building-specific slot configs (method IDs ≥ 10000); old system uses `SLOT_CONFIGS_BY_BUILDING`. The store's `changeBuildingSlotMethod` handles both paths.
- **Module aliases**: `@/` → `src/`, `@core/` → `src/core/`, `@ui/` → `src/ui/`, `@data/` → `src/data/`.
- **UI dependencies**: Charts use **ECharts** (`echarts`, `echarts-for-react`); primitives come from **Radix UI** + **Tailwind CSS** (with `class-variance-authority` / `tailwind-merge`). Prefer extending these — don't introduce alternative chart or component libraries.

### Testing

- **Framework**: Vitest
- **Test location**: Co-located in `__tests__/` directories within each module
- **Coverage**: Focus on core engine logic (ProductionEngine, ConsumerMarket, DemandCurve, RetailSystem, OrderBook, SaveManager, GameLoop)

### Important Constraints

- Do NOT mutate `GameWorld` fields that Zustand+Immer has frozen (the world object passed through store gets frozen). Core engine functions receive the unfrozen `worldRef` directly.
- Cash values use Float64Array to avoid precision issues. Most other values use Float32Array.
- Game time: 24 ticks = 1 day, 720 ticks = 1 month, 8760 ticks = 1 year.
