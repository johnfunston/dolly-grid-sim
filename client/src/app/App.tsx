import { useMemo, useState, useCallback } from "react";
import type { Tile } from "./world/grid/gridTypes";
import { DEFAULT_GRID } from "./world/grid/gridTypes";
import { generateTowerTiles, buildTowerSet } from "./world/towers/towerLocations";
import { buildBaseEdges } from "./world/pathfinding/neighbors";
import { buildPrunedAdjacency } from "./world/grid/gridRules";
import { bfsPath } from "./world/pathfinding/bfs";
import SimViewCanvas from "./scenes/SimViewCanvas";

function App() {
  const [dollyTile, setDollyTile] = useState<Tile>({ x: 0, z: 0 });
  const [path, setPath] = useState<Tile[]>([]);
  const [hoveredTile, setHoveredTile] = useState<Tile | null>(null);

  const grid = DEFAULT_GRID;

  const towers = useMemo(() => generateTowerTiles(grid), [grid]);
  const towerSet = useMemo(() => buildTowerSet(towers), [towers]);

  const baseEdges = useMemo(() => buildBaseEdges(grid), [grid]);
  const adj = useMemo(
    () => buildPrunedAdjacency(grid, baseEdges, towerSet),
    [grid, baseEdges, towerSet]
  );


  const handleTileHover = useCallback((tile: Tile | null) => {
    setHoveredTile(tile);
  }, []);

const isMoving = path.length >= 2;

const hoverPath = useMemo(() => {
  if (isMoving) return [];
  if (!hoveredTile) return [];
  if (hoveredTile.x === dollyTile.x && hoveredTile.z === dollyTile.z) return [];
  return bfsPath(adj, dollyTile, hoveredTile);
}, [adj, dollyTile, hoveredTile, isMoving]);

const handleTileClick = useCallback(
  (tile: Tile) => {
    if (isMoving) return;
    const nextPath = bfsPath(adj, dollyTile, tile);
    setPath(nextPath);
  },
  [adj, dollyTile, isMoving]
);


const handleArrive = useCallback((tile: Tile) => {
  console.log("[APP] ARRIVE", tile);
  setDollyTile(tile);
  setPath([]);
}, []);


  return (
    <SimViewCanvas
      grid={grid}
      towers={towers}
      dollyTile={dollyTile}
      path={path}
      hoveredTile={hoveredTile}
      onTileHover={handleTileHover}
      onTileClick={handleTileClick}
      onArrive={handleArrive}
      hoverPath={hoverPath}
    />
  );
}

export default App;
