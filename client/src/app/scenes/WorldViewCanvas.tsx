// src/app/scenes/WorldViewCanvas.tsx
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";

import Floor from "./shared/Floor";
import GridOverlay from "./shared/GridOverlay";
import Dolly from "./shared/Dolly";
import TowerClones from "./shared/TowerClones";
import AnimatedPathLine from "./shared/AnimatedPathLine";
import PathLine from "./shared/PathLine";
import { Environment } from "@react-three/drei";
import "../styles/WorldViewCanvas.css";

import LiftedTower from "./shared/LiftedTower";
import { tileToWorldCenter } from "../world/grid/gridMath";

// ✅ NEW: fixed center birds-eye camera
import { getFixedCenterBirdsEyeSpec } from "./cameraFixedCenter";

type WorldViewCanvasProps = {
  grid: GridConfig;
  towers: readonly Tile[];
  dollyTile: Tile;
  path: readonly Tile[];
  hoverPath: readonly Tile[];
  carrying: Tile | null;

  onArrive?: (tile: Tile) => void;

  // Optional: if you still want to show hover highlight / debug overlays later
  hoveredTile?: Tile | null;
};

function CameraLookAt({ target }: { target: Vec3 }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(target.x, target.y, target.z);
    camera.updateProjectionMatrix();
  }, [camera, target.x, target.y, target.z]);

  return null;
}

export default function WorldViewCanvas({
  grid,
  towers,
  dollyTile,
  path,
  hoverPath,
  carrying,
  onArrive,
}: WorldViewCanvasProps) {
  // ✅ Fixed, centered birds-eye spec (placeholder)
  const cam = useMemo(() => getFixedCenterBirdsEyeSpec(grid), [grid]);

  // Keep the dolly's *actual* rendered world position in a ref (no rerenders).
  const dollyWorldPosRef = useRef<Vec3>(tileToWorldCenter(dollyTile, grid));

  useEffect(() => {
    dollyWorldPosRef.current = tileToWorldCenter(dollyTile, grid);
  }, [dollyTile, grid]);

  // Lift tuning: easy constants, world units.
  const liftOffsetY = useMemo(() => grid.tileSize - 0.9, [grid.tileSize]);

  return (
    <div className="world-view-canvas-container">
      <Canvas
        camera={{
          position: [cam.position.x, cam.position.y, cam.position.z],
          fov: cam.fov,
          near: cam.near,
          far: cam.far,
        }}
      >
        <CameraLookAt target={cam.target} />

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
