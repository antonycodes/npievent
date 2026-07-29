/**
 * larkMapper — turn raw Lark tables into per-desk live state.
 *
 * As of NPI_Testing_2.2 each DS registry row carries the desk's current status
 * and latest customer, so occupancy + customer identity come straight from DS:
 *   - status  ← `Trạng thái hiện tại` ("Đang tư vấn" → occupied, "Rảnh" → free)
 *   - khách   ← `Khách gần nhất` / `STT gần nhất`
 * Product + payment note are joined from Check in **by customer name** (safer
 * than the desk-local STT). Customer detail is only exposed when the desk is
 * occupied — a free/empty desk shows no customer.
 */
import {
  STATUS_COMPLETED,
  STATUS_RECEIVED,
  type CheckinFieldMap,
  type FieldConfig,
  type TxFieldMap,
} from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import {
  DESK_CAPACITY,
  deskUiStatus,
  type ClusterKey,
  type DeskCustomer,
  type DeskLiveState,
  type WaitingCustomer,
} from '@/types/desk';
import type { LarkCellValue, LarkRecord, LarkTables } from './larkTypes';

export function cellToString(v: LarkCellValue): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) {
    const s = v.map((seg) => seg?.text ?? '').join('').trim();
    return s || null;
  }
  return null;
}

export function cellToNumber(v: LarkCellValue): number {
  if (typeof v === 'number') return v;
  const s = cellToString(v);
  const n = s == null ? NaN : Number(s);
  return Number.isFinite(n) ? n : 0;
}

const TRUTHY_TEXT = new Set(['true', '1', 'x', 'có', 'yes', 'checked']);

/**
 * Coerce a Lark cell to boolean. Handles a plain checkbox (boolean) and the
 * real "Check nghiệm thu" field, which is a FORMULA column rendering as a
 * colored tag string — "✅ Đã nghiệm thu (1) máy" / "❌ Chưa nghiệm thu máy" —
 * so match by emoji/keyword rather than exact string (the trailing count varies).
 */
export function cellToBool(v: LarkCellValue): boolean {
  if (typeof v === 'boolean') return v;
  const s = cellToString(v);
  if (!s) return false;
  const norm = s.trim().toLowerCase();
  if (norm.includes('✅') || norm.includes('đã nghiệm thu')) return true;
  if (norm.includes('❌') || norm.includes('chưa nghiệm thu')) return false;
  return TRUTHY_TEXT.has(norm);
}

const CLUSTERS: ClusterKey[] = ['tradein', 'consult', 'backup'];
const DS_KEY = { tradein: 'dsTradein', consult: 'dsConsult', backup: 'dsBackup' } as const;

export interface MappedData {
  statesById: Record<string, DeskLiveState>;
  totalCheckIn: number;
  totalRegistered: number;
  /** Đã check-in (có STT) nhưng chưa từng xuất hiện ở bàn nào — chờ điều phối lần đầu. */
  waitingCheckin: WaitingCustomer[];
  /** Vừa hoàn tất 1 cụm, bàn đang rảnh, chưa được điều phối sang cụm tiếp theo. */
  waitingDispatch: WaitingCustomer[];
}

/**
 * Index Check-in rows by customer name → { stt, product, note, deviceAccepted }.
 *
 * Check-in's `STT` is the ONE canonical queue number for a customer — assigned
 * once at check-in and unchanged for the whole event. DS tables also carry a
 * local "STT gần nhất (helper)" per stage, but that is a per-stage helper, not
 * an identity — never use it to label a customer.
 */
function indexCheckinByName(
  rows: LarkRecord[],
  fm: CheckinFieldMap,
): Map<string, { stt: string | null; product: string | null; note: string | null; deviceAccepted: boolean }> {
  const m = new Map<string, { stt: string | null; product: string | null; note: string | null; deviceAccepted: boolean }>();
  for (const r of rows) {
    const name = cellToString(r.fields[fm.name]);
    if (name) {
      m.set(name, {
        stt: cellToString(r.fields[fm.stt]),
        product: cellToString(r.fields[fm.product]),
        note: cellToString(r.fields[fm.note]),
        deviceAccepted: cellToBool(r.fields[fm.deviceAccepted]),
      });
    }
  }
  return m;
}

/** Nhóm khách "Tiếp nhận" theo mã bàn (cắt tối đa theo capacity), kèm SP/note. */
function indexReceived(
  rows: LarkRecord[],
  fm: TxFieldMap,
  cap: number,
  checkinByName: Map<string, { stt: string | null; product: string | null; note: string | null; deviceAccepted: boolean }>,
): Map<string, DeskCustomer[]> {
  const m = new Map<string, DeskCustomer[]>();
  for (const r of rows) {
    if (cellToString(r.fields[fm.status]) !== STATUS_RECEIVED) continue;
    const code = cellToString(r.fields[fm.deskCode]);
    if (!code) continue;
    const list = m.get(code) ?? [];
    if (list.length < cap) {
      const name = cellToString(r.fields[fm.name]);
      const ci = name ? checkinByName.get(name) : undefined;
      // STT hiển thị luôn lấy từ Check-in (canonical) — bỏ qua cột "STT" cục bộ
      // của bảng giao dịch (không đảm bảo là số duy nhất theo suốt sự kiện).
      list.push({
        stt: ci?.stt ?? null,
        name,
        productName: ci?.product ?? null,
        paymentNote: ci?.note ?? null,
        deviceAccepted: ci?.deviceAccepted ?? null,
      });
      m.set(code, list);
    }
  }
  return m;
}

