// src/app/scenes/shared/PathLine.tsx
import { Line } from "@react-three/drei";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type PathLineProps = {
  grid: GridConfig;
  path: readonly Tile[];
  yOffset?: number; // optional
};

export default function PathLine({ grid, path, yOffset }: PathLineProps) {
  if (path.length < 2) return null;

  const epsilon = yOffset ?? grid.tileSize * .25;

  const points: [number, number, number][] = path.map((tile) => {
    const p = tileToWorldCenter(tile, grid);
    return [p.x, p.y + epsilon, p.z];
  });

  return <Line points={points} color="orange" lineWidth={2} />;
}
