// src/app/ui/HudPanel.tsx
import { useMemo } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import { tileToWorldCenter } from "../world/grid/gridMath";
import "../styles/globals.css";

export type HudPanelProps = {
  grid: GridConfig;

  // Dolly
  dollyTile: Tile;
  dollyWorldPos?: Vec3; // optional (nice-to-have if you wire Dolly.onPosition up to App)

  // Hover
  hoveredTile: Tile | null;
  hoveredTowerTile: Tile | null;

  // State
  carrying: Tile | null;
  isMoving: boolean;

  // Path + timing
  path: readonly Tile[];
  speed: number; // world units / second
  queueLen?: number; // optional: display-only
};

function fmtTile(t: Tile | null): string {
  if (!t) return "—";
  return `(${t.x}, ${t.z})`;
}

function fmtVec3(v: Vec3 | null | undefined): string {
  if (!v) return "—";
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

function fmtSeconds(sec: number | null): string {
  if (sec === null) return "—";
  if (!Number.isFinite(sec) || sec < 0) return "—";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function polylineLength(points: readonly Vec3[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return sum;
}

export default function HudPanel({
  grid,
  dollyTile,
  dollyWorldPos,
  hoveredTile,
  hoveredTowerTile,
  carrying,
  isMoving,
  path,
  speed,
  queueLen,
}: HudPanelProps) {
  const dollyWorldFromTile = useMemo(() => tileToWorldCenter(dollyTile, grid), [dollyTile, grid]);
  const dollyPos = dollyWorldPos ?? dollyWorldFromTile;

  const pathWorldLen = useMemo(() => {
    if (path.length < 2) return 0;
    const pts = path.map((t) => tileToWorldCenter(t, grid));
    return polylineLength(pts);
  }, [grid, path]);

  const etaSeconds = useMemo(() => {
    if (path.length < 2) return null;
    if (speed <= 0) return null;
    return pathWorldLen / speed;
  }, [path.length, pathWorldLen, speed]);

  const pathNodes = path.length;
  const pathSteps = Math.max(0, pathNodes - 1);

  return (
    <div className="hud-panel">
      <div className="hud-row">
        <div className="hud-item">
          <strong>Dolly Tile</strong>: {fmtTile(dollyTile)}
        </div>
        <div className="hud-item">
          <strong>Dolly World</strong>: {fmtVec3(dollyPos)}
        </div>
      </div>

      <div className="hud-row">
        <div className="hud-item">
          <strong>Hovered Tile</strong>: {fmtTile(hoveredTile)}
        </div>
        <div className="hud-item">
          <strong>Hovered Tower</strong>: {fmtTile(hoveredTowerTile)}
        </div>
      </div>

      <div className="hud-row">
        <div className="hud-item">
          <strong>Carrying</strong>: {fmtTile(carrying)}
        </div>
        <div className="hud-item">
          <strong>Moving</strong>: {isMoving ? "yes" : "no"}
        </div>
        <div className="hud-item">
          <strong>Queue</strong>: {queueLen ?? 0}
        </div>
      </div>

      <div className="hud-row">
        <div className="hud-item">
          <strong>Path</strong>: {pathSteps} steps ({pathNodes} nodes)
        </div>
        <div className="hud-item">
          <strong>Speed</strong>: {speed.toFixed(2)} u/s
        </div>
        <div className="hud-item">
          <strong>ETA</strong>: {fmtSeconds(etaSeconds)}
        </div>
      </div>
    </div>
  );
}
