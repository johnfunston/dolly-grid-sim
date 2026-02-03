// src/app/scenes/shared/Floor.tsx
import type { GridConfig, Vec3 } from "../../world/grid/gridTypes";

type FloorProps = {
  grid: GridConfig;
};

export default function Floor({ grid }: FloorProps) {
  const { cols, rows, tileSize, origin } = grid;

  const width = cols * tileSize;
  const depth = rows * tileSize;
  const height = tileSize * 0.25;

  // Put the floor centered under the grid
  const center: Vec3 = {
    x: origin.x + width / 2,
    y: origin.y,
    z: origin.z + depth / 2,
  };

  return (
    <mesh position={[center.x, center.y - height / 2, center.z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color="#f6f6f6" />
    </mesh>
  );
}
