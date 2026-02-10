// src/app/ui/OrbitHint.tsx
import React from "react";

export default function OrbitHint({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 40, // below ControlPanel (50), above canvas
        pointerEvents: "none",
        userSelect: "none",
        color: "rgba(255,255,255,1)",
        fontSize: 34,
        lineHeight: 1,
        letterSpacing: 10,
        textShadow: "0 6px 18px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        gap: 40,
      }}
      aria-hidden="true"
    >
      <span style={{ opacity: 1 }}>‹</span>
      <span style={{ fontSize: 12, opacity: 0.33, letterSpacing: 0, textAlign: "center" }}>
        drag to pan
      </span>
      <span style={{ opacity: 1 }}>›</span>
    </div>
  );
}
