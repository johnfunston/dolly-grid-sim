// src/scenes/shared/TowerControls.tsx
//
// A tiny in-world "billboard" control that sits above a tile and can be clicked
// without the cursor needing to leave the tile area.
//
// Notes:
// - Keep it dumb: it only renders what App tells it to render.
// - Stop pointer propagation so clicks don't also trigger TilePickerGrid.
//
// Usage example (in SimViewCanvas):
// {towerControls?.visible && (
//   <TowerControls
//     grid={grid}
//     tile={towerControls.tile}
//     mode={towerControls.mode} // "LIFT" | "DROP" | "SWAP"
//     disabled={towerControls.disabled}
//     onPress={towerControls.onPress}
//   />
// )}

import { useMemo } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import { tileToWorldCenter } from "../world/grid/gridMath";
import { Html } from "@react-three/drei";

export type TowerControlMode = "LIFT" | "DROP" | "SWAP";

export type TowerControlsProps = {
  grid: GridConfig;
  tile: Tile;

  mode: TowerControlMode;
  disabled?: boolean;

  /**
   * Called when the button is pressed.
   * Keep this as a single callback; App decides what it means.
   */
  onPress: () => void;

  /**
   * Optional vertical offset above the tile.
   * Defaults to ~0.65 tiles above floor.
   */
  yOffset?: number;

  /**
   * Optional label override.
   */
  label?: string;
};

function defaultLabel(mode: TowerControlMode): string {
  switch (mode) {
    case "LIFT":
      return "Lift";
    case "DROP":
      return "Drop";
    case "SWAP":
      return "Swap";
    default:
      return "Action";
  }
}

export default function TowerControls({
  grid,
  tile,
  mode,
  disabled = false,
  onPress,
  yOffset,
  label,
}: TowerControlsProps) {
  const pos: Vec3 = useMemo(() => tileToWorldCenter(tile, grid), [tile, grid]);
  const y = pos.y + (yOffset ?? grid.tileSize * 0.65);
  const text = label ?? defaultLabel(mode);

  return (
    <group position={[pos.x, y, pos.z]}>
      {/* Html lets us render a real DOM button anchored in 3D space */}
      <Html
        center
        transform
        occlude={false}
        // Prevent this overlay from being "transparent" to pointer events behind it.
        // We'll also stop propagation on the button itself.
        style={{ pointerEvents: "auto" }}
      >
        <button
          type="button"
          disabled={disabled}
          onPointerDown={(e) => {
            // Critical: keep click from also selecting/hovering floor tiles underneath.
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onPress();
          }}
          style={{
            padding: "6px 10px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.25)",
            background: disabled ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.65)",
            color: "white",
            fontSize: "12px",
            cursor: disabled ? "not-allowed" : "pointer",
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </button>
      </Html>
    </group>
  );
}
