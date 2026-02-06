---

# World Kernel — Grid Math & Pathfinding

This project separates **world logic** from **rendering**.

All grid geometry, traversal rules, and pathfinding are implemented in a pure TypeScript “world kernel” that contains **no React, no WebGL, and no side effects**.

The renderer consumes this kernel as a deterministic data source.

This design ensures:

* correctness can be tested independently of visuals
* math remains pure and debuggable
* rendering changes cannot break traversal logic
* pathfinding is unit-testable
* architecture scales cleanly

---

## Design Principles

### 1. Pure functions only

All world logic is:

- deterministic
- stateless
- referentially transparent

No file in this layer:

- mutates global state
- touches DOM
- depends on React
- performs rendering

---

### 2. Separation of concerns

The system is layered:

```
Grid Math     → geometry & coordinates
Tower Layout  → world content placement
Graph Build   → adjacency construction
Rules         → movement constraints
Pathfinding   → traversal
Rendering     → (separate layer)
```

Each layer:

- has a single responsibility
- depends only on lower layers
- is independently testable

---

### 3. Types first

All structures are explicitly typed using strict TypeScript:

- no implicit `any`
- branded IDs for safety
- readonly where possible
- immutable outputs

This prevents:

- mixing coordinate systems
- accidental mutation
- invalid lookups

---

# Files & Responsibilities

---

## `gridTypes.ts`

**Purpose:** canonical type definitions

Defines:

- `Tile` — discrete grid coordinate `{ x, z }`
- `Vec3` — world coordinate `{ x, y, z }`
- `TileId` — branded string `"x:z"` for hashable keys
- `GridConfig` — grid size, tile size, origin
- `Path`, `DollyState`, etc.

### Why

- separates logical space (tiles) from physical space (world units)
- allows O(1) lookups via `TileId`
- enforces compile-time correctness

---

## `gridMath.ts`

**Purpose:** coordinate and geometry utilities

Implements:

### `tileEquals(a,b)`

Value comparison for tiles

### `isInBounds(tile, grid)`

Bounds check

### `allTiles(grid)`

Enumerates every tile in row-major order

### `parseTileId(id)`

Reverse of `"x:z"` → `{x,z}`

### `tileToWorldCenter(tile, grid)`

Converts logical tile → world center position

### Why

Keeps all coordinate math in one place and prevents:

- duplicated conversion logic
- rendering code doing math
- inconsistencies between systems

---

## `towerLocations.ts`

**Purpose:** deterministic tower placement

Implements:

### `generateTowerTiles(grid)`

Creates a fixed lattice:

- odd x
- odd z
- evenly spaced
- 1-tile buffer around each tower
- capped at 24

### `buildTowerSet(towers)`

Creates `Set<TileId>` for O(1) membership checks

### `isTowerAt(tile, towerSet)`

Fast tower lookup

### Why

- separates **world content** from traversal logic
- allows future dynamic placement without changing rules
- converts expensive array scans → constant-time lookups

---

## `neighbors.ts`

**Purpose:** build base traversal graph

Implements:

### `buildBaseEdges(grid)`

Generates undirected edges using Von Neumann neighborhood:

- east neighbor
- south neighbor
- avoids duplicates

### `edgesToAdjacency(grid, edges)`

Converts edge list → adjacency map:

```
TileId → TileId[]
```

### Why

Separates:

- graph construction
- from rules
- from pathfinding

This allows rules to transform edges cleanly without recomputing geometry.

---

## `gridRules.ts`

**Purpose:** apply movement constraints

Implements:

### `pruneEdgesForTowerXBlocking(baseEdges, towerSet)`

Removes edges violating rules:

Rules:

- Z-axis movement always allowed
- X-axis movement blocked if either endpoint has a tower

### `buildPrunedAdjacency(...)`

Produces final legal adjacency map

### Why

Encodes traversal policy separately from:

- geometry
- graph
- BFS

Changing rules only touches this file.

---

## `bfs.ts`

**Purpose:** shortest pathfinding

Implements:

### `bfsPath(adj, start, goal)`

Breadth-first search

Returns:

- ordered `Tile[]` path
- empty array if unreachable

Uses:

- queue
- visited set
- `cameFrom` map for reconstruction

### Why BFS

