// src/app/scenes/cameraBirdsEye.ts
import type { GridConfig, Vec3 } from "../world/grid/gridTypes";

export type BirdsEyeCameraSpec = Readonly<{
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
}>;

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Temporary birds-eye camera for Phase 1 visualization.
 * Deterministic: derived only from grid dimensions.
 *
 * Notes:
 * - Positioned above grid center.
 * - Slight Z offset gives depth cue while remaining "birds-eye".
 * - Comfort factor ensures the grid fits with margin.
 */
export const getBirdsEyeCameraSpec = (grid: GridConfig): BirdsEyeCameraSpec => {
  const { origin, cols, rows, tileSize } = grid;

  const width = cols * tileSize;
  const depth = rows * tileSize;

  const center: Vec3 = {
    x: origin.x + width / 2,
    y: origin.y,
    z: origin.z + depth / 2,
  };

  // Temporary defaults (easy to change/remove later)
  const fov = 50; // degrees; moderate perspective without distortion
  const comfort = 1.35; // extra margin so grid fits comfortably

  // We want to fit the larger of width/depth in view.
  // Distance from target for a perspective camera:
  //   halfSize / tan(fov/2)
  const maxDim = Math.max(width, depth);
  const half = maxDim / 2;

  const distance = (half / Math.tan(degToRad(fov) / 2)) * comfort;

  // Birds-eye: mostly height. Add a small Z offset so depth direction is visible.
  const zNudge = depth * 0.15;

  const position: Vec3 = {
    x: -5, //center.x
    y: 15, //center.y + distance
    z: -5, //center.z + zNudge
  };

  // near/far derived from distance and grid size (safe, not tight)
  const near = Math.max(0.1, distance / 100);
  const far = distance + maxDim * 10;

  return {
    position,
    target: center,
    fov,
    near,
    far,
  };
};
