// src/app/ui/HudPanel.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { GridConfig, Tile, Vec3 } from "../world/grid/gridTypes";
import { tileToWorldCenter } from "../world/grid/gridMath";
import "../styles/globals.css";

export type HudPanelProps = {
  grid: GridConfig;

  // Dolly
  dollyTile: Tile;
  dollyWorldPos?: Vec3;

  // Hover
  hoveredTile: Tile | null;
  hoveredTowerTile: Tile | null;

  // State
  carrying: Tile | null;
  isMoving: boolean;

  // Path + timing
  path: readonly Tile[];
  speed: number;

  // ✅ NEW: chip history (App accumulates this)
  queueHistory: readonly string[];
};

function fmtTile(t: Tile | null): string {
  if (!t) return "—";
  return `(${t.x}, ${t.z})`;
}

function fmtVec3(v: Vec3 | null | undefined): string {
  if (!v) return "—";
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;
}

function fmtSecondsFloat(sec: number | null): string {
  if (sec === null) return "—";
  if (!Number.isFinite(sec) || sec < 0) return "—";
  return `${sec.toFixed(2)}s`;
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

function chipClass(label: string): string {
  const key = label.toUpperCase();

  if (key === "IDLE") return "hud-chip hud-chip-idle";
  if (key === "DONE") return "hud-chip hud-chip-done";
  if (key === "MOVE") return "hud-chip hud-chip-move";
  if (key === "LIFT") return "hud-chip hud-chip-lift";
  if (key === "DROP") return "hud-chip hud-chip-drop";
  if (key === "SWAP") return "hud-chip hud-chip-swap";

  return "hud-chip hud-chip-generic";
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
  queueHistory,
}: HudPanelProps) {
  const dollyWorldFromTile = useMemo(
    () => tileToWorldCenter(dollyTile, grid),
    [dollyTile, grid]
  );
  const dollyPos = dollyWorldPos ?? dollyWorldFromTile;

  const pathWorldLen = useMemo(() => {
    if (path.length < 2) return 0;
    const pts = path.map((t) => tileToWorldCenter(t, grid));
    return polylineLength(pts);
  }, [grid, path]);

  const expectedEtaSeconds = useMemo(() => {
    if (path.length < 2) return null;
    if (speed <= 0) return null;
    return pathWorldLen / speed;
  }, [path.length, pathWorldLen, speed]);

  // --------------------------------------------
  // ✅ Ticking ETA (counts down smoothly)
  // We treat ETA as "expected" based on duration.
  // --------------------------------------------
  const [etaTick, setEtaTick] = useState<number | null>(null);
  const moveStartMsRef = useRef<number | null>(null);
  const etaStartRef = useRef<number | null>(null);
  const wasMovingRef = useRef(false);

  useEffect(() => {
    const movingNow = isMoving;
    const movingBefore = wasMovingRef.current;

    // Rising edge: start ticking
    if (!movingBefore && movingNow) {
      moveStartMsRef.current = performance.now();
      etaStartRef.current = expectedEtaSeconds ?? 0;
      setEtaTick(etaStartRef.current);
    }

    // Falling edge: snap to 0.00s
    if (movingBefore && !movingNow) {
      moveStartMsRef.current = null;
      etaStartRef.current = null;
      setEtaTick(0);
    }

    wasMovingRef.current = movingNow;
  }, [isMoving, expectedEtaSeconds]);

  useEffect(() => {
    // Only tick while moving
    if (!isMoving) return;

    let raf = 0;

    const loop = () => {
      const start = moveStartMsRef.current;
      const base = etaStartRef.current;

      if (start === null || base === null) {
        setEtaTick(null);
        return;
      }

      const elapsed = (performance.now() - start) / 1000;
      const remaining = Math.max(0, base - elapsed);
      setEtaTick(remaining);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isMoving]);

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
          <strong>Moving</strong>:{" "}
          <span className={isMoving ? "hud-yes" : "hud-no"}>
            {isMoving ? "yes" : "no"}
          </span>
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
          <strong>ETA</strong>: {fmtSecondsFloat(isMoving ? etaTick : 0)}
        </div>
      </div>

      <div className="hud-row">
        <div className="hud-item hud-item-full">
          <strong>Queue</strong>:
          <div className="hud-chip-row">
            {(queueHistory.length > 0 ? queueHistory : ["IDLE"]).map((label, i) => (
              <span key={`${label}-${i}`} className={chipClass(label)}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
