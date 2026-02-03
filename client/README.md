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
