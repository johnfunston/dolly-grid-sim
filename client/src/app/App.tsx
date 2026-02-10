// src/App.tsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import type { Tile, TileId } from "./world/grid/gridTypes";
import { DEFAULT_GRID, toTileId } from "./world/grid/gridTypes";
import { generateTowerTiles, buildTowerSet } from "./world/towers/towerLocations";
import { buildBaseEdges } from "./world/pathfinding/neighbors";
import { buildPrunedAdjacency } from "./world/grid/gridRules";
import { bfsPath } from "./world/pathfinding/bfs";

import SimViewCanvas from "./scenes/SimViewCanvas";
import WorldViewCanvas from "./scenes/WorldViewCanvas";
import HudPanel from "./ui/HudPanel";
import AboutModal from "./ui/AboutModal";
import ControlPanel from "./ui/ControlPanel";
import type { ActiveView, SimCamMode, WorldCamMode } from "./ui/ControlPanel";
import OrbitHint from "./ui/OrbitHint";

import type { Command, HoverIntent } from "./world/sim/commands";
import { CMD } from "./world/sim/commands";
import { expandSwap } from "./world/sim/expandSwap";

import "./styles/globals.css";

function tileEquals(a: Tile, b: Tile) {
  return a.x === b.x && a.z === b.z;
}

