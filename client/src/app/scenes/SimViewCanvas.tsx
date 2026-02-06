// src/app/scenes/SimViewCanvas.tsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";

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
import "../styles/SimViewCanvas.css";

import LiftedTower from "./shared/LiftedTower";
import { tileToWorldCenter } from "../world/grid/gridMath";

// ------------------------------------
// Birds-eye chase camera (smooth orbit)
// ------------------------------------
const CAMERA_HEIGHT_Y = 12;
const CAMERA_TRAIL_DISTANCE = 6;

// higher = snappier, lower = floatier
const CAMERA_POS_DAMPING = 2;
const CAMERA_TARGET_DAMPING = 10;

function damp01(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

function normalize2(x: number, z: number): { x: number; z: number } {
  const len = Math.hypot(x, z);
  if (len <= 1e-6) return { x: 0, z: 1 };
  return { x: x / len, z: z / len };
}

function BirdsEyeChaseCamera({
  path,
  dollyWorldPosRef,
}: {
  path: readonly Tile[];
  dollyWorldPosRef: React.RefObject<Vec3>;
}) {
  const { camera } = useThree();

  // keep last direction so idle doesn't snap
  const lastDirRef = useRef<{ x: number; z: number }>({ x: 0, z: 1 });

  // slightly smoothed target for nicer lookAt
  const smoothTargetRef = useRef<Vec3 | null>(null);

  useFrame((_, dt) => {
    const dollyPos = dollyWorldPosRef.current;

    // Determine travel direction (axis-aligned path segments)
    if (path.length >= 2) {
      const a = path[0];
      const b = path[1];
      const n = normalize2(b.x - a.x, b.z - a.z);
      lastDirRef.current = { x: n.x, z: n.z };
    }

    const dir = lastDirRef.current;

    // Desired trailing position: orbit ring behind direction
    const desiredPos: Vec3 = {
      x: dollyPos.x - dir.x * CAMERA_TRAIL_DISTANCE,
      y: CAMERA_HEIGHT_Y,
      z: dollyPos.z - dir.z * CAMERA_TRAIL_DISTANCE,
    };

    // Smooth camera position (orbit transition)
    const aPos = damp01(CAMERA_POS_DAMPING, dt);
    camera.position.set(
      camera.position.x + (desiredPos.x - camera.position.x) * aPos,
      camera.position.y + (desiredPos.y - camera.position.y) * aPos,
      camera.position.z + (desiredPos.z - camera.position.z) * aPos
    );

    // Smooth target so lookAt doesn't feel jittery
    const desiredTarget: Vec3 = { x: dollyPos.x, y: dollyPos.y, z: dollyPos.z };
    if (!smoothTargetRef.current) smoothTargetRef.current = desiredTarget;

    const t = smoothTargetRef.current;
    const aT = damp01(CAMERA_TARGET_DAMPING, dt);

    const smoothTarget: Vec3 = {
      x: t.x + (desiredTarget.x - t.x) * aT,
      y: t.y + (desiredTarget.y - t.y) * aT,
      z: t.z + (desiredTarget.z - t.z) * aT,
    };

    smoothTargetRef.current = smoothTarget;

    camera.lookAt(smoothTarget.x, smoothTarget.y, smoothTarget.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

type SimViewCanvasProps = {
  grid: GridConfig;
  towers: readonly Tile[];
  dollyTile: Tile;
  path: readonly Tile[];
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
};

export default function SimViewCanvas({
  grid,
  towers,
  dollyTile,
  path,
  carrying,
  onTileHover,
  onTileClick,
  hoveredTile,
  hoveredTowerTile,
  onTowerHover,
  onArrive,
  hoverPath,
  isMoving,
  queueLen,
  onHoverIntent,
}: SimViewCanvasProps) {
  const actionsDisabled = isMoving || queueLen > 0;
  const isCarrying = !!carrying;

  // Keep the dolly's *actual* rendered world position in a ref (no rerenders).
  const dollyWorldPosRef = useRef<Vec3>(tileToWorldCenter(dollyTile, grid));

  // Keep a reasonable initial value when dollyTile changes and dolly isn't moving yet.
  // (Once the Dolly renders, it will overwrite via onPosition.)
  useEffect(() => {
    dollyWorldPosRef.current = tileToWorldCenter(dollyTile, grid);
  }, [dollyTile, grid]);

  // Lift tuning: easy constants, world units.
  const liftOffsetY = useMemo(() => grid.tileSize - 0.9, [grid.tileSize]);

  return (
    <div className="sim-view-canvas-container">
      <Canvas
        camera={{
          // initial seed only (BirdsEyeChaseCamera drives it each frame)
          position: [0, CAMERA_HEIGHT_Y, CAMERA_TRAIL_DISTANCE],
          fov: 50,
          near: 0.1,
          far: 500,
        }}
      >
        {/* Smooth orbiting chase camera */}
        <BirdsEyeChaseCamera path={path} dollyWorldPosRef={dollyWorldPosRef} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 4, -5]} intensity={0.6} />
        <Environment preset="warehouse" backgroundBlurriness={3} />

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

        {/* Carried tower: separate draw call, glued to dolly by shared position ref */}
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

        <HoverHighlight grid={grid} tile={hoveredTile} />

        {/* Tile hover + click picking (MOVE/DROP targets) */}
        <TilePickerGrid grid={grid} onHover={onTileHover} onClick={onTileClick} />

        {/* Tile overlay controls (MOVE/DROP only) */}
        <HoverTileControls
          grid={grid}
          hoveredTile={hoveredTile}
          towerTiles={towers}
          isCarrying={isCarrying}
          disabled={actionsDisabled}
          onIntent={onHoverIntent}
        />

        {/* Tower overlay controls (LIFT/SWAP only) */}
        <HoverTowerControls
          grid={grid}
          hoveredTowerTile={hoveredTowerTile}
          isCarrying={isCarrying}
          carryingTile={carrying}
          disabled={actionsDisabled}
          onIntent={onHoverIntent}
        />

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
