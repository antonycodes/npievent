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
 * Build a grid of positions for one cluster.
 * Desk id/label = `${prefix}${n}` (1-based, unpadded), e.g. "TV7".
 * @param cluster  cluster key (drives the id prefix)
 * @param xs       column center X positions (%)
 * @param ys       row center Y positions (%)
 */
function buildGrid(cluster: ClusterKey, xs: number[], ys: number[]): TablePosition[] {
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
export const TRADEIN_POSITIONS = buildGrid(
  'tradein',
  [8, 18],
  [34, 42, 50, 58, 66],
);

// ── Bàn tư vấn (consult) — CENTER grid, 6 columns × 3 rows ───────────────────
export const CONSULT_POSITIONS = buildGrid(
  'consult',
  [36, 43.6, 51.2, 58.8, 66.4, 74],
  [50, 63, 76],
);

// ── Backup — STAGE zone, 5 columns × 2 rows ─────────────────────────────────
export const BACKUP_POSITIONS = buildGrid(
  'backup',
  [40, 48, 56, 64, 72],
  [18, 30],
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
