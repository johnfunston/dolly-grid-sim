//Rules layer

import type { GridConfig, TileId } from "./gridTypes";
import type { Edge } from "../pathfinding/neighbors";
import { edgesToAdjacency } from "../pathfinding/neighbors";

export const pruneEdgesForTowerXBlocking = (
  baseEdges: readonly Edge[],
  towerSet: ReadonlySet<TileId>
): Edge[] => {
  return baseEdges.filter((e) => {
    // Z moves always allowed
    if (e.axis === "Z") return true;

    // X moves allowed only if neither endpoint is a tower tile
    const aIsTower = towerSet.has(e.a);
    const bIsTower = towerSet.has(e.b);
    return !aIsTower && !bIsTower;
  });
};

export const buildPrunedAdjacency = (
  grid: GridConfig,
  baseEdges: readonly Edge[],
  towerSet: ReadonlySet<TileId>
): Record<TileId, TileId[]> => {
  const prunedEdges = pruneEdgesForTowerXBlocking(baseEdges, towerSet);
  return edgesToAdjacency(grid, prunedEdges);
};
