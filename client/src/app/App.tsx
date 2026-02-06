// src/App.tsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Tile, TileId } from "./world/grid/gridTypes";
import { DEFAULT_GRID, toTileId } from "./world/grid/gridTypes";
import { generateTowerTiles, buildTowerSet } from "./world/towers/towerLocations";
import { buildBaseEdges } from "./world/pathfinding/neighbors";
import { buildPrunedAdjacency } from "./world/grid/gridRules";
import { bfsPath } from "./world/pathfinding/bfs";
import SimViewCanvas from "./scenes/SimViewCanvas";
import HudPanel from './ui/HudPanel';
import WorldViewCanvas from "./scenes/WorldViewCanvas";

import type { Command, HoverIntent } from "./world/sim/commands";
import { CMD } from "./world/sim/commands";
import { expandSwap } from "./world/sim/expandSwap";
import './styles/globals.css';

function App() {
  const grid = DEFAULT_GRID;
  const speed = 2;

  const [dollyTile, setDollyTile] = useState<Tile>({ x: 7, z: 5 });
  const [path, setPath] = useState<Tile[]>([]);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
  const [hoveredTowerTile, setHoveredTowerTile] = useState<Tile | null>(null);

  // carrying is the carried tower's ORIGINAL tile (source-of-truth for mode)
  const [carrying, setCarrying] = useState<Tile | null>(null);

  // towers is authoritative placed tower list (UI mirror of towersRef)
  const [towers, setTowers] = useState<Tile[]>(() => generateTowerTiles(grid));

  // queue state is only for rendering / disabling inputs
  const [queue, setQueue] = useState<Command[]>([]);

  // --------------------------
  // helpers
  // --------------------------
  const tileEquals = (a: Tile, b: Tile) => a.x === b.x && a.z === b.z;

  const isMoving = path.length >= 2;
  const actionsDisabled = isMoving || queue.length > 0;

  // baseEdges are stable
  const baseEdges = useMemo(() => buildBaseEdges(grid), [grid]);
  const baseEdgesRef = useRef(baseEdges);
  useEffect(() => {
    baseEdgesRef.current = baseEdges;
  }, [baseEdges]);

  // UI previews only (runner uses refs)
  const mode = carrying ? "TRANSPORT" : "NORMAL";

  const placedTowers = useMemo(() => {
    if (!carrying) return towers;
    return towers.filter((t) => !tileEquals(t, carrying));
  }, [towers, carrying]);

  const towerSet = useMemo(() => buildTowerSet(placedTowers), [placedTowers]);

  const adjForUI = useMemo(
    () => buildPrunedAdjacency(mode, grid, baseEdges, towerSet),
    [mode, grid, baseEdges, towerSet]
  );

  const hoverPath = useMemo(() => {
    if (isMoving) return [];
    if (!hoveredTile) return [];
    if (tileEquals(hoveredTile, dollyTile)) return [];
    return bfsPath(adjForUI, dollyTile, hoveredTile);
  }, [adjForUI, dollyTile, hoveredTile, isMoving]);

  // --------------------------
  // Refs for runner (authoritative)
  // --------------------------
  const queueRef = useRef<Command[]>([]);
  const dollyTileRef = useRef<Tile>(dollyTile);
  const towersRef = useRef<Tile[]>(towers);
  const carryingRef = useRef<Tile | null>(carrying);
  const pathRef = useRef<Tile[]>(path);

  // runtime-derived refs
  const towerSetRef = useRef<ReadonlySet<TileId>>(towerSet);
  const adjRef = useRef(buildPrunedAdjacency("NORMAL", grid, baseEdges, towerSet));
  const adjTransportRef = useRef(buildPrunedAdjacency("TRANSPORT", grid, baseEdges, towerSet));

  useEffect(() => {
    dollyTileRef.current = dollyTile;
  }, [dollyTile]);

  useEffect(() => {
    // UI state mirrors this, but runner owns truth via towersRef
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    carryingRef.current = carrying;
  }, [carrying]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    // keep in sync for UI-derived towerSet, but runner will refresh it too
    towerSetRef.current = towerSet;
  }, [towerSet]);

  // --------------------------
  // Synchronous adjacency refresh for runner
  // --------------------------
  const refreshRuntimeGraphs = useCallback(() => {
    const placed = towersRef.current; // carried tile removed from towersRef during lift
    const ts = buildTowerSet(placed);
    towerSetRef.current = ts;

    const runtimeMode = carryingRef.current ? "TRANSPORT" : "NORMAL";
    adjRef.current = buildPrunedAdjacency(runtimeMode, grid, baseEdgesRef.current, ts);
    adjTransportRef.current = buildPrunedAdjacency("TRANSPORT", grid, baseEdgesRef.current, ts);
  }, [grid]);

  // --------------------------
  // Runner (queue ref is authoritative)
  // --------------------------
  const runNextRef = useRef<() => void>(() => {});

  const setQueueBoth = (next: Command[]) => {
    queueRef.current = next;
    setQueue(next);
  };

  const popHead = () => {
    const next = queueRef.current.slice(1);
    setQueueBoth(next);
  };

  const replaceQueue = (next: Command[]) => {
    setQueueBoth(next);
  };

  const enqueue = useCallback((cmds: Command[]) => {
    if (cmds.length === 0) return;
    const next = [...queueRef.current, ...cmds];
    setQueueBoth(next);
    queueMicrotask(() => runNextRef.current());
  }, []);

  const runNext = useCallback(() => {
    // do not execute while moving
    if (pathRef.current.length >= 2) return;

    // ensure graphs match current towers/carrying *now*
    refreshRuntimeGraphs();

    const q = queueRef.current;
    if (q.length === 0) return;

    const current = q[0];
    const kick = () => queueMicrotask(() => runNextRef.current());

    const tileHasTower = (tile: Tile, list: readonly Tile[]) =>
      list.some((t) => tileEquals(t, tile));

    const tryRewriteWithMove = (target: Tile, cmd: Command) => {
      const from = dollyTileRef.current;
      const nextPath = bfsPath(adjRef.current, from, target);

      // unreachable => drop cmd
      if (nextPath.length < 2 && !tileEquals(from, target)) {
        popHead();
        kick();
        return;
      }

      replaceQueue([CMD.moveTo(target), cmd, ...q.slice(1)]);
      kick();
    };

    if (current.type === "MOVE_TO") {
      const from = dollyTileRef.current;
      const to = current.to;

      if (tileEquals(from, to)) {
        popHead();
        kick();
        return;
      }

      const nextPath = bfsPath(adjRef.current, from, to);

      if (nextPath.length < 2) {
        popHead();
        kick();
        return;
      }

      popHead();
      setPath(nextPath);
      pathRef.current = nextPath;
      return;
    }

    if (current.type === "LIFT") {
      const at = dollyTileRef.current;
      const target = current.tile;

      if (!tileEquals(at, target)) {
        tryRewriteWithMove(target, current);
        return;
      }

      if (carryingRef.current) {
        popHead();
        kick();
        return;
      }

      const towerList = towersRef.current;
      if (!tileHasTower(target, towerList)) {
        popHead();
        kick();
        return;
      }

      // ✅ IMPORTANT: update refs synchronously (do NOT wait for React updater callbacks)
      const nextTowers = towerList.filter((t) => !tileEquals(t, target));
      towersRef.current = nextTowers;
      setTowers(nextTowers);

      carryingRef.current = target;
      setCarrying(target);

      // refresh immediately so next MOVE_TO uses correct graphs
      refreshRuntimeGraphs();

      popHead();
      kick();
      return;
    }

    // DROP
    {
      const at = dollyTileRef.current;
      const target = current.tile;

      if (!tileEquals(at, target)) {
        tryRewriteWithMove(target, current);
        return;
      }

      const carryingNow = carryingRef.current;
      if (!carryingNow) {
        popHead();
        kick();
        return;
      }

      const towerList = towersRef.current;
      if (tileHasTower(target, towerList)) {
        popHead();
        kick();
        return;
      }

      // ✅ sync ref update
      const nextTowers = [...towerList, target];
      towersRef.current = nextTowers;
      setTowers(nextTowers);

      carryingRef.current = null;
      setCarrying(null);

      refreshRuntimeGraphs();

      popHead();
      kick();
      return;
    }
  }, [refreshRuntimeGraphs]);

  useEffect(() => {
    runNextRef.current = runNext;
  }, [runNext]);

  // --------------------------
  // Grid hover/click
  // --------------------------
  const handleTileHover = useCallback((tile: Tile | null) => {
    setHoveredTile(tile);
  }, []);

  const handleTowerHover = useCallback((tile: Tile | null) => {
  setHoveredTowerTile(tile);
  setHoveredTile(tile); // ✅ ensure hoverPath updates so PathLine shows
}, []);


  const handleTileClick = useCallback(
    (tile: Tile) => {
      if (actionsDisabled) return;
      enqueue([CMD.moveTo(tile)]);
    },
    [actionsDisabled, enqueue]
  );

  const handleArrive = useCallback((tile: Tile) => {
    setDollyTile(tile);
    dollyTileRef.current = tile;

    setPath([]);
    pathRef.current = [];

    queueMicrotask(() => runNextRef.current());
  }, []);

  // --------------------------
  // Hover overlay intents
  // --------------------------

  const onHoverIntent = useCallback(
    (intent: HoverIntent) => {
      if (actionsDisabled) return;

      const tile = intent.tile;

      if (intent.type === "MOVE_TO") {
        enqueue([CMD.moveTo(tile)]);
        return;
      }

      if (intent.type === "LIFT_AT") {
        enqueue([CMD.lift(tile)]);
        return;
      }

      if (intent.type === "DROP_AT") {
        enqueue([CMD.drop(tile)]);
        return;
      }

      // SWAP_WITH
      const aOrigin = carryingRef.current;
      if (!aOrigin) return;

      const bOrigin = tile;

      refreshRuntimeGraphs();

      const ts = towerSetRef.current as unknown as ReadonlySet<string>;
      if (!ts.has(toTileId(bOrigin) as unknown as string)) return;

      const swapStart = dollyTileRef.current;

      const cmds = expandSwap({
        grid,
        swapStart,
        aOrigin,
        bOrigin,
        adjTransport: adjTransportRef.current,
        towerSet: towerSetRef.current as unknown as ReadonlySet<TileId>, // actual type is TileId set; runtime ok
      });

      enqueue(cmds);
    },
    [actionsDisabled, enqueue, grid, refreshRuntimeGraphs]
  );

    return (
    <div>
      <SimViewCanvas
        grid={grid}
        towers={placedTowers}
        dollyTile={dollyTile}
        path={path}
        hoveredTile={hoveredTile}
        onTileHover={handleTileHover}
        onTileClick={handleTileClick}
        onArrive={handleArrive}
        hoverPath={hoverPath}
        carrying={carrying}
        isMoving={isMoving}
        queueLen={queue.length}
        hoveredTowerTile={hoveredTowerTile}
        onTowerHover={handleTowerHover}
        onHoverIntent={onHoverIntent}
      />
      <WorldViewCanvas
        grid={grid}
        towers={placedTowers}
        dollyTile={dollyTile}
        path={path}
        hoveredTile={hoveredTile}
        onTileHover={handleTileHover}
        onTileClick={handleTileClick}
        onArrive={handleArrive}
        hoverPath={hoverPath}
        carrying={carrying}
        isMoving={isMoving}
        queueLen={queue.length}
        hoveredTowerTile={hoveredTowerTile}
        onTowerHover={handleTowerHover}
        onHoverIntent={onHoverIntent}
      />

      {/* ✅ HUD: pure read-only data display */}
      <div>
        <HudPanel
          grid={grid}
          dollyTile={dollyTile}
          hoveredTile={hoveredTile}
          hoveredTowerTile={hoveredTowerTile}
          carrying={carrying}
          isMoving={isMoving}
          path={path}
          speed={speed}
          queueLen={queue.length}
        />
      </div>
    </div>
  );

}

export default App;
