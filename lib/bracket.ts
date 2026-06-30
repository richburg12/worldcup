// All bracket data, geometry, and advancement logic live here.
// The layout is a circular ("radial") single-elimination bracket for 32 teams:
//   Round of 32 (outer) -> Round of 16 -> Quarter-finals -> Semi-finals -> Final -> Champion (centre).
//
// Geometry is computed once at module load (pure maths, no Date/random) and reused.

// A team as served by the bracket feed. `crest` is a flag image URL.
export type Team = { id: string; name: string; crest: string | null };

export type RoundDef = {
  key: string;
  label: string;
  short: string;
  count: number; // number of team slots in this ring
  radius: number; // radius of node centres
  nodeR: number; // node circle radius
  bandColor: string; // ring background fill
  labelColor: string; // pill / accent colour
};

// Rounds from outer (R32) to centre (Champion).
export const ROUNDS: RoundDef[] = [
  { key: 'R32', label: 'Round of 32', short: 'R32', count: 32, radius: 430, nodeR: 30, bandColor: '#dbe4ee', labelColor: '#64748b' },
  { key: 'R16', label: 'Round of 16', short: 'R16', count: 16, radius: 340, nodeR: 28, bandColor: '#d4ebe2', labelColor: '#0d9488' },
  { key: 'QF', label: 'Quarter-finals', short: 'QF', count: 8, radius: 255, nodeR: 26, bandColor: '#e6def3', labelColor: '#7c3aed' },
  { key: 'SF', label: 'Semi-finals', short: 'SF', count: 4, radius: 175, nodeR: 24, bandColor: '#f6dde3', labelColor: '#e11d6b' },
  { key: 'F', label: 'Final', short: 'Final', count: 2, radius: 100, nodeR: 24, bandColor: '#f8edcf', labelColor: '#d97706' },
  { key: 'W', label: 'Champion', short: 'Champion', count: 1, radius: 0, nodeR: 40, bandColor: '#f8edcf', labelColor: '#b45309' },
];

export const CX = 640;
export const CY = 540;

// ---- angles (degrees, clockwise from 12 o'clock) ----
// Right half spans the right semicircle, left half mirrors it; small gaps at top & bottom.
const angles: number[][] = [];
angles[0] = new Array(32);
for (let i = 0; i < 16; i++) angles[0][i] = ((i + 0.5) / 16) * 180; // right half: 0..+180
for (let i = 0; i < 16; i++) angles[0][16 + i] = -((i + 0.5) / 16) * 180; // left half: 0..-180
for (let r = 1; r < ROUNDS.length; r++) {
  angles[r] = [];
  for (let m = 0; m < ROUNDS[r].count; m++) {
    angles[r][m] = (angles[r - 1][2 * m] + angles[r - 1][2 * m + 1]) / 2;
  }
}

export function polar(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) };
}

export type NodePos = {
  round: number;
  index: number;
  angle: number;
  x: number;
  y: number;
  nodeR: number;
};

// Pre-computed node positions for every slot in every round.
export const NODES: NodePos[][] = ROUNDS.map((rd, r) =>
  Array.from({ length: rd.count }, (_, i) => {
    const { x, y } = polar(rd.radius, angles[r][i]);
    return { round: r, index: i, angle: angles[r][i], x, y, nodeR: rd.nodeR };
  })
);

// Per-match bracket connectors. Each match draws a coloured "U" joining the two opponents
// (two radial stubs + a curved bar) so you can see who plays whom, plus a thin grey "stem"
// showing the winner's path inward to the next round.
export type Seg = { x1: number; y1: number; x2: number; y2: number };
export type MatchLink = {
  round: number;
  match: number;
  color: string; // round accent used for the pairing "U"
  stubA: Seg;
  stubB: Seg;
  bar: string; // SVG path (quadratic curve joining the two opponents)
  stem: Seg; // winner's path to the next round
};

