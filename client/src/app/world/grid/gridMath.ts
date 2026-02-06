//gridMath.ts

import type { GridConfig, Tile, TileId, Vec3 } from "./gridTypes";

/**
 * Value equality for tiles (NOT reference equality).
 */
export const tileEquals = (a: Tile, b: Tile): boolean => {
  return a.x === b.x && a.z === b.z;
};

/**
 * True if tile exists on the grid.
 * x in [0, cols-1], z in [0, rows-1]
 */
export const isInBounds = (tile: Tile, grid: GridConfig): boolean => {
  return (
    tile.x >= 0 &&
    tile.x < grid.cols &&
    tile.z >= 0 &&
    tile.z < grid.rows
  );
};

/**
 * Reverse of toTileId: "x:z" -> { x, z }
 */
export const parseTileId = (id: TileId): Tile => {
  const [xStr, zStr] = id.split(":");
  return { x: Number(xStr), z: Number(zStr) };
};

/**
 * Enumerate every tile in the grid, row-major by z then x.
 * Length must be rows * cols.
 */
export const allTiles = (grid: GridConfig): Tile[] => {
  const tiles: Tile[] = [];

  for (let z = 0; z < grid.rows; z++) {
    for (let x = 0; x < grid.cols; x++) {
      tiles.push({ x, z });
    }
  }

  return tiles;
};

/**
 * Convert tile address -> world center point.
 * Assumes grid lies on x-z plane, origin is corner of tile (0,0).
 */
export const tileToWorldCenter = (tile: Tile, grid: GridConfig): Vec3 => {
  const { origin, tileSize } = grid;
  return {
    x: origin.x + (tile.x + 0.5) * tileSize,
    y: origin.y,
    z: origin.z + (tile.z + 0.5) * tileSize,
  };
};
