/**
 * Domain types for the Coordinator dashboard (spec v2).
 *
 * A "desk" is one interactive floor position (TC/TV/BK). Its static shape
 * (id, cluster, label, coords) comes from layoutConfig; its live state comes
 * from the Lark "DS *" registry tables (staff + counts) plus, best-effort, the
 * transaction tables (current customer detail). See memory.md §4.
 */

/** Physical cluster a desk belongs to. */
export type ClusterKey = 'tradein' | 'consult' | 'backup';

/** Static definition of one desk position on the map. */
export interface TablePosition {
  /** Desk code = join key, e.g. "TV7". */
  id: string;
  cluster: ClusterKey;
  /** Label rendered on the node (same as the code). */
  label: string;
  /** Node center X as a percentage (0–100) of the board width. */
  x: number;
  /** Node center Y as a percentage (0–100) of the board height. */
  y: number;
}

/** Visual state of a desk node. */
export type DeskUiStatus = 'idle' | 'available' | 'occupied';

/** Một khách đang được tiếp nhận tại bàn (chấm STT dưới node). */
export interface DeskCustomer {
  stt: string | null; // STT khách (hiển thị trên chấm)
  name: string | null; // tên (hiển thị khi hover / trong popover)
  productName?: string | null; // SP 1 (join Check in theo tên)
  paymentNote?: string | null; // Note UDTT (join Check in theo tên)
  deviceAccepted?: boolean | null; // Đã nghiệm thu thiết bị (join Check in theo tên)
}

/** Số khách tối đa 1 nhân viên tiếp nhận đồng thời (theo cụm). */
export const DESK_CAPACITY: Record<ClusterKey, number> = {
  tradein: 1,
  consult: 2,
  backup: 1,
};

/**
 * Một khách đang ở khu vực chờ ngoài bàn (chưa gán vào bàn cụ thể):
 *   - "Chờ check-in": đã check-in (có STT) nhưng chưa từng xuất hiện ở bàn nào.
 *   - "Chờ điều phối": vừa hoàn tất 1 cụm (`fromCluster`) và đang rảnh, chờ
 *     điều phối viên đưa sang cụm tiếp theo.
 */
export interface WaitingCustomer extends DeskCustomer {
  /** Cụm vừa hoàn tất — chỉ có ở nhóm "Chờ điều phối". */
  fromCluster?: ClusterKey | null;
  /** Tên khâu vừa hoàn tất, lấy trực tiếp từ Check-in cột "Done in Flow". */
  doneInFlow?: string | null;
}

/**
 * Live per-desk state merged from the DS registry (+ transaction join).
 * All fields optional so a desk with no data still renders (idle/grey).
 */
export interface DeskLiveState {
  /** Assigned staff — DS `NV Tư vấn` / `Nhân viên`. */
  staffName: string | null;
  /** DS `Sl … tiếp nhận` — currently being served. */
  received: number;
  /** DS `Sl … hoàn tất` — completed. */
  completed: number;
  /** DS `Sl khách chờ` — waiting (bottleneck signal). */
  waiting: number;
  /** DS `Trạng thái hiện tại` — "Đang tư vấn" / "Rảnh" / "Chưa có dữ liệu". */
  currentStatus: string | null;
  /** Derived from currentStatus → occupied (red). */
  isOccupied: boolean;
  /** true once this desk was seen in the data (else UI stays idle/grey). */
  hasData: boolean;
  // ── Customer detail (only when occupied), from DS + Check in ──
  customerSTT: string | null; // STT gần nhất
  customerName: string | null; // Khách gần nhất
  productName: string | null; // SP 1 (Check in, by name)
  paymentNote: string | null; // Note UDTT (Check in, by name)
  deviceAccepted: boolean | null; // Đã nghiệm thu thiết bị (Check in, by name)
  /** Khách đang "Tiếp nhận" tại bàn (đã cắt tối đa theo DESK_CAPACITY). */
  receivedCustomers: DeskCustomer[];
}

/** A position combined with its (optional) live state — one rendered node. */
export type DeskData = TablePosition & Partial<DeskLiveState>;

/**
 * Derive the visual status from `Trạng thái hiện tại`:
 *   "Đang tư vấn" → occupied · "Rảnh" → available · else → idle (grey).
 */
export function deskUiStatus(d: Partial<DeskLiveState> | undefined): DeskUiStatus {
  if (!d || !d.hasData) return 'idle';
  const s = (d.currentStatus ?? '').toLowerCase();
  if (s.includes('đang')) return 'occupied'; // Đang tư vấn / Đang tiếp nhận
  if (s.includes('rảnh')) return 'available';
  return 'idle'; // "Chưa có dữ liệu" or empty
}

/** Aggregated counts for one cluster. */
export interface ClusterSummary {
  total: number; // fixed map nodes in this cluster
  withData: number; // nodes matched to a DS row
  occupied: number;
  available: number;
  waiting: number; // sum of khách chờ
}

/** Customer funnel for the sidebar card (distinct customers by name). */
export interface CustomerFunnel {
  totalRegistered: number; // Số tổng (Danh sách đơn hàng)
  checkedIn: number; // SL khách đã check-in
  consulting: number; // đang ở bàn Tư vấn
  serving: number; // đang được phục vụ ở bất kỳ bàn nào
  notServed: number; // đã check-in nhưng chưa được phục vụ
}

/** Whole-board summary for the sidebar. */
export interface DashboardSummary {
  byCluster: Record<ClusterKey, ClusterSummary>;
  customers: CustomerFunnel;
}

const CLUSTERS: ClusterKey[] = ['tradein', 'consult', 'backup'];

/**
 * Compute per-cluster summary + customer funnel from the rendered desks.
 * `totalRegistered` / `checkedIn` come from the Orders / Check-in tables.
 * Served counts are **distinct customers by name** (one person may occupy
 * several desks across stages, so counting desks would over-count).
 */
export function computeSummary(
  desks: DeskData[],
  opts: { totalRegistered?: number; checkedIn?: number } = {},
): DashboardSummary {
  const byCluster = Object.fromEntries(
    CLUSTERS.map((c) => [c, { total: 0, withData: 0, occupied: 0, available: 0, waiting: 0 }]),
  ) as Record<ClusterKey, ClusterSummary>;

  const servedNames = new Set<string>();
  const consultingNames = new Set<string>();

  for (const d of desks) {
    const s = byCluster[d.cluster];
    s.total += 1;
    const u = deskUiStatus(d);
    if (d.hasData) {
      s.withData += 1;
      s.waiting += d.waiting ?? 0;
    }
    if (u === 'occupied') {
      s.occupied += 1;
      if (d.customerName) {
        servedNames.add(d.customerName);
        if (d.cluster === 'consult') consultingNames.add(d.customerName);
      }
    } else if (u === 'available') {
      s.available += 1;
    }
  }

  const checkedIn = opts.checkedIn ?? 0;
  const serving = servedNames.size;
  const customers: CustomerFunnel = {
    totalRegistered: opts.totalRegistered ?? 0,
    checkedIn,
    consulting: consultingNames.size,
    serving,
    notServed: Math.max(0, checkedIn - serving),
  };

  return { byCluster, customers };
}
