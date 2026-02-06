//towerLocations.ts
//Layout/Content layerimport type { GridConfig, Tile, TileId } from "../grid/gridTypes";

import type { GridConfig, Tile, TileId } from "../grid/gridTypes";
import { toTileId } from "../grid/gridTypes";

/**
 * Checkerboard tower lattice:
 * towers at odd x and odd z (starting at 1,1), until maxTowers is reached.
 */
export const generateTowerTiles = (
  grid: GridConfig,
  maxTowers: number = 24
): Tile[] => {
  const towerTiles: Tile[] = [];

  for (let z = 2; z < grid.rows; z += 2) {
    for (let x = 2; x < grid.cols -1; x += 2) {
      towerTiles.push({ x, z });

      if (towerTiles.length >= maxTowers) {
        return towerTiles;
      }
    }
  }

  return towerTiles;
};


export const buildTowerSet = (towers: readonly Tile[]): ReadonlySet<TileId> => {
  return new Set(towers.map((t) => toTileId(t)))

};

export const isTowerAt = (
  tile: Tile,
  towerSet: ReadonlySet<TileId>
): boolean => {
  return towerSet.has(toTileId(tile));
};

