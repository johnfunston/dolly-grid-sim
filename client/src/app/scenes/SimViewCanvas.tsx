// src/app/scenes/SimViewCanvas.tsx
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import type { SimCamMode } from "../ui/ControlPanel"

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

// ------------------------------------
// Birds-eye chase camera (smooth orbit)
// ------------------------------------
const CAMERA_HEIGHT_Y = 12;
const CAMERA_TRAIL_DISTANCE = 6;

// higher = snappier, lower = floatier
const CAMERA_TARGET_DAMPING = 10;

function damp01(lambda: number, dt: number): number {
  return 1 - Math.exp(-lambda * dt);
}

function normalize2(x: number, z: number): { x: number; z: number } {
  const len = Math.hypot(x, z);
  if (len <= 1e-6) return { x: 0, z: 1 };
  return { x: x / len, z: z / len };
}

function wrapAnglePi(a: number): number {
  const twoPi = Math.PI * 2;
  let x = (a + Math.PI) % twoPi;
  if (x < 0) x += twoPi;
  return x - Math.PI;
}

function shortestAngleDelta(from: number, to: number): number {
  return wrapAnglePi(to - from);
}

function RingFollowCamera({
  dollyWorldPosRef,
  angleOffsetRad, // 0 = ahead, PI = behind
}: {
  dollyWorldPosRef: React.RefObject<Vec3>;
  angleOffsetRad: number;
}) {
  const { camera } = useThree();

  const lastDirRef = useRef<{ x: number; z: number }>({ x: 0, z: 1 });
  const prevPosRef = useRef<Vec3 | null>(null);
  const ringAngleRef = useRef<number>(0);
  const smoothTargetRef = useRef<Vec3 | null>(null);

  // Tuning
  const HEIGHT = CAMERA_HEIGHT_Y;
  const RADIUS = CAMERA_TRAIL_DISTANCE;

  // how fast we swing around the ring to the new side (shortest arc)
  const ANGLE_DAMPING = 3.5;

  // keep your existing target smoothing feel
  const TARGET_DAMPING = CAMERA_TARGET_DAMPING;

  useFrame((_, dt) => {
    const p = dollyWorldPosRef.current;
    if (!p) return;

    // live direction from movement
    const prev = prevPosRef.current;
    if (prev) {
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;

      if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
        const n = normalize2(dx, dz);
        lastDirRef.current = { x: n.x, z: n.z };
      }
    }
    prevPosRef.current = { ...p };

    const dir = lastDirRef.current;

    const forwardAngle = Math.atan2(dir.z, dir.x);
    const desiredAngle = wrapAnglePi(forwardAngle + angleOffsetRad);

    // shortest-arc smoothing around the ring
    const currAngle = ringAngleRef.current;
    const dAng = shortestAngleDelta(currAngle, desiredAngle);
    const aAng = 1 - Math.exp(-ANGLE_DAMPING * dt);
    const nextAngle = wrapAnglePi(currAngle + dAng * aAng);
    ringAngleRef.current = nextAngle;

    // place camera on ring around the dolly
    const desiredPos: Vec3 = {
      x: p.x + Math.cos(nextAngle) * RADIUS,
      y: HEIGHT,
      z: p.z + Math.sin(nextAngle) * RADIUS,
    };

    camera.position.set(desiredPos.x, desiredPos.y, desiredPos.z);

    // smooth target (look at the dolly)
    const desiredTarget: Vec3 = { x: p.x, y: p.y, z: p.z };
    if (!smoothTargetRef.current) smoothTargetRef.current = desiredTarget;

    const t = smoothTargetRef.current;
    const aT = damp01(TARGET_DAMPING, dt);

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

function DollyPOVCamera({
  dollyWorldPosRef,
  enabled,
  allowOrbit,
}: {
  dollyWorldPosRef: React.RefObject<Vec3>;
  enabled: boolean;
  allowOrbit: boolean; // only when not moving
}) {
  const { camera, gl } = useThree();

  const prevPosRef = useRef<Vec3 | null>(null);
  const lastDirRef = useRef<{ x: number; z: number }>({ x: 1, z: 0 });

  // user yaw offset (drag when idle)
  const userYawRef = useRef<number>(0);

  // drag state
  const dragRef = useRef<{
    isDown: boolean;
    startX: number;
    startYaw: number;
  }>({ isDown: false, startX: 0, startYaw: 0 });

  // smoothed target
  const smoothTargetRef = useRef<Vec3 | null>(null);

  // tuning
  const CAM_HEIGHT = 0.25; // half a world unit off ground (on top of dolly)
  const LOOK_AHEAD = 12; // how far ahead we aim
  const POS_DAMPING = 18; // camera position smoothing (higher = tighter)
  const TARGET_DAMPING = 14; // look target smoothing
  const DRAG_SENSITIVITY = 0.006; // radians per pixel

  // Pointer drag for orbit yaw when idle
  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (!enabled) return;
      if (!allowOrbit) return;

      // Use left click drag.
      // If this conflicts with tile clicking in Dolly view, switch to right-click by checking e.button === 2.
      if (e.button !== 0) return;

      dragRef.current = {
        isDown: true,
        startX: e.clientX,
        startYaw: userYawRef.current,
      };

      // keep receiving move events even if pointer leaves canvas
      el.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!enabled) return;
      if (!allowOrbit) return;
      if (!dragRef.current.isDown) return;

      const dx = e.clientX - dragRef.current.startX;
      const next = dragRef.current.startYaw + dx * DRAG_SENSITIVITY;
      userYawRef.current = wrapAnglePi(next);
    };

    const onUp = (e: PointerEvent) => {
      if (!enabled) return;
      if (!dragRef.current.isDown) return;
      dragRef.current.isDown = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled, allowOrbit, gl]);

  useFrame((_, dt) => {
    if (!enabled) return;

    const p = dollyWorldPosRef.current;
    if (!p) return;

    // live direction from dolly movement
    const prev = prevPosRef.current;
    if (prev) {
      const dx = p.x - prev.x;
      const dz = p.z - prev.z;

      if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
        const n = normalize2(dx, dz);
        lastDirRef.current = { x: n.x, z: n.z };
      }
    }
    prevPosRef.current = { ...p };

    // camera position: directly on dolly, slightly above
    const desiredPos: Vec3 = { x: p.x, y: p.y + CAM_HEIGHT, z: p.z };

    const aPos = 1 - Math.exp(-POS_DAMPING * dt);
    camera.position.set(
      camera.position.x + (desiredPos.x - camera.position.x) * aPos,
      camera.position.y + (desiredPos.y - camera.position.y) * aPos,
      camera.position.z + (desiredPos.z - camera.position.z) * aPos
    );

    // forward direction (with optional user yaw offset when idle)
    const base = lastDirRef.current;
    const baseYaw = Math.atan2(base.z, base.x);
    const yaw = allowOrbit ? wrapAnglePi(baseYaw + userYawRef.current) : baseYaw;

    const fwdX = Math.cos(yaw);
    const fwdZ = Math.sin(yaw);

    const desiredTarget: Vec3 = {
      x: desiredPos.x + fwdX * LOOK_AHEAD,
      y: desiredPos.y, // keep level
      z: desiredPos.z + fwdZ * LOOK_AHEAD,
    };

    if (!smoothTargetRef.current) smoothTargetRef.current = desiredTarget;

    const t = smoothTargetRef.current;
    const aT = 1 - Math.exp(-TARGET_DAMPING * dt);

    const smoothTarget: Vec3 = {
      x: t.x + (desiredTarget.x - t.x) * aT,
      y: t.y + (desiredTarget.y - t.y) * aT,
      z: t.z + (desiredTarget.z - t.z) * aT,
    };

    smoothTargetRef.current = smoothTarget;

    camera.up.set(0, 1, 0);
    camera.lookAt(smoothTarget.x, smoothTarget.y, smoothTarget.z);
    camera.updateProjectionMatrix();
  });

  return null;
}