function App() {
  const grid = DEFAULT_GRID;
  const speed = 2;

  // which canvas is primary
  const [activeView, setActiveView] = useState<ActiveView>("SIM");

  // camera mode state
  const [simCamMode, setSimCamMode] = useState<SimCamMode>("CHASE");
  const [worldCamMode, setWorldCamMode] =
    useState<WorldCamMode>("CENTER_OVERVIEW");

  // for start/destination camera end of sequence targetting
  const [simCamReseed, setSimCamReseed] = useState(0);

  const handleSetSimCamMode = useCallback((next: SimCamMode) => {
    setSimCamMode((prev) => {
      if (prev === next) setSimCamReseed((n) => n + 1);
      return next;
    });
  }, []);

  const [dollyTile, setDollyTile] = useState<Tile>({ x: 7, z: 5 });
  const [path, setPath] = useState<Tile[]>([]);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);
  const [hoveredTowerTile, setHoveredTowerTile] = useState<Tile | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  // Queue history for HUD chips
  const [queueHistory, setQueueHistory] = useState<string[]>(["IDLE"]);

  const resetQueueHistoryForNewRun = useCallback(() => {
    setQueueHistory(["IDLE"]);
  }, []);

  const pushChip = useCallback((label: string) => {
    setQueueHistory((prev) => {
      const base = prev.length === 1 && prev[0] === "IDLE" ? [] : prev;
      return [...base, label];
    });
  }, []);

  const pushDoneChipIfMissing = useCallback(() => {
    setQueueHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === "DONE") return prev;
      const base = prev.length === 1 && prev[0] === "IDLE" ? [] : prev;
      return [...base, "DONE"];
    });
  }, []);

  // carrying is the carried tower's ORIGINAL tile (source-of-truth for mode)
  const [carrying, setCarrying] = useState<Tile | null>(null);

  // towers is authoritative placed tower list (UI mirror of towersRef)
  const [towers, setTowers] = useState<Tile[]>(() => generateTowerTiles(grid));

  // queue state is only for rendering / disabling inputs
  const [queue, setQueue] = useState<Command[]>([]);

  // about modal
  const [aboutOpen, setAboutOpen] = useState(false);

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
  const adjTransportRef = useRef(
    buildPrunedAdjacency("TRANSPORT", grid, baseEdges, towerSet)
  );

  useEffect(() => {
    dollyTileRef.current = dollyTile;
  }, [dollyTile]);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    carryingRef.current = carrying;
  }, [carrying]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
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
    adjRef.current = buildPrunedAdjacency(
      runtimeMode,
      grid,
      baseEdgesRef.current,
      ts
    );
    adjTransportRef.current = buildPrunedAdjacency(
      "TRANSPORT",
      grid,
      baseEdgesRef.current,
      ts
    );
  }, [grid]);

  // --------------------------
  // Runner
  // --------------------------
  const runNextRef = useRef<() => void>(() => {});

  // DONE guard (prevents spamming DONE every render)
  const didPushDoneRef = useRef(false);

  const resetDoneGuard = useCallback(() => {
    didPushDoneRef.current = false;
  }, []);

  const setQueueBoth = useCallback((next: Command[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const popHead = useCallback(() => {
    const next = queueRef.current.slice(1);
    setQueueBoth(next);
  }, [setQueueBoth]);

  const replaceQueue = useCallback(
    (next: Command[]) => {
      setQueueBoth(next);
    },
    [setQueueBoth]
  );

  const enqueue = useCallback(
    (cmds: Command[]) => {
      if (cmds.length === 0) return;

      // If idle and a new run begins, clear prior chips and re-arm DONE.
      if (pathRef.current.length < 2 && queueRef.current.length === 0) {
        resetQueueHistoryForNewRun();
        resetDoneGuard();
      }

      const next = [...queueRef.current, ...cmds];
      setQueueBoth(next);
      queueMicrotask(() => runNextRef.current());
    },
    [resetQueueHistoryForNewRun, resetDoneGuard, setQueueBoth]
  );

  const runNext = useCallback(() => {
    // do not execute while moving
    if (pathRef.current.length >= 2) return;

    // ensure graphs match current towers/carrying *now*
    refreshRuntimeGraphs();

    const q = queueRef.current;

    // ✅ DONE condition occurs here (only when idle, because runNext bails while moving)
    if (q.length === 0) {
      if (!didPushDoneRef.current) {
        pushDoneChipIfMissing();
        didPushDoneRef.current = true;
      }
      return;
    }

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

      // first movement in a run should re-arm DONE + start chips
      resetDoneGuard();
      pushChip("MOVE");

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

      const nextTowers = towerList.filter((t) => !tileEquals(t, target));
      towersRef.current = nextTowers;
      setTowers(nextTowers);

      carryingRef.current = target;
      setCarrying(target);

      pushChip("LIFT");

      refreshRuntimeGraphs();

      popHead();
      kick();
      return;
    }

    // DROP
    if (current.type === "DROP") {
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

      const nextTowers = [...towerList, target];
      towersRef.current = nextTowers;
      setTowers(nextTowers);

      carryingRef.current = null;
      setCarrying(null);

      pushChip("DROP");

      refreshRuntimeGraphs();

      popHead();
      kick();
      return;
    }

    // Fallback: unknown / unsupported cmd => drop it
    popHead();
    kick();
  }, [popHead, pushDoneChipIfMissing, pushChip, refreshRuntimeGraphs, replaceQueue, resetDoneGuard]);

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
    setHoveredTile(tile); // ensure hoverPath updates so PathLine shows
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
        towerSet: towerSetRef.current as unknown as ReadonlySet<TileId>,
      });

      // "SWAP" is a semantic chip for the user's intent (the queue itself will still emit MOVE/LIFT/DROP as it runs)
      pushChip("SWAP");
      enqueue(cmds);
    },
    [actionsDisabled, enqueue, grid, pushChip, refreshRuntimeGraphs]
  );

  // --------------------------
  // View swap
  // --------------------------
  const swapViews = useCallback(() => {
    setActiveView((v) => (v === "SIM" ? "WORLD" : "SIM"));
  }, []);

  const simIsPrimary = activeView === "SIM";
  const worldIsPrimary = activeView === "WORLD";

  // --------------------------
  // Orbit Hint for cam modes
  // --------------------------
  const showOrbitHint =
    activeView === "SIM" &&
    !isMoving &&
    (simCamMode === "DOLLY" ||
      simCamMode === "PATH_START" ||
      simCamMode === "DESTINATION_TILE");

  return (
    <div className="app-root">
      <h1 className='project-title'>dolly_grid_sim v0.1</h1>
      {/* ABOUT MODAL BUTTON */}
      <div className="about-button-wrap">
        <button type="button" onClick={() => setAboutOpen(true)}>
          <span className="info-icon">i</span> PROJECT DETAILS
        </button>
      </div>

      {/* PRIMARY CANVAS */}
      <div className={simIsPrimary ? "canvas-primary" : "canvas-pip"}>
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
          activeView={activeView}
          simCamMode={simCamMode}
          simCamReseed={simCamReseed}
          showGrid={showGrid}
        />

        {!simIsPrimary && (
          <button className="world-swap-btn" type="button" onClick={swapViews}>
            ⇄
          </button>
        )}
      </div>

      {/* SECONDARY CANVAS (PiP) */}
      <div>
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
          activeView={activeView}
          worldCamMode={worldCamMode}
          showGrid={showGrid}
        />

        {!worldIsPrimary && (
          <button className={"sim-swap-btn"} type="button" onClick={swapViews}>
            ⇄
          </button>
        )}
      </div>

      {/* HUD (overlay, read-only) */}
        <HudPanel
          grid={grid}
          dollyTile={dollyTile}
          hoveredTile={hoveredTile}
          hoveredTowerTile={hoveredTowerTile}
          carrying={carrying}
          isMoving={isMoving}
          path={path}
          speed={speed}
          queueHistory={queueHistory}
        />

      <OrbitHint show={showOrbitHint} />

      <ControlPanel
        activeView={activeView}
        onSetActiveView={setActiveView}
        simCamMode={simCamMode}
        onSetSimCamMode={handleSetSimCamMode}
        worldCamMode={worldCamMode}
        onSetWorldCamMode={setWorldCamMode}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
      />

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export default App;
