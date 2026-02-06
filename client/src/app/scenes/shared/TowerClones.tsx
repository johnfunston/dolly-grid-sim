// src/app/scenes/shared/TowerClones.tsx
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import type { Group } from "three";
import type { GridConfig, Tile } from "../../world/grid/gridTypes";
import { tileToWorldCenter } from "../../world/grid/gridMath";

export type TowerClonesProps = {
  grid: GridConfig;
  towers: readonly Tile[];
  modelUrl: string;
  yOffset?: number;
  scale?: number;

  // ✅ NEW: tower hover channel
  onTowerHover?: (tile: Tile | null) => void;
};

function keyOf(t: Tile): string {
  return `${t.x}:${t.z}`;
}

export default function TowerClones({
  grid,
  towers,
  modelUrl,
  yOffset,
  scale,
  onTowerHover,
}: TowerClonesProps) {
  const gltf = useGLTF(modelUrl);

  const epsilon = yOffset ?? 0;
  const s = scale ?? 0.9;

  // One “base” clone source (still reuses shared geometry/material internally)
  const base = useMemo(() => gltf.scene, [gltf.scene]);

  // Collider sizing in WORLD units (not model units).
  // Tune these if you want a tighter hover volume.
  const colliderSize = useMemo(() => {
    // footprint roughly within a tile
    const w = grid.tileSize * 0.8;
    const d = grid.tileSize * 0.8;
    // height should be tall enough to "beat" the tile plane raycast
    const h = grid.tileSize * 1.6;
    return { w, h, d };
  }, [grid.tileSize]);

  return (
    <group>
      {towers.map((tile) => {
        const c = tileToWorldCenter(tile, grid);

        // Deep clone hierarchy safely (materials/geometries are reused internally)
        const cloned = SkeletonUtils.clone(base) as Group;

        // Keep your existing visual offsets
        const px = c.x - 0.25;
        const py = c.y + epsilon;
        const pz = c.z + 0.1;

        return (
          <group key={keyOf(tile)} position={[px, py, pz]} scale={[s, s, s]}>
            {/* Visual model */}
            <primitive object={cloned} />

            {/* ✅ Invisible collider (world-ish volume) for reliable hover */}
            {/* Note: collider lives inside scaled group, so compensate by inversely scaling its geometry.
                Easiest is: build collider in "model space" by dividing by s. */}
            <mesh
              position={[0.25 / s, (colliderSize.h * 0.5) / s, -0.1 / s]}
              onPointerEnter={(e) => {
                e.stopPropagation();
                onTowerHover?.(tile);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                onTowerHover?.(null);
              }}
            >
              <boxGeometry
                args={[
                  colliderSize.w / s,
                  colliderSize.h * 3,
                  colliderSize.d / s,
                ]}
              />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload("/assets/cloud-produce-tower-model.glb");