export function mapDeskStates(tables: LarkTables, fields: FieldConfig = toFieldConfig()): MappedData {
  const { ds, dsStatus, checkin, txConsult } = fields;
  const checkinByName = indexCheckinByName(tables.checkin, checkin);
  // Danh sách khách tiếp nhận theo bàn Tư vấn (Phương án A).
  const receivedByDesk = indexReceived(tables.txConsult ?? [], txConsult, DESK_CAPACITY.consult, checkinByName);
  const statesById: Record<string, DeskLiveState> = {};

  // Đang được phục vụ ở BẤT KỲ bàn nào ngay lúc này (mọi cụm).
  const activeNames = new Set<string>();
  // Đã từng xuất hiện ở bất kỳ bàn nào (mọi trạng thái) — dùng để loại khỏi "Chờ check-in".
  const everSeenNames = new Set<string>();
  // Ứng viên "chờ điều phối": bàn vừa hoàn tất (Trạng thái gần nhất) và hiện đang rảnh.
  const completedCandidates: WaitingCustomer[] = [];

  for (const cluster of CLUSTERS) {
    const dsFm = ds[cluster];

    for (const rec of tables[DS_KEY[cluster]]) {
      const code = cellToString(rec.fields[dsFm.code]);
      if (!code) continue;

      const currentStatus = cellToString(rec.fields[dsStatus.currentStatus]);
      const statusRecent = cellToString(rec.fields[dsStatus.statusRecent]);
      const customerRecent = cellToString(rec.fields[dsStatus.customerRecent]);
      const partial: Partial<DeskLiveState> = { currentStatus, hasData: true };
      const occupied = deskUiStatus(partial) === 'occupied';

      if (customerRecent) everSeenNames.add(customerRecent);

      // Customer only when the desk is actively serving.
      let customerSTT: string | null = null;
      let customerName: string | null = null;
      let productName: string | null = null;
      let paymentNote: string | null = null;
      let deviceAccepted: boolean | null = null;
      if (occupied) {
        customerName = customerRecent;
        const ci = customerName ? checkinByName.get(customerName) : undefined;
        // STT hiển thị = STT duy nhất của khách trong Check-in (không phải
        // "STT gần nhất (helper)" cục bộ của DS — cái đó chỉ là phụ trợ).
        customerSTT = ci?.stt ?? null;
        productName = ci?.product ?? null;
        paymentNote = ci?.note ?? null;
        deviceAccepted = ci?.deviceAccepted ?? null;
        if (customerName) activeNames.add(customerName);
      }

      // Danh sách khách tiếp nhận: cụm Tư vấn lấy từ txConsult; cụm khác (hoặc
      // khi thiếu txConsult) fallback về "khách gần nhất" nếu đang phục vụ.
      const fallback: DeskCustomer[] =
        occupied && (customerName || customerSTT)
          ? [{ stt: customerSTT, name: customerName, productName, paymentNote, deviceAccepted }]
          : [];
      const receivedCustomers: DeskCustomer[] =
        cluster === 'consult' ? (receivedByDesk.get(code) ?? fallback) : fallback;
      if (cluster === 'consult') {
        for (const c of receivedCustomers) if (c.name) activeNames.add(c.name);
      }

      // Bàn vừa hoàn tất 1 khách và hiện rảnh → ứng viên "chờ điều phối".
      if (!occupied && statusRecent === STATUS_COMPLETED && customerRecent) {
        const ci = checkinByName.get(customerRecent);
        completedCandidates.push({
          stt: ci?.stt ?? null,
          name: customerRecent,
          productName: ci?.product ?? null,
          paymentNote: ci?.note ?? null,
          deviceAccepted: ci?.deviceAccepted ?? null,
          fromCluster: cluster,
        });
      }

      statesById[code] = {
        staffName: cellToString(rec.fields[dsFm.staff]),
        received: cellToNumber(rec.fields[dsFm.received]),
        completed: cellToNumber(rec.fields[dsFm.completed]),
        // Guard against spreadsheet formula artifacts (e.g. -1).
        waiting: Math.max(0, cellToNumber(rec.fields[dsFm.waiting])),
        currentStatus,
        isOccupied: occupied,
        hasData: true,
        customerSTT,
        customerName,
        productName,
        paymentNote,
        deviceAccepted,
        receivedCustomers,
      };
    }
  }

  // "Chờ điều phối": hoàn tất 1 khâu nhưng chưa đang được phục vụ ở đâu khác
  // (đã dispatch rồi thì loại; 1 khách chỉ hiện 1 lần dù hoàn tất ở nhiều bàn).
  const dispatchSeen = new Set<string>();
  const waitingDispatch: WaitingCustomer[] = [];
  for (const cand of completedCandidates) {
    if (!cand.name || activeNames.has(cand.name) || dispatchSeen.has(cand.name)) continue;
    dispatchSeen.add(cand.name);
    waitingDispatch.push(cand);
  }

  // "Chờ check-in": đã check-in (có STT) nhưng chưa từng xuất hiện ở bàn nào.
  const waitingCheckin: WaitingCustomer[] = [];
  for (const r of tables.checkin) {
    const name = cellToString(r.fields[checkin.name]);
    if (!name || everSeenNames.has(name) || activeNames.has(name)) continue;
    waitingCheckin.push({
      stt: cellToString(r.fields[checkin.stt]),
      name,
      productName: cellToString(r.fields[checkin.product]),
      paymentNote: cellToString(r.fields[checkin.note]),
      deviceAccepted: cellToBool(r.fields[checkin.deviceAccepted]),
    });
  }

  const totalCheckIn = new Set(
    tables.checkin
      .map((r) => cellToString(r.fields[checkin.stt]))
      .filter((s): s is string => Boolean(s)),
  ).size;

  // "Danh sách đơn hàng" — total registered (row count).
  const totalRegistered = tables.orders?.length ?? 0;

  return { statesById, totalCheckIn, totalRegistered, waitingCheckin, waitingDispatch };
}