function PathAnchorCamera({
  grid,
  mode, // "START" or "DEST"
  path,
  isMoving,
  dollyWorldPosRef,
  reseedKey,
}: {
  grid: GridConfig;
  mode: "START" | "DEST";
  path: readonly Tile[];
  isMoving: boolean;
  dollyWorldPosRef: React.RefObject<Vec3>;
  reseedKey: number; // bumps when user clicks START/DEST again
}) {
  const { camera, gl } = useThree();

  // Where the camera is “parked” (fixed)
  const anchorRef = useRef<Vec3 | null>(null);

  // Stored anchors for the current move
  const startRef = useRef<Vec3 | null>(null);
  const destRef = useRef<Vec3 | null>(null);

  // Detect “path begins”
  const wasMovingRef = useRef(false);

  // Drag-pan (yaw offset)
  const userYawRef = useRef(0);
  const dragRef = useRef({ isDown: false, startX: 0, startYaw: 0 });

  // Dolly direction (for idle "look outward" in START mode)
  const prevDollyPosRef = useRef<Vec3 | null>(null);
  const lastDirRef = useRef<{ x: number; z: number }>({ x: 1, z: 0 });

  // Smoothed look target
  const smoothTargetRef = useRef<Vec3 | null>(null);

  // tuning
  const HEIGHT = 6;
  const POS_DAMPING = 20;
  const TARGET_DAMPING = 12;
  const PAN_SENSITIVITY = 0.006;
  const LOOK_AHEAD = 6;
  const IDLE_TARGET_Y = 0;

  // Capture anchors when a new path begins (rising edge: not moving -> moving)
  useFrame(() => {
    const moving = path.length >= 2;
    const wasMoving = wasMovingRef.current;

    if (!wasMoving && moving) {
      const dollyNow = dollyWorldPosRef.current;

      // Start = dolly world pos when path begins
      const start = { x: dollyNow.x, y: dollyNow.y, z: dollyNow.z };
      startRef.current = start;

      // Dest = last path tile center
      const lastTile = path[path.length - 1];
      const dest = tileToWorldCenter(lastTile, grid);
      destRef.current = dest;

      // Park camera based on mode at the moment path begins
      anchorRef.current = mode === "DEST" ? dest : start;

      // Reset pan each new path
      userYawRef.current = 0;
      smoothTargetRef.current = null;
    }

    wasMovingRef.current = moving;
  });

  // If user selects START/DEST (or re-clicks the same button), reseed anchor.
  useEffect(() => {
    const dollyNow = dollyWorldPosRef.current;

    if (mode === "START") {
      const start = { x: dollyNow.x, y: dollyNow.y, z: dollyNow.z };
      startRef.current = start;
      anchorRef.current = start;
    } else {
      const dest = destRef.current;
      // If we don't yet have a destination (no current path), fall back to dolly tile (per your spec)
      anchorRef.current =
        dest ?? { x: dollyNow.x, y: dollyNow.y, z: dollyNow.z };
    }

    userYawRef.current = 0;
    smoothTargetRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, reseedKey]);

  // When movement flips, reset smoothing so we don't blend target modes weirdly
  useEffect(() => {
    smoothTargetRef.current = null;
  }, [isMoving, mode]);

  // Drag-pan only while NOT moving (like DOLLY view)
  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (isMoving) return;
      if (e.button !== 0) return;

      dragRef.current = {
        isDown: true,
        startX: e.clientX,
        startYaw: userYawRef.current,
      };
      el.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (isMoving) return;
      if (!dragRef.current.isDown) return;

      const dx = e.clientX - dragRef.current.startX;
      userYawRef.current = wrapAnglePi(
        dragRef.current.startYaw + dx * PAN_SENSITIVITY
      );
    };

    const onUp = (e: PointerEvent) => {
      if (!dragRef.current.isDown) return;
      dragRef.current.isDown = false;
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, isMoving]);

  useFrame((_, dt) => {
    const dolly = dollyWorldPosRef.current;
    const anchor = anchorRef.current;
    if (!anchor) return;

    // Update last travel direction from live dolly movement (for START idle outward)
    {
      const prev = prevDollyPosRef.current;
      if (prev) {
        const dx = dolly.x - prev.x;
        const dz = dolly.z - prev.z;

        if (Math.abs(dx) + Math.abs(dz) > 1e-5) {
          const n = normalize2(dx, dz);
          lastDirRef.current = { x: n.x, z: n.z };
        }
      }
      prevDollyPosRef.current = { ...dolly };
    }

    // Camera position is fixed at anchor tile center, just at a height
    const desiredPos = { x: anchor.x, y: HEIGHT, z: anchor.z };
    const aPos = 1 - Math.exp(-POS_DAMPING * dt);

    camera.position.set(
      camera.position.x + (desiredPos.x - camera.position.x) * aPos,
      camera.position.y + (desiredPos.y - camera.position.y) * aPos,
      camera.position.z + (desiredPos.z - camera.position.z) * aPos
    );

    // Target behavior:
    // - Moving: track dolly
    // - Idle:
    //   - START: look outward (like dolly view) + drag yaw
    //   - DEST: look back at START tile (with drag yaw around that baseline)
    let desiredTarget: Vec3;

    if (isMoving) {
      desiredTarget = { x: dolly.x, y: dolly.y, z: dolly.z };
    } else {
      if (mode === "DEST" && startRef.current) {
        // ✅ Idle DEST: aim back toward where we came from (start tile)
        const start = startRef.current;
        const vx = start.x - camera.position.x;
        const vz = start.z - camera.position.z;
        const baseYaw = Math.atan2(vz, vx);
        const yaw = wrapAnglePi(baseYaw + userYawRef.current);

        desiredTarget = {
          x: camera.position.x + Math.cos(yaw) * LOOK_AHEAD,
          y: IDLE_TARGET_Y,
          z: camera.position.z + Math.sin(yaw) * LOOK_AHEAD,
        };
      } else {
        // ✅ Idle START (or DEST with no start yet): outward based on last travel dir
        const base = lastDirRef.current;
        const baseYaw = Math.atan2(base.z, base.x);
        const yaw = wrapAnglePi(baseYaw + userYawRef.current);

        desiredTarget = {
          x: camera.position.x + Math.cos(yaw) * LOOK_AHEAD,
          y: IDLE_TARGET_Y,
          z: camera.position.z + Math.sin(yaw) * LOOK_AHEAD,
        };
      }
    }

    // Smooth target
    if (!smoothTargetRef.current) smoothTargetRef.current = desiredTarget;
    const t = smoothTargetRef.current;
    const aT = 1 - Math.exp(-TARGET_DAMPING * dt);

    const smooth: Vec3 = {
      x: t.x + (desiredTarget.x - t.x) * aT,
      y: t.y + (desiredTarget.y - t.y) * aT,
      z: t.z + (desiredTarget.z - t.z) * aT,
    };
    smoothTargetRef.current = smooth;

    camera.up.set(0, 1, 0);
    camera.lookAt(smooth.x, smooth.y, smooth.z);
    camera.updateProjectionMatrix();
  });

  return null;
}


