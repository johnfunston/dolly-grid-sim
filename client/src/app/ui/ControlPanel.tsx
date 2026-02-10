// src/app/ui/ControlPanel.tsx
import React from "react";

export type ActiveView = "SIM" | "WORLD";

export type SimCamMode =
  | "CHASE"
  | "LEAD"
  | "PATH_START"
  | "DESTINATION_TILE"
  | "TOP_DOWN"
  | "DOLLY"
  | "STATIC_CENTER";

export type WorldCamMode = "TRACK" | "LANE" | "CENTER_OVERVIEW";

type ControlPanelProps = {
  activeView: ActiveView;
  onSetActiveView: (v: ActiveView) => void;

  simCamMode: SimCamMode;
  onSetSimCamMode: (m: SimCamMode) => void;

  worldCamMode: WorldCamMode;
  onSetWorldCamMode: (m: WorldCamMode) => void;

  showGrid: boolean;
  onToggleGrid: () => void;
};

type BtnProps = {
  active?: boolean;
  color?: string;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
};

const SIM_COLOR = "rgba(48, 81, 12, .5)";
const WORLD_COLOR = "rgba(15, 70, 71, .5)";
const SIM_TITLE_COLOR = "#30510c";
const WORLD_TITLE_COLOR = "#0f4647";

function Btn({ active, color, title, onClick, children }: BtnProps) {
  const [hovered, setHovered] = React.useState(false);

  const inactiveBg = "rgba(0,0,0,0.35)";
  const activeBg = color ?? "rgba(255,255,255,0.25)";

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        pointerEvents: "auto",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.25)",
          background: active ? activeBg : inactiveBg,
          color: "white",
          fontSize: 12,
          cursor: "pointer",
          userSelect: "none",
          lineHeight: 1,
          transition: "background 120ms ease",
        }}
      >
        {children}
      </button>

      {/* ✅ instant custom tooltip */}
      {title && hovered && (
        <div
          style={{
            position: "absolute",
            bottom: "120%",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "wrap",
            overflowWrap: "break-word",
            hyphens: "auto",
            padding: "6px 8px",
            fontSize: 11,
            height: 50,
            width: 170,
            borderRadius: 6,
            background: "#FEC901",
            border: "2px solid rgba(0, 0, 0, 1)",
            color: "black",
            pointerEvents: "none",
            zIndex: 100,
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}

export default function ControlPanel({
  activeView,
  onSetActiveView,
  simCamMode,
  onSetSimCamMode,
  worldCamMode,
  onSetWorldCamMode,
  showGrid,
  onToggleGrid,
}: ControlPanelProps) {
  return (
    <div
      style={{
        position: "fixed",
        right: 6,
        top: 12,
        zIndex: 999,
        pointerEvents: "none",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          width: 340,
          padding: 10,
          height: 272,
          borderRadius: 12,
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.75)",
          backdropFilter: "blur(2px)",
        }}
      >
        {/* Row 1: Title */}
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          Camera Views Control Panel
        </div>

        {/* Row 2: Grid toggle */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 6 }}>
            Grid Overlay
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap"}}>
            <Btn active={showGrid} color={SIM_COLOR} onClick={onToggleGrid}>
              {showGrid ? "ON" : "OFF"}
            </Btn>
          </div>
        </div>

        {/* Row 3: Sim + World containers */}
        <div style={{ display: "flex", gap: 10 }}>
          {/* SIM box */}
          <div
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 12,
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, .2)",
            
            }}
          >
            <div style={{top: -22, left: 55, position: "relative" }}>
              <Btn
                active={activeView === "SIM"}
                color={SIM_TITLE_COLOR}
                onClick={() => onSetActiveView("SIM")}
              >
                SIM
              </Btn>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
              <Btn
                active={simCamMode === "CHASE"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("CHASE")}
              >
                CHASE
              </Btn>

              <Btn
                active={simCamMode === "LEAD"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("LEAD")}
              >
                LEAD
              </Btn>

              <Btn
                active={simCamMode === "PATH_START"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("PATH_START")}
              >
                PATH START
              </Btn>

              <Btn
                active={simCamMode === "DESTINATION_TILE"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("DESTINATION_TILE")}
              >
                DEST TILE
              </Btn>

              <Btn
                active={simCamMode === "TOP_DOWN"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("TOP_DOWN")}
              >
                TOP
              </Btn>

              <Btn
                active={simCamMode === "DOLLY"}
                color={SIM_COLOR}
                title={"⚠ DOLLY VIEW not recommended while carrying or swapping towers"}
                onClick={() => onSetSimCamMode("DOLLY")}
              >
                DOLLY
              </Btn>

              <Btn
                active={simCamMode === "STATIC_CENTER"}
                color={SIM_COLOR}
                onClick={() => onSetSimCamMode("STATIC_CENTER")}
              >
                STATIC
              </Btn>
            </div>
          </div>

          {/* WORLD box */}
          <div
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 12,
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255, 255, 255, .2)",
            }}
          >
            <div style={{top: -22, left: 39, position: "relative" }}>
              <Btn
                active={activeView === "WORLD"}
                color={WORLD_TITLE_COLOR}
                onClick={() => onSetActiveView("WORLD")}
              >
                WORLD
              </Btn>
            </div>

            <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 8 }}>
              <Btn
                active={worldCamMode === "TRACK"}
                color={WORLD_COLOR}
                onClick={() => onSetWorldCamMode("TRACK")}
              >
                TRACK
              </Btn>

              <Btn
                active={worldCamMode === "LANE"}
                color={WORLD_COLOR}
                onClick={() => onSetWorldCamMode("LANE")}
              >
                LANE
              </Btn>

              <Btn
                active={worldCamMode === "CENTER_OVERVIEW"}
                color={WORLD_COLOR}
                onClick={() => onSetWorldCamMode("CENTER_OVERVIEW")}
              >
                CENTER
              </Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
