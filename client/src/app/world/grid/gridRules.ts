//gridRules.ts
//Rules layer

import type { GridConfig, TileId } from "./gridTypes";
import type { Edge } from "../pathfinding/neighbors";
import { edgesToAdjacency } from "../pathfinding/neighbors";

export type Mode = "NORMAL" | "TRANSPORT";

export const pruneEdgesForTowerModeBlocking = (
  mode: Mode,
  baseEdges: readonly Edge[],
  towerSet: ReadonlySet<TileId>
): Edge[] => {
  return baseEdges.filter((e) => {
    const aIsTower = towerSet.has(e.a);
    const bIsTower = towerSet.has(e.b);

    if (mode === "TRANSPORT") {
      // fully block tower tiles
      return !aIsTower && !bIsTower;
    }

    // mode === "NORMAL"
    if (e.axis === "Z") return true;           // Z always ok
    return !aIsTower && !bIsTower;             // X blocked if either endpoint is tower
  });
};


export const buildPrunedAdjacency = (
  mode: Mode,
  grid: GridConfig,
  baseEdges: readonly Edge[],
  towerSet: ReadonlySet<TileId>
): Record<TileId, TileId[]> => {
  const prunedEdges = pruneEdgesForTowerModeBlocking(mode, baseEdges, towerSet);
  return edgesToAdjacency(grid, prunedEdges);
};
