// src/app/scenes/shared/Dolly.tsx
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type DollyProps = {
  grid: GridConfig;
  tile: Tile;
  path: readonly Tile[];
  speed: number; // world units / second
  onArrive?: (tile: Tile) => void;
};

type Pt = Readonly<{ x: number; y: number; z: number }>;

export default function Dolly({ grid, tile, path, speed, onArrive }: DollyProps) {
  const meshRef = useRef<Mesh | null>(null);
  const arrivedRef = useRef(false);

  // Build world-space points for the path (lifted to sit on floor)
  const points = useMemo<Pt[]>(() => {
    if (path.length < 1) return [];
    const size = 0.7;
    const lift = size / 2;

    return path.map((t) => {
      const p = tileToWorldCenter(t, grid);
      return { x: p.x, y: p.y + lift, z: p.z };
    });
  }, [grid, path]);

  // Segment lengths + total length
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

  const totalLength = useMemo<number>(() => {
    return segLengths.reduce((acc, n) => acc + n, 0);
  }, [segLengths]);

  // Distance traveled along the polyline (in world units)
  const progress = useRef(0);


  // Reset progress whenever path changes
  useEffect(() => {
    arrivedRef.current = false;
    progress.current = 0;
    progress.current = 0;
  }, [path]);

  // Fallback static position when not moving
  const fallbackPos = useMemo<[number, number, number]>(() => {
    const p = tileToWorldCenter(tile, grid);
    const size = 0.7;
    return [p.x, p.y + size / 2, p.z];
  }, [grid, tile]);

  useFrame((_, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // No path (or trivial) => just sit at current tile
    if (points.length < 2 || segLengths.length < 1 || totalLength <= 0) {
      mesh.position.set(fallbackPos[0], fallbackPos[1], fallbackPos[2]);
      return;
    }

    // Advance by fixed speed
    progress.current = Math.min(totalLength, progress.current + speed * dt);

    // Find segment for current progress
    let d = progress.current;
    let segIndex = 0;

    while (segIndex < segLengths.length && d >= segLengths[segIndex]) {
      d -= segLengths[segIndex];
      segIndex++;
    }

    // If finished, snap to end and notify once
    if (segIndex >= segLengths.length) {
      const end = points[points.length - 1];
      mesh.position.set(end.x, end.y, end.z);

      // optional: fire arrival once and stop further movement
      if (onArrive && !arrivedRef.current) {
  console.log("[DOLLY] calling onArrive", path[path.length - 1]);
  arrivedRef.current = true;
  onArrive(path[path.length - 1]);
}

      return;
    }

    const a = points[segIndex];
    const b = points[segIndex + 1];
    const segLen = segLengths[segIndex];
    const t = segLen > 0 ? d / segLen : 0;

    // Lerp between a and b
    mesh.position.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.7, 0.25, 0.7]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
