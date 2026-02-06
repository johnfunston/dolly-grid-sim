// src/app/scenes/WorldViewCanvas.tsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import type { PerspectiveCamera } from "three";

import Floor from "./shared/Floor";
import GridOverlay from "./shared/GridOverlay";
import Dolly from "./shared/Dolly";
import TowerClones from "./shared/TowerClones";
import HoverTowerControls from "./shared/HoverTowerControls";
import AnimatedPathLine from "./shared/AnimatedPathLine";
import PathLine from "./shared/PathLine";
import TilePickerGrid from "./shared/TilePickerGrid";
import HoverHighlight from "./shared/HoverHighlight";
import HoverTileControls from "./shared/HoverTileControls";
import type { HoverIntent } from "../world/sim/commands";

import { Environment } from "@react-three/drei";
import "../styles/globals.css";

import LiftedTower from "./shared/LiftedTower";
import { tileToWorldCenter } from "../world/grid/gridMath";

// ✅ world cam selection (static cams + snap switching)
import {
  buildWorldCamMap,
  getActiveWorldCamIdV2,
  WORLD_FOV,
  WORLD_NEAR,
  WORLD_FAR,
  type TravelAxis,
} from "../world/cameras/worldCameras";

// ------------------------------------
// Helpers: world position -> tile
// ------------------------------------
function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function worldPosToTile(grid: GridConfig, p: Vec3): Tile {
  const { origin, tileSize, cols, rows } = grid;

  const fx = (p.x - origin.x) / tileSize;
  const fz = (p.z - origin.z) / tileSize;

  const x = clampInt(Math.floor(fx), 0, cols - 1);
  const z = clampInt(Math.floor(fz), 0, rows - 1);

  return { x, z };
}

// ------------------------------------
// Axis: use CURRENT segment (closest to dolly),
// not path[0]->path[1].
// This makes cams switch immediately at corners.
// ------------------------------------
function axisFromClosestPathSegment(args: {
  grid: GridConfig;
  path: readonly Tile[];
  dollyWorldPos: Vec3;
  lastAxis: TravelAxis;
}): TravelAxis {
  const { grid, path, dollyWorldPos, lastAxis } = args;
  if (path.length < 2) return lastAxis;

  // Convert path tiles to world centers (path lengths are small; this is fine).
  const pts = path.map((t) => tileToWorldCenter(t, grid));

  // Find closest segment to dolly position in XZ plane.
  let bestI = 0;
  let bestD2 = Number.POSITIVE_INFINITY;

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];

    const abx = b.x - a.x;
    const abz = b.z - a.z;

    const apx = dollyWorldPos.x - a.x;
    const apz = dollyWorldPos.z - a.z;

    const abLen2 = abx * abx + abz * abz;
    const t =
      abLen2 > 1e-6
        ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLen2))
        : 0;

    const cx = a.x + abx * t;
    const cz = a.z + abz * t;

    const dx = dollyWorldPos.x - cx;
    const dz = dollyWorldPos.z - cz;

    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestI = i;
    }
  }

  // Axis from the closest segment direction (your paths are axis-aligned)
  const aTile = path[bestI];
  const bTile = path[bestI + 1];
  const dx = bTile.x - aTile.x;
  const dz = bTile.z - aTile.z;

  if (Math.abs(dx) > Math.abs(dz)) return "X";
  if (Math.abs(dz) > Math.abs(dx)) return "Z";

  // fallback (shouldn't happen for axis-aligned moves)
  return lastAxis;
}

// ------------------------------------
// WorldCamController: SNAP ONLY + segment-axis-aware
// - Cameras are static (fixed position + fixed target)
// - Axis flips as the dolly hits corners (closest segment changes)
// - No lerp, no damping, no smoothing
// ------------------------------------
function WorldCamController({
  grid,
  path,
  dollyWorldPosRef,
}: {
  grid: GridConfig;
  path: readonly Tile[];
  dollyWorldPosRef: React.RefObject<Vec3>;
}) {
  const { camera: r3fCamera } = useThree();
  const cam = r3fCamera as PerspectiveCamera;

  // Build all camera specs once per grid
  const camMap = useMemo(() => buildWorldCamMap(grid), [grid]);

  const lastCamIdRef = useRef<string>("");
  const lastAxisRef = useRef<TravelAxis>("X");

  // Seed once so first frame is correct
  useEffect(() => {
    const p =
      dollyWorldPosRef.current ?? tileToWorldCenter({ x: 0, z: 0 }, grid);
    const liveTile = worldPosToTile(grid, p);

    const axis = axisFromClosestPathSegment({
      grid,
      path,
      dollyWorldPos: p,
      lastAxis: lastAxisRef.current,
    });
    lastAxisRef.current = axis;

    const id = getActiveWorldCamIdV2({ grid, tile: liveTile, axis });
    const spec = camMap[id];
    if (!spec) return;

    cam.position.set(spec.position.x, spec.position.y, spec.position.z);
    cam.lookAt(spec.target.x, spec.target.y, spec.target.z);

    cam.fov = spec.fov ?? WORLD_FOV;
    cam.near = spec.near ?? WORLD_NEAR;
    cam.far = spec.far ?? WORLD_FAR;
    cam.updateProjectionMatrix();

    lastCamIdRef.current = id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, camMap]); // seed only (do not depend on path here)

  useFrame(() => {
    const p = dollyWorldPosRef.current;
    if (!p) return;

    const liveTile = worldPosToTile(grid, p);

    const axis = axisFromClosestPathSegment({
      grid,
      path,
      dollyWorldPos: p,
      lastAxis: lastAxisRef.current,
    });
    lastAxisRef.current = axis;

    const id = getActiveWorldCamIdV2({ grid, tile: liveTile, axis });
    if (!id || lastCamIdRef.current === id) return;

    const spec = camMap[id];
    if (!spec) return;

    // SNAP: static cam pose + static target (no dolly tracking)
    cam.position.set(spec.position.x, spec.position.y, spec.position.z);
    cam.lookAt(spec.target.x, spec.target.y, spec.target.z);

    cam.fov = spec.fov ?? WORLD_FOV;
    cam.near = spec.near ?? WORLD_NEAR;
    cam.far = spec.far ?? WORLD_FAR;
    cam.updateProjectionMatrix();

    lastCamIdRef.current = id;
  });

  return null;
}

