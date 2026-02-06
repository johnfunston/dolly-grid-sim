import { Billboard, Html } from "@react-three/drei";
import type { CSSProperties } from "react";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";
import type { HoverIntent } from "../../world/sim/commands";

export type HoverTileControlsProps = {
  grid: GridConfig;
  hoveredTile: Tile | null;

  // ✅ NEW
  towerTiles: readonly Tile[];

  isCarrying: boolean;
  disabled: boolean;
  onIntent: (intent: HoverIntent) => void;
};

function tileEquals(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.z === b.z;
}

export default function HoverTileControls({
  grid,
  hoveredTile,
  towerTiles,
  isCarrying,
  disabled,
  onIntent,
}: HoverTileControlsProps) {
  // Only show tile controls when carrying (MOVE/DROP targets are tiles)
  if (!hoveredTile) return null;
  if (!isCarrying) return null;

  // ✅ NEW: if this tile has a tower, do not show buttons
  const isTowerTile = towerTiles.some((t) => tileEquals(t, hoveredTile));
  if (isTowerTile) return null;

  const p = tileToWorldCenter(hoveredTile, grid);

  const y = p.y + grid.tileSize * 0.25;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <group position={[p.x, y, p.z]}>
      <Billboard follow>
        <Html
          center
          transform={false} // constant screen size
          sprite
          occlude={false}
          style={{ pointerEvents: "auto", userSelect: "none" }}
        >
          <div
            onPointerDown={stop}
            onPointerUp={stop}
            onPointerMove={stop}
            onClick={stop}
            style={panelStyle}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => onIntent({ type: "MOVE_TO", tile: hoveredTile })}
              style={actionBtnStyle(disabled)}
            >
              Move
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => onIntent({ type: "DROP_AT", tile: hoveredTile })}
              style={actionBtnStyle(disabled)}
            >
              Drop
            </button>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

const panelStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "6px",
  borderRadius: 999,
  background: "rgba(157, 220, 57, 0.5)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  alignItems: "center",
  whiteSpace: "nowrap",
};

const actionBtnStyle = (disabled: boolean): CSSProperties => ({
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.12)",
  background: disabled ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.5)",
  color: "rgba(255,255,255,0.95)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.2,
  cursor: disabled ? "not-allowed" : "pointer",
  lineHeight: 1,
});
