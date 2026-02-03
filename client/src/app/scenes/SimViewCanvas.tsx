// src/app/scenes/SimViewCanvas.tsx
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import { getBirdsEyeCameraSpec } from "./cameraBirdsEye";
import Floor from "./shared/Floor";
import GridOverlay from "./shared/GridOverlay";
import Dolly from './shared/Dolly';
import Towers from './shared/Towers';
import AnimatedPathLine from './shared/AnimatedPathLine';
import PathLine from './shared/PathLine'
import TilePickerGrid from './shared/TilePickerGrid';
import HoverHighlight from './shared/HoverHighlight';
import "../styles/SimViewCanvas.css";

type SimViewCanvasProps = {
  grid: GridConfig;
  towers: readonly Tile[];
  dollyTile: Tile;
  path: readonly Tile[];
  hoveredTile: Tile | null;

  onTileHover: (tile: Tile | null) => void;
  onTileClick: (tile: Tile) => void;
  onArrive?: (tile: Tile) => void;
  hoverPath: readonly Tile[];
};

function CameraLookAt({ target }: { target: Vec3 }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(target.x, target.y, target.z);
    camera.updateProjectionMatrix();
  }, [camera, target.x, target.y, target.z]);

  return null;
}

export default function SimViewCanvas({
  grid,
  towers,
  dollyTile,
  path,
  onTileHover,
  onTileClick,
  hoveredTile,
  onArrive,
  hoverPath,
  
}: SimViewCanvasProps) {
  const cam = getBirdsEyeCameraSpec(grid);

  return (
    <div className="sim-view-canvas-container">
      <Canvas
        camera={{
          position: [cam.position.x, cam.position.y, cam.position.z],
          fov: cam.fov,
          near: cam.near,
          far: cam.far,
        }}
      >
        <CameraLookAt target={cam.target} />

        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />

        <Floor grid={grid} />
        <PathLine grid={grid} path={hoverPath} yOffset={grid.tileSize * 0.26}/>
        <GridOverlay grid={grid}/>
        <AnimatedPathLine grid={grid} path={path} speed={2}/>
        <Towers grid={grid} towers={towers}/>

        <HoverHighlight grid={grid} tile={hoveredTile}/>
        <TilePickerGrid grid={grid} onHover={onTileHover} onClick={onTileClick}/>

        <Dolly grid={grid} tile={dollyTile} path={path} speed={2} onArrive={onArrive}/>
       
        
      </Canvas>
    </div>
  );
}
