// src/app/sim/expandSwap.ts
import type { GridConfig, Tile, TileId } from "../../world/grid/gridTypes";
import { toTileId } from "../../world/grid/gridTypes";
import { isInBounds, tileEquals } from "../../world/grid/gridMath";
import type { Adjacency } from "../../world/pathfinding/bfs";
import { CMD } from "./commands";
import type { Command } from "./commands";

export const neighbors4 = (tile: Tile, grid: GridConfig): Tile[] => {
  const candidates: Tile[] = [
    { x: tile.x + 1, z: tile.z },
    { x: tile.x - 1, z: tile.z },
    { x: tile.x, z: tile.z + 1 },
    { x: tile.x, z: tile.z - 1 },
  ];
  return candidates.filter((t) => isInBounds(t, grid));
};

export const distance = (adj: Adjacency, from: Tile, to: Tile): number => {
  const startId = toTileId(from);
  const goalId = toTileId(to);

  if (startId === goalId) return 0;

  const queue: TileId[] = [startId];
  const visited = new Set<TileId>([startId]);
  const dist: Record<TileId, number> = {} as Record<TileId, number>;
  dist[startId] = 0;

  while (queue.length > 0) {
    const cur = queue.shift() as TileId;
    const curD = dist[cur] ?? 0;

    if (cur === goalId) return curD;

    const ns = adj[cur] ?? [];
    for (const nxt of ns) {
      if (visited.has(nxt)) continue;
      visited.add(nxt);
      dist[nxt] = curD + 1;
      queue.push(nxt);
    }
  }

  return Number.POSITIVE_INFINITY;
};

const stableTileKey = (t: Tile): string => `${t.x}:${t.z}`;

const pickClosest = (
  candidates: readonly Tile[],
  adjTransport: Adjacency,
  swapStart: Tile
): Tile | null => {
  let best: Tile | null = null;
  let bestD = Number.POSITIVE_INFINITY;

  // deterministic tie-break: distance, then tileId string
  const sorted = [...candidates].sort((a, b) =>
    stableTileKey(a).localeCompare(stableTileKey(b))
  );

  for (const c of sorted) {
    const d = distance(adjTransport, swapStart, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return bestD === Number.POSITIVE_INFINITY ? null : best;
};

export type ExpandSwapArgs = Readonly<{
  grid: GridConfig;
  swapStart: Tile; // snapshot of dolly tile when swap clicked
  aOrigin: Tile; // carried tower origin
  bOrigin: Tile; // hovered tower origin
  adjTransport: Adjacency; // TRANSPORT adjacency (tower tiles fully blocked)
  towerSet: ReadonlySet<TileId>; // placed towers excluding carried A
}>;

/**
 * Expand SWAP(A carried at aOrigin, B at bOrigin) into primitive queue commands using
 * two staging tiles adjacent to bOrigin chosen by BFS distance from swapStart under TRANSPORT.
 *
 * If no valid s1 or s2 exist, returns [] (caller should no-op / disable).
 */
export const expandSwap = ({
  grid,
  swapStart,
  aOrigin,
  bOrigin,
  adjTransport,
  towerSet,
}: ExpandSwapArgs): Command[] => {
  // candidates are adjacent to bOrigin, in bounds, and not occupied by a placed tower
  const candidates = neighbors4(bOrigin, grid).filter((t) => {
    const id = toTileId(t);
    if (towerSet.has(id)) return false;
    // staging should not be bOrigin itself (it isn't, since neighbors4)
    // allow aOrigin if it is adjacent and currently empty (it should be empty while carrying).
    return true;
  });

  const s1 = pickClosest(candidates, adjTransport, swapStart);
  if (!s1) return [];

  const s2Candidates = candidates.filter((t) => !tileEquals(t, s1));
  const s2 = pickClosest(s2Candidates, adjTransport, swapStart);
  if (!s2) return [];

  // Macro plan (as specified)
  return [
    CMD.moveTo(s1),
    CMD.drop(s1), // stage A
    CMD.moveTo(bOrigin),
    CMD.lift(bOrigin), // pick up B
    CMD.moveTo(s2),
    CMD.drop(s2), // stage B
    CMD.moveTo(s1),
    CMD.lift(s1), // pick up A
    CMD.moveTo(bOrigin),
    CMD.drop(bOrigin), // place A at B origin
    CMD.moveTo(s2),
    CMD.lift(s2), // pick up B
    CMD.moveTo(aOrigin),
    CMD.drop(aOrigin), // place B at A origin
  ];
};
