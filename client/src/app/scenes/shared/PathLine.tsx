import { Line } from "@react-three/drei";
import { AdditiveBlending } from "three";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type PathLineProps = {
  grid: GridConfig;
  path: readonly Tile[];
  yOffset?: number; // optional
};

export default function PathLine({ grid, path, yOffset }: PathLineProps) {
  if (path.length < 2) return null;

  const epsilon = yOffset ?? 0.05;

  const points: [number, number, number][] = path.map((tile) => {
    const p = tileToWorldCenter(tile, grid);
    return [p.x, p.y + epsilon, p.z];
  });

  const glowColor = "#870fcc";

  return (
    <group>
      {/* Outer glow */}
      <Line
        points={points}
        color={glowColor}
        lineWidth={7}
        transparent
        opacity={0.14}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
      {/* Inner core */}
      <Line
        points={points}
        color={glowColor}
        lineWidth={3}
        transparent
        opacity={0.55}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </group>
  );
}
