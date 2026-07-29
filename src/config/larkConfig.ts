/**
 * larkConfig — types + DEFAULT column maps / connection for the Lark integration.
 *
 * These are the compile-time defaults (matching the `NPI_Testing_2.2` workbook,
 * seeded from `VITE_*` env). At runtime they can be overridden from the in-app
 * Settings page — see `larkSettings.ts`, which is what the app actually reads.
 */
import type { ClusterKey } from '@/types/desk';
import type { TableKey } from '@/services/larkTypes';

const env = import.meta.env;

export const DEFAULT_HOST =
  (env.VITE_LARK_HOST as string | undefined)?.replace(/\/+$/, '') ?? 'https://open.larksuite.com';

/** Column names in a DS registry table → domain. */
export interface DsFieldMap {
  code: string;
  staff: string;
  received: string;
  completed: string;
  waiting: string;
}

/** DS "Status" block columns (same in all 3 DS tables). */
export interface DsStatusFieldMap {
  sttRecent: string;
  statusRecent: string;
  customerRecent: string;
  currentStatus: string;
}

/** Check-in table columns. */
export interface CheckinFieldMap {
  stt: string;
  name: string;
  product: string;
  note: string;
  deviceAccepted: string;
}

/** Transaction table columns (danh sách khách tiếp nhận theo bàn). */
export interface TxFieldMap {
  deskCode: string; // cột mã bàn (vd TV_MãNV)
  status: string; // cột trạng thái
  stt: string; // STT khách
  name: string; // tên khách
}

/** All field maps bundled — what the mapper needs. */
export interface FieldConfig {
  ds: Record<ClusterKey, DsFieldMap>;
  dsStatus: DsStatusFieldMap;
  checkin: CheckinFieldMap;
  txConsult: TxFieldMap;
}

export const DEFAULT_DS_FIELDS: Record<ClusterKey, DsFieldMap> = {
  tradein: { code: 'STT bàn', staff: 'Nhân viên', received: 'SL TC tiếp nhận', completed: 'SL TC hoàn tất', waiting: 'SL Khách chờ' },
  consult: { code: 'STT bàn', staff: 'NV Tư vấn', received: 'Sl TV tiếp nhận', completed: 'Sl TV hoàn tất', waiting: 'Sl khách chờ' },
  backup: { code: 'STT bàn', staff: 'Nhân viên', received: 'SL BK tiếp nhận', completed: 'SL BK hoàn tất', waiting: 'SL Khách chờ' },
};

export const DEFAULT_DS_STATUS_FIELDS: DsStatusFieldMap = {
  sttRecent: 'STT gần nhất (helper)',
  statusRecent: 'Trạng thái gần nhất (helper)',
  customerRecent: 'Khách gần nhất (helper)',
  currentStatus: 'Trạng thái hiện tại (kết quả chính)',
};

export const DEFAULT_CHECKIN_FIELDS: CheckinFieldMap = {
  stt: 'STT',
  name: 'Họ và tên',
  product: 'SP 1',
  note: 'Note UDTT',
  deviceAccepted: 'Đã nghiệm thu thiết bị',
};

export const DEFAULT_TX_CONSULT_FIELDS: TxFieldMap = {
  deskCode: 'TV_MãNV',
  status: 'Trạng thái',
  stt: 'STT',
  name: 'Họ và tên',
};

/** Giá trị `Trạng thái` (bảng giao dịch) nghĩa là "đã tiếp nhận". */
export const STATUS_RECEIVED = 'Tiếp nhận';

/** Giá trị `Trạng thái gần nhất` (DS) nghĩa là bàn vừa hoàn tất 1 khách. */
export const STATUS_COMPLETED = 'Hoàn tất';

/**
 * `Trạng thái hiện tại` → desk UI status.
 *   "Đang tư vấn" → occupied · "Rảnh" → available · else → idle.
 */
export const STATUS_OCCUPIED_HINT = 'đang';
export const STATUS_FREE_HINT = 'rảnh';

/** Bitable table ids, one per logical table (direct mode). */
export type TableIdMap = Record<TableKey, string | undefined>;

/** The connection config the client/service consume. */
export interface LarkRuntimeConfig {
  useMock: boolean;
  apiUrl?: string;
  host: string;
  appToken?: string;
  accessToken?: string;
  tableIds: TableIdMap;
  pollMs: number;
}

/** Env-seeded defaults for first run (before the user opens Settings). */
export const ENV_DEFAULTS = {
  apiUrl: (env.VITE_LARK_API_URL as string | undefined) || '',
  host: DEFAULT_HOST,
  appToken: (env.VITE_LARK_APP_TOKEN as string | undefined) || '',
  accessToken: (env.VITE_LARK_ACCESS_TOKEN as string | undefined) || '',
  pollMs: Number(env.VITE_LARK_POLL_MS) > 0 ? Number(env.VITE_LARK_POLL_MS) : 30000,
  useMock:
    env.VITE_LARK_USE_MOCK === 'true' || (!env.VITE_LARK_API_URL && !env.VITE_LARK_APP_TOKEN),
  tableIds: {
    dsTradein: (env.VITE_LARK_TABLE_DS_TRADEIN as string | undefined) || '',
    dsConsult: (env.VITE_LARK_TABLE_DS_CONSULT as string | undefined) || '',
    dsBackup: (env.VITE_LARK_TABLE_DS_BACKUP as string | undefined) || '',
    checkin: (env.VITE_LARK_TABLE_CHECKIN as string | undefined) || '',
    orders: (env.VITE_LARK_TABLE_ORDERS as string | undefined) || '',
    txConsult: (env.VITE_LARK_TABLE_TX_CONSULT as string | undefined) || '',
  } as Record<TableKey, string>,
} as const;