- all edges cost equal
- guarantees shortest path
- simpler than A\*
- deterministic and fast for small grids

---

# How the Kernel Works Together

### Step 1 — Geometry

```
allTiles(grid)
```

### Step 2 — Towers

```
generateTowerTiles(grid)
buildTowerSet(...)
```

### Step 3 — Base graph

```
buildBaseEdges(grid)
```

### Step 4 — Apply rules

```
pruneEdgesForTowerXBlocking(...)
edgesToAdjacency(...)
```

### Step 5 — Pathfinding

```
bfsPath(adj, start, goal)
```

Result:

```
Tile[]
```

---

# Key Architectural Benefits

### Deterministic

Same inputs → same outputs

### Testable

Works without rendering

### Fast

- Set lookups O(1)
- BFS linear in nodes
- precomputed adjacency

### Maintainable

Each file has one job

### Extensible

Future additions:

- weighted edges
- dynamic obstacles
- larger grids
  require minimal changes

---

# Summary

The world kernel provides:

- strict types
- pure math
- explicit graph structure
- rule-based pruning
- shortest-path traversal

It forms a stable foundation that the visualization layer consumes without needing to understand the underlying mechanics.

Rendering is simply a view of this data.

---

Camera system build plan:

# Dolly Grid Sim — Camera System Implementation Plan

## North Star

Deliver two coherent camera products:

1. **SimView (fiction)**: a single “drone camera” with 7 modes that move relative to the dolly.
2. **WorldView (non-fiction)**: a perimeter camera network with static poses, explicit frustum tile responsibilities, and smooth handoffs.

The grid/dolly/towers exist to demonstrate mastery of:

- frustum geometry
- FOV + distance fitting
- near/far correctness
- responsibility mapping
- deterministic camera transitions

---

# Architecture invariants for cameras

## Layer placement

- **Kernel**: no camera logic.
- **App orchestration**: holds _intent/state_ only (camera mode selection, active camera id, transition flags).
- **Scenes (visualization)**:
  - `useFrame` camera updates
  - frustum computations
  - camera pose interpolation
  - debug helpers

## One truth for motion

Camera logic consumes:

- dolly world position (from motion outputs / telemetry)
- path endpoints (start/dest)
- optional path world points

Camera logic does _not_ recompute pathfinding.

---

# File / module structure

## Types

- `src/app/camera/types.ts`
  - `SimCameraMode`
  - `WorldCameraId`
  - `CameraInputs`
  - `CameraPose`
  - `FrustumPlanes` (optional)
  - `CameraTransitionState`

## Pure math utilities (no React)

- `src/app/camera/frustumMath.ts`
  - `computeBoundsFromEndpoints(start, dest, buffer) -> { center, radius }`
  - `fitDistanceForSphere(radius, fovY, aspect) -> distance`
  - `computeNearFar(distance, radius) -> { near, far }`
  - `buildViewProjection(camera) -> Matrix4` (or accept view/proj)
  - `extractFrustumPlanes(VP) -> planes` (or wrap Three.Frustum)
  - `pointInFrustum(planes, point) -> boolean`

## Sim camera system

- `src/app/camera/sim/SimCameraController.tsx`
- `src/app/camera/sim/modes/*.ts`
  - `birdsEye.ts`
  - `outerPath.ts`
  - `innerPath.ts`
  - `leading.ts`
  - `trailing.ts`
  - `destinationFixed.ts`
  - `startFixed.ts`

- `src/app/camera/sim/simOrbitMath.ts`
  - orbit direction + yaw/pitch helpers
  - “direction smoothing” helpers

## World camera system

- `src/app/camera/world/worldCameraLayout.ts`
  - generates perimeter camera definitions from grid

- `src/app/camera/world/worldFrustumResponsibility.ts`
  - precomputes tile → camera mapping

- `src/app/camera/world/WorldCameraController.tsx`
  - selects active camera by dolly tile
  - transitions between camera poses smoothly

## Debug (optional but impressive)

- `src/app/camera/debug/FrustumDebug.tsx`
  - draw frustum lines or show tile responsibility overlays (toggleable)

---

# Shared contracts

## CameraInputs (provided by SimViewCanvas / WorldViewCanvas)

Includes everything camera needs, nothing it shouldn’t.

