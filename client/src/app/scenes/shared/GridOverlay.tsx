import { Line } from "@react-three/drei";
import type { GridConfig } from "../../world/grid/gridTypes";

export type GridOverlayProps = {
  grid: GridConfig;
};

export default function GridOverlay({ grid}: GridOverlayProps) {
  const { cols, rows, tileSize, origin } = grid;

  const width = cols * tileSize;
  const depth = rows * tileSize;

  const y =  tileSize * .1; // tiny lift to avoid z-fighting

  const x0 = origin.x;
  const x1 = origin.x + width;
  const z0 = origin.z;
  const z1 = origin.z + depth;

  return (
    <group>
      {/* Row lines (run along X, step along Z) */}
      {Array.from({ length: rows + 1 }, (_, i) => {
        const z = z0 + i * tileSize;
        return (
          <Line
            key={`row-${i}`}
            points={[
              [x0, y, z],
              [x1, y, z],
            ]}
            color="rgb(67, 177, 185)"
            lineWidth={1}
          />
        );
      })}

      {/* Column lines (run along Z, step along X) */}
      {Array.from({ length: cols + 1 }, (_, i) => {
        const x = x0 + i * tileSize;
        return (
          <Line
            key={`col-${i}`}
            points={[
              [x, y, z0],
              [x, y, z1],
            ]}
            color="rgb(67, 177, 185)"
            lineWidth={1}
          />
        );
      })}
    </group>
  );
}
