//neighbors.ts
//Graph constructor

import type { GridConfig, TileId } from "../grid/gridTypes";
import { toTileId } from "../grid/gridTypes";
import { allTiles, isInBounds } from "../grid/gridMath";

export type Axis = "X" | "Z";

export type Edge = Readonly<{
  a: TileId;
  b: TileId;
  axis: Axis;
}>;

export type Adjacency = Readonly<Record<TileId, ReadonlyArray<TileId>>>;

export const buildBaseEdges = (grid: GridConfig): Edge[] => {

const baseEdges: Edge[] = [];

  for (const tile of allTiles(grid)) {
    const east = {x: tile.x + 1, z: tile.z}
    const south = {x: tile.x, z: tile.z + 1}
    
    if (isInBounds(east, grid)) {
        baseEdges.push({a: toTileId(tile), b: toTileId(east), axis: "X"})
    }
    if (isInBounds(south, grid)) {
        baseEdges.push({a: toTileId(tile), b: toTileId(south), axis: "Z"})
    }
  }
  console.log(baseEdges)
  return baseEdges;
};

export const edgesToAdjacency = (
  grid: GridConfig,
  edges: readonly Edge[]
): Record<TileId, TileId[]> => {
  // 1) Initialize every tileId to an empty neighbor list
  const adj: Record<TileId, TileId[]> = {} as Record<TileId, TileId[]>;

  for (const tile of allTiles(grid)) {
    adj[toTileId(tile)] = [];
  }

  // 2) For each undirected edge, add neighbors in BOTH directions
  for (const e of edges) {
    adj[e.a].push(e.b);
    adj[e.b].push(e.a);
  }

  return adj;
};

