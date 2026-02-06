//gridTypes.ts
//Lowest layer

export type Tile = Readonly<{ x: number; z: number }>;

export type Vec3 = Readonly<{ x: number; y: number; z: number }>;

export type TileId = string & { readonly __brand: "TileId" };
export const toTileId = (tile: Tile): TileId => `${tile.x}:${tile.z}` as TileId;

export type TowerId = string & { readonly __brand: "TowerId" };
export const toTowerId = (tileId: TileId): TowerId => `tower:${tileId}` as TowerId;

export type DollyId = string & { readonly __brand: "DollyId" };
export const DOLLY_ID = "dolly:main" as DollyId;

export interface GridConfig {
  rows: number;
  cols: number;
  tileSize: number;
  origin: Vec3;
}

export const DEFAULT_GRID: Readonly<GridConfig> = {
  cols: 14,
  rows: 11, //12x16 will make 192 tiles, which means 24 towers should comfortably with minimum 1 tile buffers between
  tileSize: 1,
  origin: { x: 0, y: 0, z: 0 },
};

export type Tower = Readonly<{
  id: TowerId;
  tile: Tile; // location
  height: number;
}>;

export type Path = ReadonlyArray<Tile>;

export type DollyState = Readonly<{
  id: DollyId;
  tile: Tile;
  position: Vec3;
  isMoving: boolean;
  pathIndex: number;
  segmentT: number; // progress within current step
}>;

export type SimViewMode =
  | "BIRDS_EYE"
  | "SPHERE_INNER"
  | "SPHERE_OUTER"
  | "DESTINATION_FIXED"
  | "START_FIXED"
  | "LEADING"
  | "TRAILING";

export type WorldState = Readonly<{
  grid: GridConfig;

  towers: ReadonlyArray<Tower>;
  startTile: Tile;
  destinationTile: Tile | null;

  path: Path;
  dolly: DollyState;

  simViewMode: SimViewMode;
  worldCameraIndex: number;
}>;
