// src/app/scenes/worldCams.ts
import type { GridConfig, Tile, Vec3 } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type TravelAxis = "X" | "Z";

export type WorldCamId =
  | `LEFT_${number}`
  | `RIGHT_${number}`
  | `TOP_${number}`
  | `BOTTOM_${number}`;

export type WorldCamSpec = Readonly<{
  id: WorldCamId;
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
}>;

export const WORLD_FOV = 50;
export const WORLD_NEAR = 0.1;
export const WORLD_FAR = 500;

// Height of the camera above the floor
export const WORLD_CAM_Y = 16;

// How far outside the grid (in world units). Default: one tile outside.
export const WORLD_RING_OFFSET_TILES = 1;

// Grouping along the “slice axis” (x for TOP/BOTTOM, z for LEFT/RIGHT)
export const WORLD_GROUP_SIZE = 3;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Example: rows=13 => indices 0..12 => split=6
 * “Upper half” is 0..split, “Lower half” is split..12
 * (Overlaps on split by design, matches your z5 overlap style.)
 */
function midSplit(maxIndex: number): number {
  return Math.floor(maxIndex / 2);
}

/**
 * Number of groups along an axis.
 * Example: cols=16, groupSize=3 => groups=6 (0..5)
 */
function groupsCount(count: number, groupSize: number): number {
  return Math.ceil(count / groupSize);
}

function tileGroupIndex(i: number, count: number, groupSize: number): number {
  const maxGroup = groupsCount(count, groupSize) - 1;
  return clamp(Math.floor(i / groupSize), 0, maxGroup);
}

/**
 * Determine travel axis from the first segment of the current path.
 * If path is idle/too short, fall back to lastAxis (or "X").
 */
