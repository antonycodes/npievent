/**
 * layoutConfig — the 38 interactive positions mapped to board coordinates.
 *
 * Coordinates are percentages of a 16:9 board and were derived by tracing the
 * attached event floor-plan photo:
 *   - Bàn thu cũ (trade-in) : long table cluster on the LEFT      → 2 cols × 5 rows = 10
 *   - Bàn tư vấn (consult)  : main grid in the CENTER             → 6 cols × 3 rows = 18
 *   - Backup (sân khấu)     : reserve positions in the STAGE zone → 5 cols × 2 rows = 10
 * Total = 38.
 *
 * Numbering runs left→right, then top→bottom within each cluster.
 */
import type { ClusterKey, TablePosition } from '@/types/desk';

/**
 * Desk-code prefix per cluster — the ops-facing IDs are TC1–TC10 (Thu cũ),
 * TV1–TV18 (Tư vấn), BK1–BK10 (Backup). These same codes are the join key
 * against the Lark "Selection-*" desk tables.
 */
export const CLUSTER_PREFIX: Record<ClusterKey, string> = {
  tradein: 'TC',
  consult: 'TV',
  backup: 'BK',
};

/**
 * Minimum spacing between two adjacent desk centers, in board percent.
 *
 * A node is `--node` tall (index.css: 5.5% of the board height) and its row of
 * STT dots hangs `node/2 + 2px + dot` ≈ 5.5% of the height below the center, so
 * two rows need ≈ 8.5% plus breathing room. Columns only have to clear the node
 * width plus a 2-dot row (≈ 3.5% of the height ≈ 2.5% of a 16:9 width), but are
 * kept well above that so a 3-dot row still fits between two neighbours.
 */
const MIN_ROW_PITCH = 11; // % of board height
const MIN_COL_PITCH = 6; // % of board width

/** Assert a coordinate axis leaves enough room for the node + dot marks. */
function assertPitch(cluster: ClusterKey, axis: 'x' | 'y', values: number[], min: number): void {
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i] - sorted[i - 1];
    if (gap < min) {
      throw new Error(
        `layoutConfig: ${cluster} ${axis} spacing ${gap}% < ${min}% — desk nodes and ` +
          `their STT dots would overlap. Move the coordinates apart (or shrink --node).`,
      );
    }
  }
}

/**
 * Build a grid of positions for one cluster.
 * Desk id/label = `${prefix}${n}` (1-based, unpadded), e.g. "TV7".
 * @param cluster  cluster key (drives the id prefix)
 * @param xs       column center X positions (%)
 * @param ys       row center Y positions (%)
 */
function buildGrid(cluster: ClusterKey, xs: number[], ys: number[]): TablePosition[] {
  assertPitch(cluster, 'x', xs, MIN_COL_PITCH);
  assertPitch(cluster, 'y', ys, MIN_ROW_PITCH);
  const prefix = CLUSTER_PREFIX[cluster];
  const out: TablePosition[] = [];
  let i = 0;
  for (const y of ys) {
    for (const x of xs) {
      i += 1;
      const code = `${prefix}${i}`;
      out.push({ id: code, cluster, label: code, x, y });
    }
  }
  return out;
}

// ── Bàn thu cũ (trade-in) — LEFT block, 2 columns × 5 rows ──────────────────
// Rows spread over 33→81% (12% pitch) so each node keeps its STT dots clear of
// the row below; the block still reads as the two long tables in the photo.
export const TRADEIN_POSITIONS = buildGrid(
  'tradein',
  [8, 19],
  [33, 45, 57, 69, 81],
);

// ── Bàn tư vấn (consult) — CENTER grid, 6 columns × 3 rows ───────────────────
// 9% column pitch (was 7.6%) so a 2–3 dot row fits between two neighbours.
export const CONSULT_POSITIONS = buildGrid(
  'consult',
  [31, 40, 49, 58, 67, 76],
  [50, 63, 76],
);

// ── Backup — STAGE zone, 5 columns × 2 rows ─────────────────────────────────
export const BACKUP_POSITIONS = buildGrid(
  'backup',
  [40, 48.5, 57, 65.5, 74],
  [17, 30],
);

/** All 38 positions, flat. */
export const ALL_POSITIONS: TablePosition[] = [
  ...TRADEIN_POSITIONS,
  ...CONSULT_POSITIONS,
  ...BACKUP_POSITIONS,
];

/** Human-readable Vietnamese names per cluster, for legends/labels. */
export const CLUSTER_LABELS: Record<ClusterKey, string> = {
  tradein: 'Bàn thu cũ',
  consult: 'Bàn tư vấn',
  backup: 'Backup (Sân khấu)',
};

// Compile-time sanity: the brief mandates exactly 38 positions (10/18/10).
if (
  TRADEIN_POSITIONS.length !== 10 ||
  CONSULT_POSITIONS.length !== 18 ||
  BACKUP_POSITIONS.length !== 10
) {
  throw new Error(
    `layoutConfig: expected 10/18/10 positions, got ` +
      `${TRADEIN_POSITIONS.length}/${CONSULT_POSITIONS.length}/${BACKUP_POSITIONS.length}`,
  );
}
