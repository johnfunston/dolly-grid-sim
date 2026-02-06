// src/app/sim/commands.ts
import type { Tile } from "../../world/grid/gridTypes";

export type MoveToCommand = Readonly<{
  type: "MOVE_TO";
  to: Tile;
}>;

export type LiftCommand = Readonly<{
  type: "LIFT";
  tile: Tile;
}>;

export type DropCommand = Readonly<{
  type: "DROP";
  tile: Tile;
}>;

export type Command = MoveToCommand | LiftCommand | DropCommand;

export type HoverIntent =
  | Readonly<{ type: "LIFT_AT"; tile: Tile }>
  | Readonly<{ type: "MOVE_TO"; tile: Tile }>
  | Readonly<{ type: "DROP_AT"; tile: Tile }>
  | Readonly<{ type: "SWAP_WITH"; tile: Tile }>;

export const CMD = {
  moveTo: (to: Tile): MoveToCommand => ({ type: "MOVE_TO", to }),
  lift: (tile: Tile): LiftCommand => ({ type: "LIFT", tile }),
  drop: (tile: Tile): DropCommand => ({ type: "DROP", tile }),
} as const;