- `grid: GridConfig`
- `aspect: number` (from renderer size)
- `dollyWorld: Pt`
- `dollyTile: Tile`
- `startWorld: Pt`
- `destWorld: Pt | null`
- `pathWorld: readonly Pt[]`
- `progress01: number`
- `buffer: number` (world units)
- `towerHeight: number` (for birds-eye/world camera Y placement)
- `speed: number` (for transition timing sync)

## CameraPose (what each controller outputs)

- `position: Pt`
- `target: Pt`
- `fovY?: number` (optional if you ever want dynamic fov)
- `near?: number`
- `far?: number`

---

# Implementation phases (PR-sized)

## PR 1 — Camera types + pure frustum fit utilities

**Goal:** establish the math backbone.

### Deliverables

- `types.ts`: `CameraInputs`, `CameraPose`, `SimCameraMode`
- `frustumMath.ts` with:
  - bounds from endpoints
  - fit distance formula using fov/aspect
  - near/far derivation

### Definition of Done

- Unit-test-like sanity script (dev-only) logs:
  - bounds radius for a known start/dest
  - resulting camera distance
  - near/far values

- No scene integration yet.

---

## PR 2 — Sim birds-eye mode (first real camera)

**Goal:** “camera follows dolly” with deterministic fit-to-endpoints distance.

### Steps

1. Add `cameraMode` state in App:
   - default `"BIRDS_EYE"`

2. In `SimViewCanvas`:
   - compute `CameraInputs` via `useMemo`

3. Create `SimCameraController.tsx`:
   - `mode`, `inputs`, `lag`, `isTransitioning` out

4. Implement birds-eye:
   - `target = dollyWorld`
   - compute `bounds = computeBoundsFromEndpoints(start, dest, buffer)`
   - `distance = fitDistanceForSphere(bounds.radius, fovY, aspect)`
   - `pos = dollyWorld + (0, distance + towerClearance, 0)`
   - derive near/far from bounds

5. Smooth position changes:
   - `camera.position.lerp(desired, lag)`
   - `camera.lookAt(target)`

### DoD

- Dolly moves → camera stays above it, stable
- Start/dest remain within view
- near/far not defaulted blindly

---

## PR 3 — Sim fixed destination + fixed start modes

**Goal:** demonstrate “static anchor, dynamic target” and “frustum-fit still holds.”

### Steps

- Implement two modes:
  - `START_FIXED`: camera anchored at start tile (static pose), target dolly
  - `DEST_FIXED`: camera anchored at dest tile (static pose), target dolly

- Distance logic:
  - still derived from bounds radius so dolly remains inside frustum

- Add mode switch UI later (can be a keybind for now)

### DoD

- Camera doesn’t move (position stable) unless transition into mode
- Dolly stays visible throughout traversal (with your buffer guarantee)

---

## PR 4 — Sim leading + trailing with direction-based orbit + smooth axis transitions

**Goal:** show dynamic orbital direction and smoothing tied to motion.

### Steps

1. Add function to compute current motion direction on XZ plane:
   - derive from path segment index OR from telemetry velocity vector

2. Represent camera orbit direction as a ref:
   - `orbitDirRef` (unit vector on XZ)

3. On direction changes:
   - smoothly rotate/lerp orbitDirRef to new direction
   - sync blend speed to dolly speed (same tempo)

4. Leading:
   - `pos = dolly - orbitDir * distance + up * heightOffset` (camera in front looking back)

5. Trailing:
   - `pos = dolly + orbitDir * distance + up * heightOffset`

### DoD

- When dolly turns, camera swings smoothly around (no snap)
- Swing speed feels linked to dolly speed

---

## PR 5 — Sim outer path + inner path (corner-relative)

**Goal:** implement your “vertex near viewer vs far viewer” cinematic modes.

### Steps

1. Detect “corner” (turn) point for L-shaped paths:
   - first index where direction changes
   - corner world point `V`

2. Define “corner-facing direction”:
   - outer dir aims toward `V` (viewer near vertex)
   - inner dir aims away from `V`

3. Compute orbit positions:
   - pick pitch angle (45°) as a parameter (not hard-coded)
   - `pos = dolly + orbitDir * distance + up * heightOffset`

4. Smooth transitions into these modes with same lag logic.

### DoD

- For L paths, outer view shows vertex near camera, inner shows it far
- For straight paths, fallback to trailing/leading (define behavior)

