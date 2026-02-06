// src/app/scenes/cameraFixedCenter.ts
import type { GridConfig, Vec3 } from "../world/grid/gridTypes";

export type FixedCenterCameraSpec = Readonly<{
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
}>;

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Static birds-eye camera centered on the grid (world view placeholder).
 *
 * - Target: exact center of the grid footprint
 * - Position: directly above target (with optional Z nudge for depth cue)
 * - Height: computed so the whole grid fits comfortably in view
 */
export const getFixedCenterBirdsEyeSpec = (
  grid: GridConfig,
  opts?: Readonly<{
    fov?: number;
    comfort?: number;
    zNudgeFactor?: number; // fraction of grid depth to push camera in +Z for depth cue
    near?: number;
    farPad?: number; // multiplier on maxDim to extend far plane
  }>
): FixedCenterCameraSpec => {
  const { origin, cols, rows, tileSize } = grid;

  const width = cols * tileSize;
  const depth = rows * tileSize;

  // Target is center of the grid footprint on XZ plane
  const target: Vec3 = {
    x: origin.x + width / 2,
    y: origin.y,
    z: origin.z + depth / 2,
  };

  const fov = opts?.fov ?? 50;
  const comfort = opts?.comfort ?? 1.35;

  // Fit the larger dimension within the camera frustum
  const maxDim = Math.max(width, depth);
  const half = maxDim / 2;
  const distance = (half / Math.tan(degToRad(fov) / 2)) * comfort;

  // Optional small Z nudge to avoid a perfectly top-down "flat" look
  const zNudgeFactor = opts?.zNudgeFactor ?? 0.15;
  const zNudge = depth * zNudgeFactor;

  // Birds-eye: mostly height. Slight Z nudge for depth cue.
  const position: Vec3 = {
    x: target.x,
    y: (target.y + distance) / 2,
    z: target.z + zNudge,
  };

  const near = opts?.near ?? Math.max(0.1, distance / 100);
  const farPad = opts?.farPad ?? 10;
  const far = position.y + maxDim * farPad;

  return {
    position,
    target,
    fov,
    near,
    far,
  };
};
