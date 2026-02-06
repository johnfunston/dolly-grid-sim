import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { Group } from "three";

import type { Vec3 } from "../../world/grid/gridTypes";

export type LiftedTowerProps = {
  modelUrl: string;

  /**
   * Ref that always contains the dolly's *actual rendered world position*.
   * Updated by Dolly each frame via onPosition callback.
   */
  dollyWorldPosRef: React.MutableRefObject<Vec3>;

  /**
   * Vertical lift amount above the dolly's y (in world units).
   * This is the FINAL lift height when animation completes.
   */
  liftOffsetY: number;

  offsetX?: number;
  offsetZ?: number;

  scale?: number;
};

const LIFT_ANIM_SECONDS = 0.25;

export default function LiftedTower({
  modelUrl,
  dollyWorldPosRef,
  liftOffsetY,
  offsetX,
  offsetZ,
  scale,
}: LiftedTowerProps) {
  const gltf = useGLTF(modelUrl);

  const s = scale ?? 0.75;

  // One “base” source (shared geometry/material internally).
  const base = useMemo(() => gltf.scene, [gltf.scene]);

  // Clone ONCE for the carried tower (separate draw call from clones).
  const carried = useMemo(() => SkeletonUtils.clone(base) as Group, [base]);

  const groupRef = useRef<Group | null>(null);

  // Keep offsets explicit and easy to tune.
  const dx = offsetX ?? -0.25;
  const dz = offsetZ ?? 0.1;

  // Animate lift progress 0 -> 1 over 0.25s.
  const liftTRef = useRef(0);

  useFrame((_, dt) => {
    const g = groupRef.current;
    if (!g) return;

    // Progress animation
    liftTRef.current = Math.min(1, liftTRef.current + dt / LIFT_ANIM_SECONDS);

    const p = dollyWorldPosRef.current;
    const liftY = liftOffsetY * liftTRef.current;

    g.position.set(p.x + dx, p.y + liftY, p.z + dz);
  });

  return (
    <group ref={groupRef} scale={[s, s, s]}>
      <primitive object={carried} />
    </group>
  );
}

useGLTF.preload("/assets/cloud-produce-tower-model.glb");