---

## PR 6 — Sim frustum-aware tower transparency during camera transitions

**Goal:** guarantee dolly visibility while camera pose changes.

### Steps

- Define `isCameraTransitioning` from controller:
  - true during mode change or orbitDir smoothing

- Tower material:
  - `transparent = true`
  - `opacity = isTransitioning ? 0.35 : 1`
  - `depthWrite = isTransitioning ? false : true`
  - set `dolly.renderOrder > towers.renderOrder`

### DoD

- During camera transitions, towers fade and dolly stays visible
- No transparency sorting weirdness dominating the scene

---

# WorldView implementation phases

## PR 7 — World camera layout generator (perimeter network)

**Goal:** fixed cameras around outside tiles at y slightly above towers, angled down.

### Steps

1. Define `WorldCameraDef`:
   - `id`, `position`, `target`, `fov`, `near`, `far`

2. Generate perimeter camera placements from grid dimensions:
   - cameras at regular intervals along perimeter
   - y = towerHeight + margin
   - target = grid center (or a fixed “look point”)

3. Store this layout in a memoized array (depends on grid config)

### DoD

- You can render debug spheres at camera positions (optional)
- Layout stable, deterministic

---

## PR 8 — World frustum responsibility map (tile → camera)

**Goal:** assign each tile to a perimeter camera based on frustum membership.

### Steps

1. For each camera:
   - build VP matrix
   - extract frustum planes

2. For each tile center:
   - test point-in-frustum per camera
   - assign camera responsibility

3. Tie-break rules if multiple cameras cover a tile:
   - prefer camera with:
     - smallest angle to tile (dot product with forward vector)
     - or closest distance
     - or smallest projected area (advanced)

   - pick one simple tie-break and document it

### DoD

- You can print “camera id per tile” grid to console for sanity
- Visual debug overlay optional (color tiles by camera id)

---

## PR 9 — World active camera selection + smooth handoff transitions

**Goal:** dolly movement chooses active fixed camera based on its current tile, transitions are smooth.

### Steps

1. In WorldViewCanvas, compute dolly tile each frame / on tile-change
2. Lookup responsible camera id from map
3. If changes:
   - start transition:
     - from old camera pose to new camera pose
     - duration tied to dolly speed or fixed seconds

4. Blend:
   - position lerp
   - target lerp
   - fov lerp (optional)

5. For corner rounding:
   - optionally use curved interpolation path between camera positions
   - (Bezier with control point above corner)

### DoD

- Dolly crosses responsibility boundary → camera handoff is smooth
- No popping or jitter

---

# Performance + correctness checklist (must-haves)

## Performance

- Towers instanced
- Camera math is O(1) per frame in SimView
- World responsibility map computed once (O(numCameras \* numTiles)), not per frame
- No per-frame React state churn; camera updates mutate camera directly

## Correctness (frustum story)

- Distance computed from bounds radius + fov/aspect
- near/far derived, not magic
- World camera responsibilities computed by frustum membership tests
- Transition smoothing is explicit and parameterized

---

# Acceptance criteria for the take-home narrative

You should be able to say:

1. “SimView is a drone camera. Each mode outputs a desired pose. We fit distance based on endpoint bounds and the camera’s FOV/aspect so start/destination always remain visible.”
2. “WorldView simulates a real camera network. Cameras are fixed. We assign tile responsibilities by testing tile centers against each camera frustum.”
3. “We hand off cameras by blending poses to avoid snapping. That transition is tied to motion so it feels physical.”
4. “We manage near/far intentionally to avoid depth artifacts.”
5. “Instancing keeps tower rendering cheap; transparency is applied only during camera transitions to preserve dolly legibility.”

---

---

---

# Dolly Motion Refactor Plan — Single Motion Owner + Shared Outputs

## North Star

Create one reusable motion module that:

- computes polyline geometry from a tile path
- advances `traveled` by `speed * dt` per frame
- exposes a single read-model object (`motionOutputs`)
- supports:
  - dolly position
  - animated remaining path line
  - HUD progress/ETA metrics
  - (later) camera look-ahead + analytics

No duplicated polyline math in Dolly/Line/HUD.

---

# Architectural invariants (must hold)

## Single motion driver

