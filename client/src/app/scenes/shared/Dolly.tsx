import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import type { Group } from "three";
import { SkeletonUtils } from "three-stdlib";

import type { GridConfig, Tile, Vec3 } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type DollyProps = {
  grid: GridConfig;
  tile: Tile;
  path: readonly Tile[];
  speed: number; // world units / second
  onArrive?: (tile: Tile) => void;

  // expose actual rendered world position each frame (still used to glue carried tower)
  onPosition?: (pos: Vec3) => void;

  // carrying drives a HEIGHT increase (scaleY), not a y-offset lift
  isCarrying: boolean;

  /**
   * Final Y scale multiplier when carrying.
   * Example: 1.35 means 35% taller while carrying.
   */
  carryingHeightScaleY?: number;
};

type Pt = Readonly<{ x: number; y: number; z: number }>;

const DOLLY_URL = "/assets/dolly-model.glb";
const DOLLY_HOVER_Y = 0;

const HEIGHT_ANIM_SECONDS = 0.25;
const DEFAULT_CARRY_HEIGHT_SCALE_Y = 1.35;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function Dolly({
  grid,
  tile,
  path,
  speed,
  onArrive,
  onPosition,
  isCarrying,
  carryingHeightScaleY,
}: DollyProps) {
  // World transform (position) lives here
  const dollyRef = useRef<Group | null>(null);

  // Model scale group (footprint fit + height scaling) lives here
  const modelGroupRef = useRef<Group | null>(null);

  const arrivedRef = useRef(false);
  const traveledRef = useRef(0);

  const gltf = useGLTF(DOLLY_URL);
const model = useMemo(() => SkeletonUtils.clone(gltf.scene) as Group, [gltf.scene]);

const { modelScale, modelOffset } = useMemo(() => {
  const box = new Box3().setFromObject(model);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetFootprint = 0.62;
  const sx = size.x > 0 ? targetFootprint / size.x : 1;
  const sz = size.z > 0 ? targetFootprint / size.z : 1;
  const scale = Math.min(sx, sz);

  const offset: [number, number, number] = [-center.x, -box.min.y, -center.z];
  return { modelScale: scale, modelOffset: offset };
}, [model]);


  const points = useMemo<Pt[]>(() => {
    if (path.length < 1) return [];
    return path.map((t) => {
      const p = tileToWorldCenter(t, grid);
      return { x: p.x, y: p.y + DOLLY_HOVER_Y, z: p.z };
    });
  }, [grid, path]);

  const segLengths = useMemo<number[]>(() => {
    if (points.length < 2) return [];
    const out: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      out.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    return out;
  }, [points]);

  const totalLength = useMemo(() => segLengths.reduce((acc, n) => acc + n, 0), [segLengths]);

  const fallbackPos = useMemo<[number, number, number]>(() => {
    const p = tileToWorldCenter(tile, grid);
    return [p.x, p.y + DOLLY_HOVER_Y, p.z];
  }, [grid, tile]);

  useEffect(() => {
    arrivedRef.current = false;
    traveledRef.current = 0;
  }, [path]);

  // Height animation state (1 -> target) over 0.25s
  const heightAnimRef = useRef<{
    from: number;
    to: number;
    elapsed: number;
    value: number;
  }>({ from: 1, to: 1, elapsed: 0, value: 1 });

  useEffect(() => {
    const target = isCarrying
      ? (carryingHeightScaleY ?? DEFAULT_CARRY_HEIGHT_SCALE_Y)
      : 1;

    heightAnimRef.current = {
      from: heightAnimRef.current.value,
      to: target,
      elapsed: 0,
      value: heightAnimRef.current.value,
    };
  }, [isCarrying, carryingHeightScaleY]);

  useFrame((_, dt) => {
    const obj = dollyRef.current;
    if (!obj) return;

    // Update height tween
    {
      const a = heightAnimRef.current;
      a.elapsed = Math.min(HEIGHT_ANIM_SECONDS, a.elapsed + dt);
      const t = HEIGHT_ANIM_SECONDS > 0 ? a.elapsed / HEIGHT_ANIM_SECONDS : 1;
      a.value = lerp(a.from, a.to, t);
    }

    // Apply model scale (footprint + animated height) via ref (NOT in render)
    {
      const mg = modelGroupRef.current;
      if (mg) {
        const heightY = heightAnimRef.current.value;
        mg.scale.set(modelScale, modelScale * heightY, modelScale);
      }
    }

    // Movement (unchanged)
    if (points.length < 2 || segLengths.length < 1 || totalLength <= 0) {
      const x = fallbackPos[0];
      const y = fallbackPos[1];
      const z = fallbackPos[2];

      obj.position.set(x, y, z);
      onPosition?.({ x, y, z });
      return;
    }

    traveledRef.current = Math.min(totalLength, traveledRef.current + speed * dt);

    let d = traveledRef.current;
    let segIndex = 0;
    while (segIndex < segLengths.length && d >= segLengths[segIndex]) {
      d -= segLengths[segIndex];
      segIndex++;
    }

    if (segIndex >= segLengths.length) {
      const end = points[points.length - 1];
      obj.position.set(end.x, end.y, end.z);
      onPosition?.({ x: end.x, y: end.y, z: end.z });

      if (onArrive && !arrivedRef.current) {
        arrivedRef.current = true;
        onArrive(path[path.length - 1]);
      }
      return;
    }

    const a = points[segIndex];
    const b = points[segIndex + 1];
    const segLen = segLengths[segIndex];
    const t = segLen > 0 ? d / segLen : 0;

    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const z = a.z + (b.z - a.z) * t;

    obj.position.set(x, y, z);
    onPosition?.({ x, y, z });
  });

  return (
    <group ref={dollyRef}>
      {/* Scale is applied in useFrame to avoid reading refs in render */}
      <group ref={modelGroupRef}>
        <primitive object={model} position={modelOffset} dispose={null} />

      </group>
    </group>
  );
}

useGLTF.preload(DOLLY_URL);