function SimStaticCenterCamera({ grid }: { grid: GridConfig }) {
  const { camera } = useThree();

  useEffect(() => {
    // Center of grid in world space
    const cx = grid.origin.x + (grid.cols * grid.tileSize) / 2;
    const cz = grid.origin.z + (grid.rows * grid.tileSize) / 2;

    // “Good enough” demo constants. Adjust later if you want.
    const height = 18;
    const offset = 10;

    camera.position.set(cx + offset, height, cz + offset);
    camera.lookAt(cx, 0, cz);
    camera.updateProjectionMatrix();
  }, [camera, grid]);

  return null;
}

function SimTopDownCamera({
  dollyWorldPosRef,
}: {
  dollyWorldPosRef: React.RefObject<Vec3>;
}) {
  const { camera } = useThree();

  // tune these two for feel
  const HEIGHT = 16; // how high above dolly
  const POS_DAMPING = 10; // higher = snappier follow, lower = floatier

 useEffect(() => {
    const p = dollyWorldPosRef.current;
    if (!p) return;
    camera.position.set(p.x, HEIGHT, p.z);
    camera.lookAt(p.x, 0, p.z);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    const p = dollyWorldPosRef.current;
    if (!p) return;

    // desired is directly above dolly
    const desiredX = p.x;
    const desiredY = HEIGHT;
    const desiredZ = p.z;

    // exponential damping (same style as your chase cam)
    const a = 1 - Math.exp(-POS_DAMPING * dt);

    camera.position.set(
      camera.position.x + (desiredX - camera.position.x) * a,
      camera.position.y + (desiredY - camera.position.y) * a,
      camera.position.z + (desiredZ - camera.position.z) * a
    );

    // look straight down at dolly
    camera.up.set(0, 0, -1); // helps keep "north" stable in top-down
    camera.lookAt(p.x, 0, p.z);

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
  activeView: "SIM" | "WORLD";

  simCamMode: SimCamMode;
  simCamReseed: number;

  showGrid: boolean;
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
  activeView,
  simCamMode,
  simCamReseed,
  showGrid,
}: SimViewCanvasProps) {
const isActive = activeView === "SIM";
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
    <div className={activeView === "SIM" ? "active-view-canvas-container" : "inactive-view-canvas-container"}>
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
        {/* Camera controller (minimal switch) */}
        {simCamMode === "CHASE" && (
          <RingFollowCamera dollyWorldPosRef={dollyWorldPosRef} angleOffsetRad={Math.PI} />
        )}

        {simCamMode === "LEAD" && (
          <RingFollowCamera dollyWorldPosRef={dollyWorldPosRef} angleOffsetRad={0} />
        )}
        {simCamMode === "DOLLY" && (
          <DollyPOVCamera
            dollyWorldPosRef={dollyWorldPosRef}
            enabled
            allowOrbit={!isMoving} // idle orbit only
          />
        )}
        {simCamMode === "PATH_START" && (
        <PathAnchorCamera
          grid={grid}
          mode="START"
          path={path}
          isMoving={isMoving}
          dollyWorldPosRef={dollyWorldPosRef}
          reseedKey={simCamReseed}
        />
      )}

      {simCamMode === "DESTINATION_TILE" && (
        <PathAnchorCamera
          grid={grid}
          mode="DEST"
          path={path}
          isMoving={isMoving}
          dollyWorldPosRef={dollyWorldPosRef}
          reseedKey={simCamReseed}
        />
      )}
        {simCamMode === "STATIC_CENTER" && <SimStaticCenterCamera grid={grid} />}
        {simCamMode === "TOP_DOWN" && <SimTopDownCamera dollyWorldPosRef={dollyWorldPosRef} />}


        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 4, -5]} intensity={0.6} />
        <Environment preset="apartment" backgroundBlurriness={3} />

        <Floor grid={grid} />
        <PathLine grid={grid} path={hoverPath} yOffset={.05} />
        {showGrid && <GridOverlay grid={grid} />}
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
        {isActive && !isMoving && (
        <>
            <HoverHighlight grid={grid} tile={hoveredTile} />

            {/* Hover + click picking */}
            <TilePickerGrid
            grid={grid}
            onHover={onTileHover}
            onClick={onTileClick}
            />

            {/* MOVE/DROP */}
            <HoverTileControls
            grid={grid}
            hoveredTile={hoveredTile}
            towerTiles={towers}
            isCarrying={isCarrying}
            disabled={actionsDisabled}
            onIntent={onHoverIntent}
            />

            {/* LIFT/SWAP */}
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
