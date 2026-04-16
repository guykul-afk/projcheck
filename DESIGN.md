# Design System: ProjectCheck Tactical Console

## 1. Visual Theme & Atmosphere
A high-agency, professional financial console that feels more like a **tactical blueprint** than a generic web app. The atmosphere is "Cockpit Dense" (Density 9/10), prioritizing data-rich asymmetric layouts over decorative whitespace. It uses a **Solid Matter** aesthetic — sharp borders, Zinc-based depth, and high-contrast typography.

## 2. Color Palette & Roles (Zinc & Emerald)
- **Canvas Depth** (#09090b) — Main background surface
- **Control Surface** (#18181b) — Cards, panels, and nav containers
- **Precision Border** (#27272a) — 1px structural dividers and cell borders
- **Silver Text** (#fafafa) — Primary headlines and active numbers
- **Muted Blueprint** (#a1a1aa) — Labels, secondary text, and inactive states
- **Execution Emerald** (#10b981) — Success, profit, growth metrics. No neon glows.
- **Exposure Rose** (#e11d48) — Expenses, loss, critical warnings.

## 3. Typography Rules
- **Display:** **Outfit** — Track-tight (-0.02em), geometric, weights: 500, 700.
- **Interface:** **Inter** — Standard readability for secondary UI text.
- **Financials/Meta:** **Geist Mono** — Strictly for all currency values, tables, and timestamps.
- **Banned:** Generic system serifs, blue-tinted grays, and font weights below 400.

## 4. Component Stylings
* **Tactical Cards**: No shadows. Sharp corners (0.25rem) or very subtle rounding (0.5rem). 1px border (#27272a).
* **Buttons**: High-contrast fills. Tactile `-1px` translate-y on `:active`. No outer glows.
* **KPI Metrics**: Monospace numbers with Emerald/Rose trend indicators. No gauge charts or frivolous visuals.
* **Tables**: "Cockpit-level" density. Horizontal lines only or minimalist grid. Zebra striping BANNED in favor of hover-state highlight.
* **Inputs**: Label and value vertically stacked. Monospace value input. Sharp borders.

## 5. Layout Principles (Bento Grid)
- **Asymmetric Grid**: Use a 12-column grid system. Primary metrics occupy 3/12 or 4/12; main table occupies 8/12 or 9/12.
- **RTL Integrity**: All grids must flip naturally for Hebrew. Numeric columns always right-aligned (`text-align: right`).
- **Maximum Width**: Constrained to 1600px for desktop console feel.
- **No Overlapping**: Every element occupies a clean, distinct spatial zone.

## 6. Motion & Interaction
- **Spring Physics**: All interactive elements use `stiffness: 100, damping: 20` for a weighty, premium feel.
- **Staggered Orchestration**: Project rows should cascade in with a 50ms stagger on load.
- **Hardware Acceleration**: Animate ONLY `transform` and `opacity`. Use `will-change: transform` on high-density list items.

## 7. Anti-Patterns (Banned)
- **NO NEON**: No glowing shadows or "AI vibe" purple/blue neons.
- **NO EMOJIS**: Use Lucide-React icons exclusively.
- **NO PURE BLACK**: Base is Zinc-950 (#09090b).
- **NO AI COPYWRITING**: No "Seamless", "Elevate", or "Unlock Insights". Use "Calculate", "Export", "Sync".
- **NO FABRICATED DATA**: Metrics must match the underlying Firestore state exactly.
- **NO 3-COLUMN EQUAL GRIDS**: Use asymmetric Bento layouts to show hierarchy.
