/**
 * Lark Base (Bitable) wire-format types.
 *
 * The list-records endpoint returns
 *   { code, msg, data: { items: LarkRecord[], has_more, page_token, total } }
 * Each record has a `record_id` and a `fields` object keyed by the column's
 * display name. Cell values vary by field type (string, number, boolean, or a
 * rich-text segment array) — the mapper coerces them.
 */
export interface LarkTextSegment {
  text: string;
  type?: string;
}

export type LarkCellValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | LarkTextSegment[];

export interface LarkRecord {
  record_id: string;
  fields: Record<string, LarkCellValue>;
}

export interface LarkListResponse {
  code: number;
  msg: string;
  data: {
    items: LarkRecord[];
    has_more: boolean;
    page_token?: string;
    total: number;
  };
}

/**
 * The five logical tables the dashboard reads: the 3 DS registries (status +
 * staff + latest customer), Check in (checked-in customers), and Orders
 * ("Danh sách đơn hàng" — total registered, for the check-in funnel).
 */
export type TableKey =
  | 'dsTradein'
  | 'dsConsult'
  | 'dsBackup'
  | 'checkin'
  | 'orders'
  | 'txConsult'; // bảng giao dịch Tư vấn — danh sách khách "Tiếp nhận" theo bàn

/** Raw records for every table, as returned by the service. */
export type LarkTables = Record<TableKey, LarkRecord[]>;
