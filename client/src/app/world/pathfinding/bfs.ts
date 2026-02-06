//bfs.ts

import type { Tile, TileId } from "../grid/gridTypes";
import { toTileId } from "../grid/gridTypes";
import { parseTileId } from "../grid/gridMath";

export type Adjacency = Record<TileId, TileId[]>;

export const bfsPath = (
  adj: Adjacency,
  start: Tile,
  goal: Tile
): Tile[] => {
  const startId = toTileId(start);
  const goalId = toTileId(goal);

  // trivial case
  if (startId === goalId) return [start];

  const queue: TileId[] = [startId];
  const visited = new Set<TileId>([startId]);

  const cameFrom: Record<TileId, TileId | null> = {} as Record<TileId, TileId | null>;
  cameFrom[startId] = null;

  while (queue.length > 0) {
    const current = queue.shift() as TileId;

    // found goal
    if (current === goalId) {
      return reconstructPath(cameFrom, goalId).map(parseTileId);
    }

    const neighbors = adj[current] ?? [];

    for (const next of neighbors) {
      if (visited.has(next)) continue;
      visited.add(next);
      cameFrom[next] = current;
      queue.push(next);
    }
  }

  // unreachable
  return [];
};

const reconstructPath = (
  cameFrom: Record<TileId, TileId | null>,
  goalId: TileId
): TileId[] => {
  const path: TileId[] = [];
  let cur: TileId | null = goalId;

  while (cur !== null) {
    path.push(cur);
    cur = cameFrom[cur] ?? null;
  }

  path.reverse();
  return path;
};
