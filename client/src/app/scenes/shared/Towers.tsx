// src/app/scenes/shared/Towers.tsx
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";
import type { Raycaster, Intersection, Object3D } from "three";

export type TowersProps = {
  grid: GridConfig;
  towers: readonly Tile[];
};

const NO_RAYCAST: Object3D["raycast"] = (
  _raycaster: Raycaster,
  _intersects: Intersection<Object3D>[]
) => {
  // intentionally empty: makes object non-intersectable
};

export default function Towers({ grid, towers }: TowersProps) {
  const height = grid.tileSize * 3.5;
  const half = height / 2;
  const size = grid.tileSize * 0.8;

  return (
    <group>
      {towers.map((tile) => {
        const center = tileToWorldCenter(tile, grid);

        return (
          <mesh
            key={`${tile.x}:${tile.z}`}
            position={[center.x, center.y + half, center.z]}
            raycast={NO_RAYCAST}
          >
            <boxGeometry args={[size, height, size]} />
            <meshStandardMaterial color="gray" />
          </mesh>
        );
      })}
    </group>
  );
}
