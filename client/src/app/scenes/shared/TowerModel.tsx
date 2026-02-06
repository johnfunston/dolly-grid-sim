// src/app/scenes/shared/TowerModel.tsx
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { BufferGeometry, Material, Mesh, Object3D } from "three";

type InstancedTowerAsset = Readonly<{
  geometry: BufferGeometry;
  material: Material;
}>;

function isMesh(obj: Object3D): obj is Mesh {
  // `isMesh` is the canonical THREE runtime flag
  return (obj as Mesh).isMesh === true;
}

export function useTowerModel(url: string): InstancedTowerAsset {
  const gltf = useGLTF(url);

  return useMemo<InstancedTowerAsset>(() => {
    // IMPORTANT: explicit annotation prevents `null`-only inference => `never` later
    let found: Mesh | null = null;

    gltf.scene.traverse((obj: Object3D) => {
      if (found) return;
      if (isMesh(obj)) found = obj;
    });

    if (found === null) {
      throw new Error(`[TowerModel] No Mesh found in GLB: ${url}`);
    }

    // Create a new local const so TS narrows it to Mesh (not nullable)
    const mesh: Mesh = found;

    console.log("[TOWER] found mesh:", mesh.name);
console.log("[TOWER] geom verts:", mesh.geometry.attributes.position.count);
console.log("[TOWER] material:", Array.isArray(mesh.material) ? "multi" : mesh.material.type);


    const material: Material = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
console.log("[TOWER GLTF] scene children:", gltf.scene.children);


    return {
      geometry: mesh.geometry,
      material,
    };
  }, [gltf, url]);
}

useGLTF.preload("/assets/cloud-produce-tower-model.glb");

