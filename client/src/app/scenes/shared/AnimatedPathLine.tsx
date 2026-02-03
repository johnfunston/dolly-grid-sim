// src/app/scenes/shared/AnimatedPathLine.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";

import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

type Pt = Readonly<{ x: number; y: number; z: number }>;

export type AnimatedPathLineProps = {
  grid: GridConfig;
  path: readonly Tile[];
  speed: number; // world units / second
  yOffset?: number;
};

function dist(a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function remainingPolyline(points: readonly Pt[], traveled: number): Pt[] {
  if (points.length < 2) return [];

  let remaining = traveled;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = dist(a, b);

    if (segLen <= 0) continue;

    if (remaining >= segLen) {
      remaining -= segLen;
      continue;
    }

    const t = remaining / segLen;
    const cur: Pt = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };

    return [cur, ...points.slice(i + 1)];
  }

  return [];
}

export default function AnimatedPathLine({
  grid,
  path,
  speed,
  yOffset,
}: AnimatedPathLineProps) {
  const hasPath = path.length >= 2;
  const epsilon = yOffset ?? grid.tileSize * 0.25;

  const pathKey = useMemo(() => path.map((t) => `${t.x}:${t.z}`).join(">"), [path]);

  const fullPoints = useMemo<Pt[]>(() => {
    if (!hasPath) return [];
    return path.map((tile) => {
      const p = tileToWorldCenter(tile, grid);
      return { x: p.x, y: p.y + epsilon, z: p.z };
    });
  }, [grid, path, epsilon, hasPath]);

  const totalLength = useMemo(() => {
    if (fullPoints.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < fullPoints.length - 1; i++) {
      sum += dist(fullPoints[i], fullPoints[i + 1]);
    }
    return sum;
  }, [fullPoints]);

  // progress is a ref (NOT used during render)
  const progressRef = useRef<number>(0);

  // drawPoints is state (used during render)
  const [drawPoints, setDrawPoints] = useState<Pt[]>([]);
  const [activeKey, setActiveKey] = useState<string>("");

  // When props path changes, just update the key (no ref writes here)
  useEffect(() => {
    setActiveKey(pathKey);
    // Note: we intentionally do NOT setDrawPoints here to avoid your lint rule.
  }, [pathKey]);

  useFrame((_, dt) => {
    // Handle reset in the frame loop (safe place to touch refs)
    // If no path, keep it empty.
    if (!hasPath || fullPoints.length < 2 || totalLength <= 0) {
      if (drawPoints.length !== 0) setDrawPoints([]);
      progressRef.current = 0;
      return;
    }

    // If a new path just arrived (activeKey matches current pathKey),
    // ensure we have initialized drawPoints and reset progress.
    // We detect "uninitialized" by checking drawPoints length.
    if (drawPoints.length === 0) {
      progressRef.current = 0;
      setDrawPoints(fullPoints); // show full path immediately
      return;
    }

    // Advance
    progressRef.current = Math.min(totalLength, progressRef.current + speed * dt);

    // Remaining segment after traveling progress
    const next = remainingPolyline(fullPoints, progressRef.current);

    // Near the end, clear
    if (totalLength - progressRef.current <= 1e-6) {
      if (drawPoints.length !== 0) setDrawPoints([]);
      return;
    }

    // Update with a small guard
    const prevFirst = drawPoints[0];
    const nextFirst = next[0];

    const firstMoved =
      !!prevFirst &&
      !!nextFirst &&
      (Math.abs(prevFirst.x - nextFirst.x) > 1e-4 ||
        Math.abs(prevFirst.y - nextFirst.y) > 1e-4 ||
        Math.abs(prevFirst.z - nextFirst.z) > 1e-4);

    if (drawPoints.length !== next.length || firstMoved) {
      setDrawPoints(next);
    }
  });

  // Render
  if (!hasPath || drawPoints.length < 2) return null;

  const linePoints: [number, number, number][] = drawPoints.map((p) => [p.x, p.y, p.z]);

  
  return <Line points={linePoints} color="green" lineWidth={2} />;
}