There is exactly **one** `useFrame` loop responsible for dolly progress (`traveled`).
Everything else reads outputs.

## Presentation components become dumb

- `Dolly.tsx` becomes **render-only** (mesh)
- `AnimatedPathLine.tsx` becomes **render-only** (line)
- `HudPanel.tsx` becomes **render-only** (metrics)

## Where the motion driver lives

Motion driver lives in **SimViewCanvas** (visualization layer), not App, because:

- it uses `useFrame`
- it mutates per frame
- it should not trigger App-wide rerenders

App remains orchestration: intent + state.

---

# Target file structure

## New module

- `src/app/sim/dollyMotion.ts`
  - pure polyline builders + sampling helpers
  - `useDollyMotionDriver(...)` hook (single owner)

## Type definitions (optional but recommended)

- `src/app/sim/dollyMotionTypes.ts`
  - `Pt`, `DollyPolyline`, `DollyMotionState`, `DollyMotionOutputs`

## Modified components

- `src/app/scenes/shared/Dolly.tsx` → becomes `DollyMesh.tsx` (optional rename)
- `src/app/scenes/shared/AnimatedPathLine.tsx` → becomes render-only (no `useFrame`)
- `src/app/layout/HudPanel.tsx` (or wherever your HUD is)

---

# Phase 1 — Define the shared motion contract

## 1.1 Types

Create `dollyMotionTypes.ts` (or keep types inside dollyMotion.ts initially):

**DollyPolyline**

- `hasPath`
- `tiles`
- `points`
- `segLengths`
- `totalLength`

**DollyMotionState**

- `traveled`
- `progress01`
- `isMoving`
- `arrived`

**DollyMotionOutputs**

- `polyline`
- `state`
- `position` (current world point)
- `remainingPoints` (for line erase)
- `etaSeconds`

### DoD

- Types compile
- No component changes yet

---

# Phase 2 — Implement `sim/dollyMotion.ts` utilities + driver

## 2.1 Pure functions (no React)

In `sim/dollyMotion.ts` implement:

1. `buildPolylineFromPath({ grid, path, yLift }): DollyPolyline`

- maps tiles → lifted world points
- computes segLengths + totalLength
- sets hasPath

2. `samplePointAtDistance({ points, segLengths, totalLength, d }): Pt`

- clamps d
- finds segment index
- lerps within segment

3. `remainingPolylineAtDistance({ points, traveled }): Pt[]`

- returns `[cur,...rest]` for erase effect

4. `deriveMotionState({ traveled, totalLength }): DollyMotionState`

- progress01
- arrived/isMoving flags

5. `computeEtaSeconds({ traveled, totalLength, speed }): number | null`

### DoD

- You can run a quick dev sanity log:
  - build polyline
  - sample at 0, mid, end
  - verify returned points match expectations

---

## 2.2 Motion driver hook (single useFrame owner)

Implement:

`useDollyMotionDriver({ polyline, speed, resetKey, onArrive }): DollyMotionOutputs`

### Responsibilities

- owns:
  - `traveledRef`
  - `arrivedGateRef`

- resets on `resetKey` change
- advances traveled in `useFrame`
- fires `onArrive(lastTile)` once when arrived

### Rerender strategy (important)

Because Dolly + Line + HUD need updates, you need a reactive “tick”:

**MVP strategy (recommended):** minimal state snapshot

- keep `traveled` in React state updated in `useFrame`
- compute derived outputs from state + memoized polyline

Example design:

- `const [traveled, setTraveled] = useState(0)`
- in frame: compute next traveled and call `setTraveled(next)`
  (Optionally throttle to 30fps)

### DoD

- traveled increases with speed
- clamps at totalLength
- arrival callback fires once
- no duplicate `useFrame` logic elsewhere

---

# Phase 3 — Refactor Dolly to render-only

## 3.1 Rename + simplify Dolly

`src/app/scenes/shared/Dolly.tsx` becomes:

**Input props:**

- `position: Pt` (or `[x,y,z]`)
- optional: `color`, `size`, `model` later

**Implementation:**

- no path math
- no segLengths
- no useFrame
- no progress refs
- just set mesh position from props:
  - either directly via `position` on `<mesh position={[...]} />`
  - or via ref + `useEffect` (either is fine)

### DoD

