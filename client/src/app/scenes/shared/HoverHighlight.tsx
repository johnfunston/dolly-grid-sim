import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type HoverHighlightProps = {
  grid: GridConfig;
  tile: Tile | null;
};

export default function HoverHighlight({ grid, tile }: HoverHighlightProps) {
  if (!tile) return null;

  const p = tileToWorldCenter(tile, grid);
  const y = p.y + grid.tileSize * 0.02;

  return (
    <mesh position={[p.x, y, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[grid.tileSize, grid.tileSize]} />
      <meshBasicMaterial transparent color={"aliceblue"} opacity={0.25} />
    </mesh>
  );
}
