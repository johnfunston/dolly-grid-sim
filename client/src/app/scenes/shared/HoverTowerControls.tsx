import { Billboard, Html } from "@react-three/drei";
import type { CSSProperties } from "react";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";
import type { HoverIntent } from "../../world/sim/commands";

export type HoverTowerControlsProps = {
  grid: GridConfig;
  hoveredTowerTile: Tile | null;

  // carrying state
  isCarrying: boolean;

  // ✅ NEW: carried tower’s origin tile (so we can block swap-with-self)
  carryingTile: Tile | null;

  disabled: boolean;
  onIntent: (intent: HoverIntent) => void;
};

function tileEquals(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.z === b.z;
}

export default function HoverTowerControls({
  grid,
  hoveredTowerTile,
  isCarrying,
  carryingTile,
  disabled,
  onIntent,
}: HoverTowerControlsProps) {
  if (!hoveredTowerTile) return null;

  const p = tileToWorldCenter(hoveredTowerTile, grid);

  // Put higher than the tile controls so it feels like "on the tower"
  const y = p.y + grid.tileSize * 2.5;

  const showLift = !isCarrying;

  // ✅ Only allow swap when carrying AND hovered tower is NOT the carried tower’s origin
  const isSelf =
    isCarrying && carryingTile !== null && tileEquals(hoveredTowerTile, carryingTile);
  const showSwap = isCarrying && !isSelf;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <group position={[p.x, y, p.z]}>
      <Billboard follow>
        <Html
          center
          transform={false}
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
            {showLift && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onIntent({ type: "LIFT_AT", tile: hoveredTowerTile })}
                style={actionBtnStyle(disabled)}
              >
                Lift
              </button>
            )}

            {showSwap && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onIntent({ type: "SWAP_WITH", tile: hoveredTowerTile })}
                style={actionBtnStyle(disabled)}
              >
                Swap
              </button>
            )}
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
  background: "rgba(15, 15, 18, 0.72)",
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
  background: disabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)",
  color: "rgba(255,255,255,0.95)",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.2,
  cursor: disabled ? "not-allowed" : "pointer",
  lineHeight: 1,
});
