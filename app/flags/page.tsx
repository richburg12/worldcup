"use client";

// Quick US state-flag quiz: show a flag, reveal the state, next.
// Flags are hotlinked from Wikimedia Commons via the stable Special:FilePath
// redirect, so we host no images ourselves. Plain <img> (not next/image) so no
// domain config is needed.

import { useMemo, useState } from "react";

const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

function flagUrl(state: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    "Flag of " + state + ".svg"
  )}`;
}

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlagsPage() {
  const [order, setOrder] = useState<number[]>(() => shuffled(STATES.length));
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const state = STATES[order[pos]];

  function next() {
    setRevealed(false);
    setPos((p) => {
      if (p + 1 < order.length) return p + 1;
      setOrder(shuffled(STATES.length)); // reshuffle for another lap
      return 0;
    });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        background: "#0b0e14",
        color: "#e6e6e6",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1, opacity: 0.9 }}>
        Guess the State Flag
      </h1>

      <div style={{ fontSize: 13, opacity: 0.5 }}>
        {pos + 1} / {STATES.length}
      </div>

      <div
        style={{
          width: "min(92vw, 560px)",
          aspectRatio: "3 / 2",
          background: "#141a26",
          border: "1px solid #2a3446",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* key forces a fresh element per state so the image swaps cleanly */}
        <img
          key={state}
          src={flagUrl(state)}
          alt={revealed ? `Flag of ${state}` : "Mystery state flag"}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          height: 32,
          fontSize: 26,
          fontWeight: 700,
          color: "#f5b301",
          minHeight: 32,
        }}
      >
        {revealed ? state : ""}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        {!revealed ? (
          <button onClick={() => setRevealed(true)} style={btn("#f5b301", "#0b0e14")}>
            Reveal
          </button>
        ) : (
          <button onClick={next} style={btn("#1c2230", "#e6e6e6")}>
            Next flag →
          </button>
        )}
      </div>
    </main>
  );
}

function btn(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg,
    color: fg,
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    minWidth: 160,
  };
}
