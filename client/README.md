# Dolly Grid Simulator

### Real-Time Pathfinding + Deterministic 3D Simulation

A real-time logistics simulation modeling a dolly that transports towers across a discrete grid using deterministic pathfinding and a high-performance 3D renderer.

Built as a focused systems exercise to demonstrate:

• algorithmic modeling
• clean architecture
• rendering efficiency
• predictable state design

Users can lift, move, drop, and swap towers while the dolly navigates obstacles and the world updates live across multiple camera perspectives.

---

## Tech Stack

React + TypeScript (strict)
Vite
Three.js via @react-three/fiber
Drei utilities
D3 (analytics hooks)

---

## Architecture

### World Kernel (pure logic)

Headless, deterministic simulation engine.

• grid math
• adjacency graph
• BFS pathfinding
• occupancy rules
• command queue

Runs without React or Three.js.

Same inputs → same outputs.
Fully unit-testable.

---

### Rendering Layer

Purely visual.

• meshes
• cameras
• interactions

Consumes world state but does not influence simulation logic.

Simulation and rendering are fully decoupled.

---

## Core Design Decisions

### Grid + Graph

Cartesian tile grid
4-adjacency (von Neumann neighborhood)
Edges pruned for collisions

### Pathfinding

Breadth-first search

Chosen intentionally:
Uniform edge costs → BFS guarantees shortest path with lower complexity and simpler implementation than A\*

### Command System

Lift / Move / Drop / Swap
Queued execution
Deterministic sequencing

Prevents race conditions and ensures reproducible behavior.

---

## Rendering Performance

• Tower instancing (single draw call)
• Minimal React state churn
• Ref-based frame updates
• Snap cameras (no smoothing overhead)

Performance scales with entity count, not component count.

---

## Camera System

Two complementary modes:

### Sim View

Dynamic tracking cameras
Designed for inspection and debugging

### World View

Static perimeter cameras
Row/column responsibility
Instant switching for surveillance-style clarity

---

## Project Build Summary

• Data-first modeling
• Deterministic simulation design
• Algorithm selection with intent
• Clean separation of logic and UI
• Headless testable architecture
• Rendering efficiency under real-time constraints
• Systems thinking under tight timeframes

---

## Outcome

Built in ~5 days.

Delivers:

• interactive 3D grid simulation
• pathfinding agent
• command queue
• multi-view cameras
• performant rendering
• scalable architecture


---

## Future Implementations

This prototype is intentionally scoped to demonstrate the core simulation engine and rendering architecture. Obvious next steps include:

### Simulation + System Features

- **Adjustable speed controls** (e.g., fixed presets + slider) with deterministic timing options (lockstep ticks) vs visual-only playback speed.
- **Custom tower placement** (click-to-place / drag-to-move) with validation against occupancy rules.
- **Tower count selector** and **random seed control** for reproducible layouts and scenarios.
- **Grid size selector** (rows/cols + tile size), including auto-regeneration of adjacency graphs and camera maps.
- **Scenario loading** (JSON configs) for “challenge boards” and repeatable demos.
- **Undo / replay / step-through**: command history, deterministic re-simulation, and debug stepping.

### Pathfinding + Planning

- **Alternate algorithms** (A\*, Dijkstra, weighted costs) to support terrain costs, congestion, or “no-go zones.”
- **Heuristics + constraints** (e.g., prefer straight paths, avoid tight corridors, minimize turns).
- **Multi-agent extension** (multiple dollies) with collision avoidance and scheduling.

### Cameras + Visualization

- **Camera frustum calculation + constraints**
  - Compute frustum bounds from **grid extents** (or selected region) to guarantee the entire active area is visible.
  - Add “real world” constraints (max camera height, lens/FOV limits) and auto-solve for best-fit framing.
  - Optional safe-margins for UI overlays and PiP layouts.

- **Camera rig tooling**
  - A small “camera placement editor” for saving presets, lanes, and cinematic tracks.
  - Debug overlays for active tile, lane direction, and current camera selection.

### UI + UX

- **Better interaction affordances**
  - Hover throttling / mode gating (already started) and explicit “edit vs run” modes.
  - Context hints (drag arrows, selection state indicators, invalid move feedback).

- **Selectable control modes**
  - “Operator mode” (simple) vs “Debug mode” (full telemetry + overlays).

### Analytics (D3-ready)

- **Live metrics panel**
  - command throughput, travel distance, turn count, idle time, blocked moves, reroutes.

- **Path + occupancy visualization**
  - heatmaps of tile usage, congestion maps, and replay graphs.

### Engineering / Production Hardening

- **Unit tests for the world kernel** (pathfinding, adjacency pruning, command execution invariants).
- **Performance profiling hooks** (frame time budgets, draw call counters, simulation step costs).
- **State serialization** for saving/loading and sharing simulation states.