export type WorldViewCanvasProps = {
  grid: GridConfig;
  towers: readonly Tile[];
  dollyTile: Tile;
  path: readonly Tile[];

  // hover parity with SimView
  hoveredTile: Tile | null;
  hoveredTowerTile: Tile | null;

  carrying: Tile | null;
  isMoving: boolean;
  queueLen: number;

  onTileHover: (tile: Tile | null) => void;
  onTileClick: (tile: Tile) => void;
  onTowerHover: (tile: Tile | null) => void;

  onArrive?: (tile: Tile) => void;
  hoverPath: readonly Tile[];

  onHoverIntent: (intent: HoverIntent) => void;

  activeView: "SIM" | "WORLD";
};

export default function WorldViewCanvas({
  grid,
  towers,
  dollyTile,
  path,
  hoveredTile,
  hoveredTowerTile,
  carrying,
  isMoving,
  queueLen,
  onTileHover,
  onTileClick,
  onTowerHover,
  onArrive,
  hoverPath,
  onHoverIntent,
  activeView,
}: WorldViewCanvasProps) {
  const isActive = activeView === "WORLD";
  const actionsDisabled = isMoving || queueLen > 0;
  const isCarrying = !!carrying;

  // Keep dolly's rendered world pos in a ref (glues carried tower + drives cam selection)
  const dollyWorldPosRef = useRef<Vec3>(tileToWorldCenter(dollyTile, grid));
  useEffect(() => {
    dollyWorldPosRef.current = tileToWorldCenter(dollyTile, grid);
  }, [dollyTile, grid]);

  const liftOffsetY = useMemo(() => grid.tileSize - 0.9, [grid.tileSize]);

  return (
    <div
      className={
        isActive
          ? "active-view-canvas-container"
          : "inactive-view-canvas-container"
      }
    >
      <Canvas
        camera={{
          // Seed only — controller snaps to the correct cam on first mount
          position: [0, 12, 6],
          fov: WORLD_FOV,
          near: WORLD_NEAR,
          far: WORLD_FAR,
        }}
      >
        {/* ✅ Snap-only static world cameras (segment-axis-aware selection) */}
        <WorldCamController
          grid={grid}
          path={path}
          dollyWorldPosRef={dollyWorldPosRef}
        />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 4, -5]} intensity={0.6} />
        <Environment preset="apartment" backgroundBlurriness={3} />

        <Floor grid={grid} />
        <PathLine grid={grid} path={hoverPath} yOffset={grid.tileSize * 0.26} />
        <GridOverlay grid={grid} />
        <AnimatedPathLine grid={grid} path={path} speed={2} />

        <TowerClones
          grid={grid}
          towers={towers}
          modelUrl="/assets/cloud-produce-tower-model.glb"
          yOffset={0}
          scale={0.75}
          onTowerHover={onTowerHover}
        />

        {carrying !== null && (
          <LiftedTower
            modelUrl="/assets/cloud-produce-tower-model.glb"
            dollyWorldPosRef={dollyWorldPosRef}
            liftOffsetY={liftOffsetY}
            scale={0.75}
            offsetX={-0.25}
            offsetZ={0.1}
          />
        )}

        {isActive && (
          <>
            <HoverHighlight grid={grid} tile={hoveredTile} />

            <TilePickerGrid
              grid={grid}
              onHover={onTileHover}
              onClick={onTileClick}
            />

            <HoverTileControls
              grid={grid}
              hoveredTile={hoveredTile}
              towerTiles={towers}
              isCarrying={isCarrying}
              disabled={actionsDisabled}
              onIntent={onHoverIntent}
            />

            <HoverTowerControls
              grid={grid}
              hoveredTowerTile={hoveredTowerTile}
              isCarrying={isCarrying}
              carryingTile={carrying}
              disabled={actionsDisabled}
              onIntent={onHoverIntent}
            />
          </>
        )}

        <Dolly
          grid={grid}
          tile={dollyTile}
          path={path}
          speed={2}
          onArrive={onArrive}
          isCarrying={carrying !== null}
          carryingHeightScaleY={3}
          onPosition={(pos) => {
            dollyWorldPosRef.current = pos;
          }}
        />
      </Canvas>
    </div>
  );
}
