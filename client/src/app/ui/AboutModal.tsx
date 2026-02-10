// src/app/ui/AboutModal.tsx
import React, { useEffect, useMemo, useState } from "react";

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
};

type SectionKey =
  | "tech"
  | "architecture"
  | "design"
  | "performance"
  | "cameras"
  | "demonstrates"
  | "outcome"
  | "future";

type Section = {
  key: SectionKey;
  title: string;
  body: React.ReactNode;
};

function SectionBody({ children }: { children: React.ReactNode }) {
  return <div className="about-modal__section-body">{children}</div>;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const [openKeys, setOpenKeys] = useState<Set<SectionKey>>(() => new Set());

  const sections: Section[] = useMemo(
    () => [
      {
        key: "tech",
        title: "Tech Stack",
        body: (
          <SectionBody>
            <ul className="about-modal__list">
              <li>React + TypeScript (strict)</li>
              <li>Vite</li>
              <li>Three.js via @react-three/fiber</li>
              <li>Drei utilities</li>
              <li>D3 (analytics hooks)</li>
            </ul>
          </SectionBody>
        ),
      },
      {
        key: "architecture",
        title: "Architecture",
        body: (
          <SectionBody>
            <h4 className="about-modal__subhead">World Kernel (pure logic)</h4>
            <p className="about-modal__p">
              Headless, deterministic simulation engine:
            </p>
            <ul className="about-modal__list">
              <li>grid math</li>
              <li>adjacency graph</li>
              <li>BFS pathfinding</li>
              <li>occupancy rules</li>
              <li>command queue</li>
            </ul>
            <p className="about-modal__p">
              Runs without React or Three.js. Same inputs → same outputs. Fully
              unit-testable.
            </p>

            <h4 className="about-modal__subhead">Rendering Layer</h4>
            <p className="about-modal__p">
              Purely visual consumers of world state:
            </p>
            <ul className="about-modal__list">
              <li>meshes</li>
              <li>cameras</li>
              <li>interaction</li>
            </ul>
            <p className="about-modal__p">
              Simulation and rendering are decoupled: rendering never mutates
              simulation state.
            </p>
          </SectionBody>
        ),
      },
      {
        key: "design",
        title: "Core Design Decisions",
        body: (
          <SectionBody>
            <h4 className="about-modal__subhead">Grid + Graph</h4>
            <ul className="about-modal__list">
              <li>Cartesian tile grid</li>
              <li>4-adjacency (von Neumann neighborhood)</li>
              <li>Edges pruned for tower collisions</li>
            </ul>

            <h4 className="about-modal__subhead">Pathfinding</h4>
            <p className="about-modal__p">
              Breadth-first search (BFS) for shortest path under uniform edge
              costs — chosen for correctness + simplicity over heavier heuristics.
            </p>

            <h4 className="about-modal__subhead">Command System</h4>
            <ul className="about-modal__list">
              <li>Lift / Move / Drop / Swap</li>
              <li>Queued execution</li>
              <li>Deterministic sequencing</li>
            </ul>
          </SectionBody>
        ),
      },
      {
        key: "performance",
        title: "Rendering Performance",
        body: (
          <SectionBody>
            <ul className="about-modal__list">
              <li>Tower instancing (single draw call)</li>
              <li>Minimal React state churn</li>
              <li>Ref-based frame updates (no rerender loops)</li>
              <li>Snap cameras (no smoothing overhead)</li>
            </ul>
          </SectionBody>
        ),
      },
      {
        key: "cameras",
        title: "Camera System",
        body: (
          <SectionBody>
            <p className="about-modal__p">
              Two complementary modes:
            </p>

            <h4 className="about-modal__subhead">Sim View</h4>
            <p className="about-modal__p">
              Dynamic tracking cameras designed for inspection and debugging.
            </p>

            <h4 className="about-modal__subhead">World View</h4>
            <p className="about-modal__p">
              Static perimeter cameras with row/column responsibility and
              instant switching for surveillance-style clarity — optimized for
              readability and spatial reasoning rather than spectacle.
            </p>
          </SectionBody>
        ),
      },
      {
        key: "demonstrates",
        title: "What this project demonstrates",
        body: (
          <SectionBody>
            <ul className="about-modal__list">
              <li>Data-first modeling</li>
              <li>Deterministic simulation design</li>
              <li>Algorithm selection with intent</li>
              <li>Clean separation between logic and UI</li>
              <li>Headless, testable architecture</li>
              <li>Render efficiency under real-time constraints</li>
              <li>Scalable structure under time constraints</li>
            </ul>
            <p className="about-modal__p">
              Not a demo scene — a small, well-structured simulation engine.
            </p>
          </SectionBody>
        ),
      },
      {
        key: "outcome",
        title: "Outcome",
        body: (
          <SectionBody>
            <p className="about-modal__p">Built in ~5 days.</p>
            <p className="about-modal__p">Delivers:</p>
            <ul className="about-modal__list">
              <li>interactive 3D grid simulation</li>
              <li>pathfinding agent</li>
              <li>command system</li>
              <li>multi-view cameras</li>
              <li>performant rendering</li>
            </ul>
            <p className="about-modal__p">
              Structured to scale without rewrites.
            </p>
          </SectionBody>
        ),
      },
      {
        key: "future",
        title: "Future Implementations",
        body: (
          <SectionBody>
            <h4 className="about-modal__subhead">Simulation + System Features</h4>
            <ul className="about-modal__list">
              <li>Adjustable speed controls (presets + slider)</li>
              <li>Deterministic timing option (lockstep ticks) vs visual-only playback speed</li>
              <li>Custom tower placement (click-to-place / drag-to-move) with occupancy validation</li>
              <li>Tower count selector + random seed for reproducible layouts</li>
              <li>Grid size selector (rows/cols + tile size) with auto-regenerated graphs + camera maps</li>
              <li>Scenario loading (JSON configs) for repeatable demos</li>
              <li>Undo / replay / step-through via command history + deterministic re-sim</li>
            </ul>

            <h4 className="about-modal__subhead">Pathfinding + Planning</h4>
            <ul className="about-modal__list">
              <li>Alternate algorithms (A*, Dijkstra, weighted costs) for terrain and constraints</li>
              <li>Heuristics (prefer straight paths, minimize turns, avoid tight corridors)</li>
              <li>Multi-agent extension (multiple dollies) with scheduling + collision avoidance</li>
            </ul>

            <h4 className="about-modal__subhead">Cameras + Visualization</h4>
            <ul className="about-modal__list">
              <li>
                Camera frustum calculation from grid extents (or selected region) to guarantee
                the active area is always framed
              </li>
              <li>
                Real-world camera constraints (max height, lens/FOV limits) with best-fit framing
              </li>
              <li>Safe margins for UI overlays + PiP layouts</li>
              <li>Camera placement tooling for saving presets, lanes, and tracks</li>
            </ul>

            <h4 className="about-modal__subhead">UI + UX</h4>
            <ul className="about-modal__list">
              <li>Edit vs Run modes, clearer interaction affordances</li>
              <li>Selection indicators, invalid move feedback, and hint overlays</li>
              <li>Operator mode (simple) vs Debug mode (telemetry-heavy)</li>
            </ul>

            <h4 className="about-modal__subhead">Analytics (D3-ready)</h4>
            <ul className="about-modal__list">
              <li>Live metrics (throughput, distance, turns, idle time, blocked moves)</li>
              <li>Heatmaps for tile usage / congestion + replay graphs</li>
            </ul>

            <h4 className="about-modal__subhead">Engineering / Production Hardening</h4>
            <ul className="about-modal__list">
              <li>Unit tests for the world kernel invariants</li>
              <li>Performance profiling hooks (frame time budgets, draw calls, sim step cost)</li>
              <li>State serialization for save/load/share</li>
            </ul>
          </SectionBody>
        ),
      },
    ],
    []
  );

  const toggle = (key: SectionKey) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    // prevent background scroll while modal open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="about-modal__backdrop" role="dialog" aria-modal="true">
      <button
        type="button"
        className="about-modal__backdrop-close"
        aria-label="Close about modal"
        onClick={onClose}
      />

      <div className="about-modal__card" role="document">
        <div className="about-modal__header">
          <div className="about-modal__title-wrap">
            <h2 className="about-modal__title">Dolly Grid Simulator</h2>
            <div className="about-modal__subtitle">
              Real-Time Pathfinding + Deterministic 3D Simulation
            </div>
          </div>

          <button
            type="button"
            className="about-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Always-visible intro */}
        <div className="about-modal__intro">
          <p className="about-modal__p">
            A real-time logistics simulation modeling a dolly that transports towers
            across a discrete grid using deterministic pathfinding and a high-performance 3D renderer.
          </p>

          <p className="about-modal__p about-modal__p--tight">
            Built as a focused systems exercise to demonstrate:
          </p>

          <ul className="about-modal__list">
            <li>algorithmic modeling</li>
            <li>clean architecture</li>
            <li>rendering efficiency</li>
            <li>predictable state design</li>
          </ul>

          <p className="about-modal__p">
            Users can lift, move, drop, and swap towers while the dolly navigates obstacles
            and the scene updates live across multiple camera views.
          </p>
        </div>

        {/* Accordion sections */}
        <div className="about-modal__sections">
          {sections.map((s) => {
            const isOpen = openKeys.has(s.key);
            const contentId = `about-section-${s.key}`;
            return (
              <div className="about-modal__section" key={s.key}>
                <button
                  type="button"
                  className={`about-modal__section-header ${
                    isOpen ? "is-open" : ""
                  }`}
                  onClick={() => toggle(s.key)}
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                >
                  <span className="about-modal__chev" aria-hidden="true" />
                  <span className="about-modal__section-title">{s.title}</span>
                </button>

                {isOpen && (
                  <div className="about-modal__section-content" id={contentId}>
                    {s.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