- Dolly renders at passed-in position
- No animation logic remains inside Dolly

---

# Phase 4 — Refactor AnimatedPathLine to render-only

## 4.1 Remove internal progress and useFrame

`AnimatedPathLine.tsx` becomes:

**Input props:**

- `points: readonly Pt[]` (already “remaining” points)
- OR `fullPoints + traveled` if you prefer computing remaining inside component
  - recommended: pass remainingPoints to keep it dumb

**Implementation:**

- If points length < 2 return null
- Map to tuples and render `<Line />`

### DoD

- Line matches current behavior visually
- No internal state resets, no frame loop

---

# Phase 5 — Wire motion in SimViewCanvas

## 5.1 SimViewCanvas becomes the motion owner

In `SimViewCanvas.tsx`:

### Inputs from App

- `grid`
- `path: Tile[]`
- `speed`
- `dollyTile` (for fallback if no path)
- optional `onArrive` handler from App

### Steps

1. Compute `pathKey` (string signature) via `useMemo`

2. Compute `polyline` via `useMemo(buildPolylineFromPath)`

3. Call `useDollyMotionDriver({ polyline, speed, resetKey: pathKey, onArrive })`

4. Determine dolly position:
   - if polyline.hasPath: use `motion.position`
   - else fallback to current tile center + lift

5. Render:

- `<DollyMesh position={dollyPos} />`
- `<AnimatedPathLine points={motion.remainingPoints} />`

### DoD

- Dolly moves exactly as before
- Line erases exactly as before
- Dolly + line are now passive consumers

---

# Phase 6 — Get motion data into HudPanel without App-wide rerenders

This is the subtle part. We want:

- HUD updates during motion
- but we don’t want App to re-render at 60fps

## 6.1 Recommended pattern: HUD rendered inside SimViewCanvas overlay

The cleanest approach is:

- Keep HUD as a DOM overlay **owned by SimViewCanvas**, not App:
  - `<HudPanel motion={motion} />` rendered above canvas

- This way, only the SimViewCanvas subtree re-renders at motion tick rate.

**If you must keep HudPanel at App level** (your message suggests that):

- then you need a carefully-throttled callback (`onMotion`) from SimViewCanvas → App.

### Option A (preferred): SimViewCanvas owns HUD

**SimViewCanvas.tsx**

- renders Canvas
- renders HudPanel in an absolutely-positioned overlay div
- passes `motion.state` + metrics

**DoD**

- App does not rerender per-frame
- HUD updates smoothly

### Option B: App owns HUD via throttled telemetry

**SimViewCanvas props:**

- `onMotion?: (snapshot: MotionSnapshot) => void`

MotionSnapshot is small:

- traveled
- total
- progress01
- isMoving
- etaSeconds
- maybe dollyTile

Inside `useFrame`, call `onMotion` at 10–30Hz (not 60Hz), e.g. with a ref-based throttle.

**App.tsx**

- `const [motionSnap, setMotionSnap] = useState<MotionSnapshot | null>(null);`
- pass to `<HudPanel motion={motionSnap} />`

**DoD**

- HUD updates without tanking React
- App doesn’t rerender 60fps; it rerenders at throttle rate

---

# Phase 7 — Remove legacy code + cleanup

## Cleanup tasks

- Delete duplicated segLength logic from old files
- Remove `activeKey` from path line (if now unused)
- Remove duplicate progress reset
- Ensure strict TS types everywhere

### DoD

- `Dolly.tsx` and `AnimatedPathLine.tsx` contain no motion math
- Only one place uses `useFrame` for motion advancement
- Lint clean, no console logs

---

# Recommended commit cadence

1. **Add motion types + pure helpers** (no behavior change)
2. **Add motion driver hook** (standalone)
3. **Refactor Dolly → render-only** (wire temporary fallback)
4. **Refactor PathLine → render-only**
5. **SimViewCanvas becomes motion owner** (restore full behavior)
6. **HUD integration** (Option A or B)
7. **Cleanup + docs**

---

# Definition of Done (overall refactor)

- Dolly motion logic exists in exactly one place: `sim/dollyMotion.ts`
- Dolly renders from a position input only
- PathLine renders from points input only
- HUD receives motion metrics without duplicating logic
- No App-level per-frame loops
- Camera system can now consume motion outputs without recomputation

---
