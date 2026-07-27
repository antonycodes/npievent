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
import { STATUS_RECEIVED, type CheckinFieldMap, type FieldConfig, type TxFieldMap } from '@/config/larkConfig';
import { toFieldConfig } from '@/config/larkSettings';
import {
  DESK_CAPACITY,
  deskUiStatus,
  type ClusterKey,
  type DeskCustomer,
  type DeskLiveState,
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

const CLUSTERS: ClusterKey[] = ['tradein', 'consult', 'backup'];
const DS_KEY = { tradein: 'dsTradein', consult: 'dsConsult', backup: 'dsBackup' } as const;

export interface MappedData {
  statesById: Record<string, DeskLiveState>;
  totalCheckIn: number;
  totalRegistered: number;
}

/** Index Check-in rows by customer name → { product, note }. */
function indexCheckinByName(
  rows: LarkRecord[],
  fm: CheckinFieldMap,
): Map<string, { product: string | null; note: string | null }> {
  const m = new Map<string, { product: string | null; note: string | null }>();
  for (const r of rows) {
    const name = cellToString(r.fields[fm.name]);
    if (name) {
      m.set(name, {
        product: cellToString(r.fields[fm.product]),
        note: cellToString(r.fields[fm.note]),
      });
    }
  }
  return m;
}

/** Nhóm khách "Tiếp nhận" theo mã bàn (cắt tối đa theo capacity). */
function indexReceived(rows: LarkRecord[], fm: TxFieldMap, cap: number): Map<string, DeskCustomer[]> {
  const m = new Map<string, DeskCustomer[]>();
  for (const r of rows) {
    if (cellToString(r.fields[fm.status]) !== STATUS_RECEIVED) continue;
    const code = cellToString(r.fields[fm.deskCode]);
    if (!code) continue;
    const list = m.get(code) ?? [];
    if (list.length < cap) {
      list.push({ stt: cellToString(r.fields[fm.stt]), name: cellToString(r.fields[fm.name]) });
      m.set(code, list);
    }
  }
  return m;
}

export function mapDeskStates(tables: LarkTables, fields: FieldConfig = toFieldConfig()): MappedData {
  const { ds, dsStatus, checkin, txConsult } = fields;
  const checkinByName = indexCheckinByName(tables.checkin, checkin);
  // Danh sách khách tiếp nhận theo bàn Tư vấn (Phương án A).
  const receivedByDesk = indexReceived(tables.txConsult ?? [], txConsult, DESK_CAPACITY.consult);
  const statesById: Record<string, DeskLiveState> = {};

  for (const cluster of CLUSTERS) {
    const dsFm = ds[cluster];

    for (const rec of tables[DS_KEY[cluster]]) {
      const code = cellToString(rec.fields[dsFm.code]);
      if (!code) continue;

      const currentStatus = cellToString(rec.fields[dsStatus.currentStatus]);
      const partial: Partial<DeskLiveState> = { currentStatus, hasData: true };
      const occupied = deskUiStatus(partial) === 'occupied';

      // Customer only when the desk is actively serving.
      let customerSTT: string | null = null;
      let customerName: string | null = null;
      let productName: string | null = null;
      let paymentNote: string | null = null;
      if (occupied) {
        customerSTT = cellToString(rec.fields[dsStatus.sttRecent]);
        customerName = cellToString(rec.fields[dsStatus.customerRecent]);
        const ci = customerName ? checkinByName.get(customerName) : undefined;
        productName = ci?.product ?? null;
        paymentNote = ci?.note ?? null;
      }

      // Danh sách khách tiếp nhận: cụm Tư vấn lấy từ txConsult; cụm khác (hoặc
      // khi thiếu txConsult) fallback về "khách gần nhất" nếu đang phục vụ.
      const fallback: DeskCustomer[] =
        occupied && (customerName || customerSTT) ? [{ stt: customerSTT, name: customerName }] : [];
      const receivedCustomers: DeskCustomer[] =
        cluster === 'consult' ? (receivedByDesk.get(code) ?? fallback) : fallback;

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
        receivedCustomers,
      };
    }
  }

  const totalCheckIn = new Set(
    tables.checkin
      .map((r) => cellToString(r.fields[checkin.stt]))
      .filter((s): s is string => Boolean(s)),
  ).size;

  // "Danh sách đơn hàng" — total registered (row count).
  const totalRegistered = tables.orders?.length ?? 0;

  return { statesById, totalCheckIn, totalRegistered };
}
