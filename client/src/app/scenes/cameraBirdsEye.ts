import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import { tileToWorldCenter } from "../world/grid/gridMath";

export type BirdsEyeCameraSpec = Readonly<{
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
}>;

export const BIRDS_EYE_FOV = 100;
export const BIRDS_EYE_NEAR = 0.1;
export const BIRDS_EYE_FAR = 500;

export const BIRDS_EYE_HEIGHT_Y = 12;
export const BIRDS_EYE_TRAIL_DISTANCE = 50;

function normalize2(x: number, z: number): { x: number; z: number } {
  const len = Math.hypot(x, z);
  if (len <= 1e-6) return { x: 0, z: 1 };
  return { x: x / len, z: z / len };
}

/**
 * Compute a desired chase camera position that trails behind the dolly
 * based on travel direction.
 *
 * - Target always dolly center
 * - Height fixed (y = BIRDS_EYE_HEIGHT_Y)
 * - Camera sits behind direction at fixed radius (BIRDS_EYE_TRAIL_DISTANCE)
 * - If not moving, uses lastDir (provided) or default forward
 */
export const getBirdsEyeChaseSpec = (args: {
  grid: GridConfig;
  dollyTile: Tile;
  path: readonly Tile[];
  lastDir?: Readonly<{ x: number; z: number }>;
}): BirdsEyeCameraSpec & {
  dir: Readonly<{ x: number; z: number }>;
} => {
  const { grid, dollyTile, path, lastDir } = args;

  const target = tileToWorldCenter(dollyTile, grid);

  let dirX = lastDir?.x ?? 0;
  let dirZ = lastDir?.z ?? 1;

  // Direction from the first segment of the current path (axis-aligned in your grid)
  if (path.length >= 2) {
    const a = path[0];
    const b = path[1];
    const n = normalize2(b.x - a.x, b.z - a.z);
    dirX = n.x;
    dirZ = n.z;
  }

  const R = BIRDS_EYE_TRAIL_DISTANCE;

  const position: Vec3 = {
    x: target.x - dirX * R,
    y: BIRDS_EYE_HEIGHT_Y,
    z: target.z - dirZ * R,
  };

  return {
    position,
    target,
    fov: BIRDS_EYE_FOV,
    near: BIRDS_EYE_NEAR,
    far: BIRDS_EYE_FAR,
    dir: { x: dirX, z: dirZ },
  };
};
