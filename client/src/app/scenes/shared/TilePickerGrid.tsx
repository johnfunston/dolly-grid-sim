//TilePickerGrid.tsx

import { useMemo } from "react";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { allTiles, tileToWorldCenter } from "../../world/grid/gridMath";

export type TilePickerGridProps = {
  grid: GridConfig;
  onHover: (tile: Tile | null) => void;
  onClick: (tile: Tile) => void;
};

export default function TilePickerGrid({ grid, onHover, onClick }: TilePickerGridProps) {
  const tiles = useMemo(() => allTiles(grid), [grid]);
  const y = grid.origin.y + grid.tileSize * 0.01;

  return (
    <group>
      {tiles.map((tile) => {
        const p = tileToWorldCenter(tile, grid);

        return (
          <mesh
            key={`${tile.x}:${tile.z}`}
            position={[p.x, y, p.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            onPointerEnter={(e) => {
              e.stopPropagation();
              onHover(tile);
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              onHover(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick(tile);
            }}
          >
            <planeGeometry args={[grid.tileSize, grid.tileSize]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        );
      })}
    </group>
  );
}