export const MATCH_LINKS: MatchLink[] = [];
for (let r = 0; r < ROUNDS.length - 1; r++) {
  const child = ROUNDS[r];
  const parent = ROUNDS[r + 1];
  const matches = child.count / 2;
  for (let m = 0; m < matches; m++) {
    const thA = angles[r][2 * m];
    const thB = angles[r][2 * m + 1];
    const thP = angles[r + 1][m];
    const rJoin = child.radius - (child.radius - parent.radius) * 0.45;
    const aEdge = polar(child.radius - child.nodeR, thA);
    const bEdge = polar(child.radius - child.nodeR, thB);
    const jA = polar(rJoin, thA);
    const jB = polar(rJoin, thB);
    const ctrl = polar(rJoin * 0.99, thP);
    const stemStart = polar(rJoin, thP);
    const parentEdge = polar(parent.radius + parent.nodeR, thP);
    MATCH_LINKS.push({
      round: r,
      match: m,
      color: child.labelColor,
      stubA: { x1: aEdge.x, y1: aEdge.y, x2: jA.x, y2: jA.y },
      stubB: { x1: bEdge.x, y1: bEdge.y, x2: jB.x, y2: jB.y },
      bar: `M ${jA.x.toFixed(1)} ${jA.y.toFixed(1)} Q ${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${jB.x.toFixed(1)} ${jB.y.toFixed(1)}`,
      stem: { x1: stemStart.x, y1: stemStart.y, x2: parentEdge.x, y2: parentEdge.y },
    });
  }
}

// Ring band geometry (concentric coloured annuli), one per round + centre.
export type Band = { round: number; mid: number; thickness: number; labelRadius: number };
export const BANDS: Band[] = (() => {
  const edges: number[] = [ROUNDS[0].radius + 38]; // outer edge of R32
  for (let r = 1; r < ROUNDS.length; r++) edges.push((ROUNDS[r - 1].radius + ROUNDS[r].radius) / 2);
  edges.push(0); // centre
  const bands: Band[] = [];
  for (let r = 0; r < ROUNDS.length; r++) {
    const outer = edges[r];
    const inner = edges[r + 1];
    bands.push({ round: r, mid: (outer + inner) / 2, thickness: outer - inner, labelRadius: (outer + inner) / 2 });
  }
  return bands;
})();

// ---- bracket state logic ----

export type Picks = Record<string, string>; // `${round}:${matchIndex}` -> winning team id (hypothetical)

export type Slots = (string | null)[][]; // [round][index] -> team id or null

export type ComputeResult = { slots: Slots; validPicks: Picks };

// Build the full bracket top-down from a Round-of-32 seed (32 team ids in tree-leaf order).
// Real results win; otherwise the user's hypothetical pick applies, but ONLY if the chosen team
// is actually present in that match. A pick that became invalid (because an upstream pick or a
// real result changed who is in the match) is silently dropped, which clears its whole path.
export function computeBracket(
  seed: (string | null)[],
  picks: Picks,
  results: Record<string, string>
): ComputeResult {
  const slots: Slots = ROUNDS.map((rd) => new Array(rd.count).fill(null));
  for (let i = 0; i < slots[0].length; i++) slots[0][i] = seed[i] ?? null;

  const validPicks: Picks = {};
  for (let r = 0; r < ROUNDS.length - 1; r++) {
    const matches = ROUNDS[r].count / 2;
    for (let m = 0; m < matches; m++) {
      const a = slots[r][2 * m];
      const b = slots[r][2 * m + 1];
      const key = `${r}:${m}`;
      const res = results[key];
      let winner: string | null = null;
      if (res && (res === a || res === b)) {
        winner = res;
      } else {
        const p = picks[key];
        if (p && (p === a || p === b)) {
          winner = p;
          validPicks[key] = p;
        }
      }
      slots[r + 1][m] = winner;
    }
  }
  return { slots, validPicks };
}