export function getTravelAxis(args: {
  path: readonly Tile[];
  lastAxis?: TravelAxis;
}): TravelAxis {
  const { path, lastAxis } = args;

  if (path.length >= 2) {
    const a = path[0];
    const b = path[1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;

    if (dx !== 0) return "X";
    if (dz !== 0) return "Z";
  }

  return lastAxis ?? "X";
}

/**
 * Build all world camera specs for the given grid.
 *
 * Key update vs the old version:
 * - TOP/BOTTOM cams still group by X (3-wide slices),
 *   but their TARGET is now centered in the *top half* or *bottom half* of the grid (in Z),
 *   because those cams “own” entire columns within that slice.
 *
 * - LEFT/RIGHT cams still group by Z (3-deep slices),
 *   but their TARGET is now centered in the *left half* or *right half* of the grid (in X),
 *   because those cams “own” entire rows within that slice.
 *
 * The camera POSITION stays on the border ring.
 */
export function buildWorldCamMap(grid: GridConfig): Record<WorldCamId, WorldCamSpec> {
  const { origin, cols, rows, tileSize } = grid;

  const width = cols * tileSize;
  const depth = rows * tileSize;

  const leftX = origin.x - tileSize * WORLD_RING_OFFSET_TILES;
  const rightX = origin.x + width + tileSize * WORLD_RING_OFFSET_TILES;

  const topZ = origin.z - tileSize * WORLD_RING_OFFSET_TILES;
  const bottomZ = origin.z + depth + tileSize * WORLD_RING_OFFSET_TILES;

  const group = WORLD_GROUP_SIZE;
  const xGroups = groupsCount(cols, group);
  const zGroups = groupsCount(rows, group);

  // half split points (with overlap)
  const xSplit = midSplit(cols - 1);
  const zSplit = midSplit(rows - 1);

  // centers of halves
  const xMidLeftHalf = Math.floor((0 + xSplit) / 2);
  const xMidRightHalf = Math.floor((xSplit + (cols - 1)) / 2);

  const zMidTopHalf = Math.floor((0 + zSplit) / 2);
  const zMidBottomHalf = Math.floor((zSplit + (rows - 1)) / 2);

  const camMap: Partial<Record<WorldCamId, WorldCamSpec>> = {};

  // LEFT / RIGHT cameras: groups along Z (slice by Z)
  // - LEFT targets the *left half center* in X
  // - RIGHT targets the *right half center* in X
  for (let g = 0; g < zGroups; g++) {
    const zStart = g * group;
    const zMid = clamp(zStart + Math.floor(group / 2), 0, rows - 1);

    const leftTargetTile: Tile = { x: xMidLeftHalf, z: zMid };
    const rightTargetTile: Tile = { x: xMidRightHalf, z: zMid };

    const leftTarget = tileToWorldCenter(leftTargetTile, grid);
    const rightTarget = tileToWorldCenter(rightTargetTile, grid);

    camMap[`LEFT_${g}`] = {
      id: `LEFT_${g}`,
      position: { x: leftX, y: WORLD_CAM_Y, z: leftTarget.z },
      target: { x: leftTarget.x, y: leftTarget.y, z: leftTarget.z },
      fov: WORLD_FOV,
      near: WORLD_NEAR,
      far: WORLD_FAR,
    };

    camMap[`RIGHT_${g}`] = {
      id: `RIGHT_${g}`,
      position: { x: rightX, y: WORLD_CAM_Y, z: rightTarget.z },
      target: { x: rightTarget.x, y: rightTarget.y, z: rightTarget.z },
      fov: WORLD_FOV,
      near: WORLD_NEAR,
      far: WORLD_FAR,
    };
  }

  // TOP / BOTTOM cameras: groups along X (slice by X)
  // - TOP targets the *top half center* in Z
  // - BOTTOM targets the *bottom half center* in Z
  for (let g = 0; g < xGroups; g++) {
    const xStart = g * group;
    const xMid = clamp(xStart + Math.floor(group / 2), 0, cols - 1);

    const topTargetTile: Tile = { x: xMid, z: zMidTopHalf };
    const bottomTargetTile: Tile = { x: xMid, z: zMidBottomHalf };

    const topTarget = tileToWorldCenter(topTargetTile, grid);
    const bottomTarget = tileToWorldCenter(bottomTargetTile, grid);

    camMap[`TOP_${g}`] = {
      id: `TOP_${g}`,
      position: { x: topTarget.x, y: WORLD_CAM_Y, z: topZ },
      target: { x: topTarget.x, y: topTarget.y, z: topTarget.z },
      fov: WORLD_FOV,
      near: WORLD_NEAR,
      far: WORLD_FAR,
    };

    camMap[`BOTTOM_${g}`] = {
      id: `BOTTOM_${g}`,
      position: { x: bottomTarget.x, y: WORLD_CAM_Y, z: bottomZ },
      target: { x: bottomTarget.x, y: bottomTarget.y, z: bottomTarget.z },
      fov: WORLD_FOV,
      near: WORLD_NEAR,
      far: WORLD_FAR,
    };
  }

  return camMap as Record<WorldCamId, WorldCamSpec>;
}

/**
 * NEW: axis-aware camera selection for “row/column responsibility”.
 *
 * Rule:
 * - If traveling along X axis (dx != 0), we use TOP/BOTTOM cams (z ring).
 *   The slice-group is based on xGroup (3-wide).
 *   The edge is chosen by the dolly’s Z half:
 *     - TOP for z in [0..zSplit]
 *     - BOTTOM for z in [zSplit..rows-1]
 *
 * - If traveling along Z axis (dz != 0), we use LEFT/RIGHT cams (x ring).
 *   The slice-group is based on zGroup (3-deep).
 *   The edge is chosen by the dolly’s X half:
 *     - LEFT for x in [0..xSplit]
 *     - RIGHT for x in [xSplit..cols-1]
 */
export function getActiveWorldCamIdV2(args: {
  grid: GridConfig;
  tile: Tile;
  axis: TravelAxis;
}): WorldCamId {
  const { grid, tile, axis } = args;
  const { cols, rows } = grid;

  const g = WORLD_GROUP_SIZE;

  const xSplit = midSplit(cols - 1);
  const zSplit = midSplit(rows - 1);

  if (axis === "X") {
    const xGroup = tileGroupIndex(tile.x, cols, g);
    return tile.z <= zSplit ? `TOP_${xGroup}` : `BOTTOM_${xGroup}`;
  }

  // axis === "Z"
  const zGroup = tileGroupIndex(tile.z, rows, g);
  return tile.x <= xSplit ? `LEFT_${zGroup}` : `RIGHT_${zGroup}`;
}

/**
 * Back-compat: keeps the old behavior (closest edge).
 * You can delete this later if nothing uses it.
 */
export function getActiveWorldCamId(grid: GridConfig, dollyTile: Tile): WorldCamId {
  // Old stable behavior: choose closest edge, then group along that edge’s axis.
  // Keeping it here so you don’t break older imports.
  const { cols, rows } = grid;
  const g = WORLD_GROUP_SIZE;

  const distLeft = dollyTile.x;
  const distRight = (cols - 1) - dollyTile.x;
  const distTop = dollyTile.z;
  const distBottom = (rows - 1) - dollyTile.z;

  // deterministic tie-break: LEFT, RIGHT, TOP, BOTTOM
  let best: "LEFT" | "RIGHT" | "TOP" | "BOTTOM" = "LEFT";
  let bestDist = distLeft;

  if (distRight < bestDist) {
    best = "RIGHT";
    bestDist = distRight;
  }
  if (distTop < bestDist) {
    best = "TOP";
    bestDist = distTop;
  }
  if (distBottom < bestDist) {
    best = "BOTTOM";
    bestDist = distBottom;
  }

  if (best === "LEFT") return `LEFT_${tileGroupIndex(dollyTile.z, rows, g)}`;
  if (best === "RIGHT") return `RIGHT_${tileGroupIndex(dollyTile.z, rows, g)}`;
  if (best === "TOP") return `TOP_${tileGroupIndex(dollyTile.x, cols, g)}`;
  return `BOTTOM_${tileGroupIndex(dollyTile.x, cols, g)}`;
}

/**
 * Convenience: compute active spec using V2 rules.
 */
export function getActiveWorldCamSpecV2(args: {
  grid: GridConfig;
  tile: Tile;
  axis: TravelAxis;
}): WorldCamSpec {
  const camMap = buildWorldCamMap(args.grid);
  const id = getActiveWorldCamIdV2(args);
  return camMap[id];
}
