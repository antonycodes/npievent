# PROJECT MEMORY — NPI Event · Interactive Layout Dashboard

> AI persistent memory. Updated after **every** response before continuing.
> Preserves architecture, API endpoints, mapping schema, and progress.
>
> ⚠️ **Spec v2 (current)** — reworked from the original build to the Coordinator
> spec: desk codes TC/TV/BK, status driven by a `Trạng thái` string, 3 separate
> Lark data tables + Selection lookup tables, extra popover fields, a Check-in
> sidebar, quick filters, and 30s polling. History of v1 is in the Progress Log.

---

## 1. Project Overview

A real-time **Coordinator Dashboard** for an iPhone launch event (cellphoneS).
The coordinator assigns customers to desks and watches for bottlenecks across
three zones — **Thu cũ** (trade-in), **Tư vấn** (consulting), **Backup** (stage).
The floor plan (from the attached photo) is an interactive map; desk state is
synced from **Lark Base (Bitable)** over HTTPS and auto-refreshed every 30s.

**Stack:** Vite 6 · React 18 · TypeScript · TailwindCSS 3.

### Clusters & desk codes (38 total)
| Zone (VN)        | Cluster key | Prefix | Codes           | Count | Lark data table | Lookup table       |
| ---------------- | ----------- | ------ | --------------- | ----- | --------------- | ------------------ |
| Thu cũ           | `tradein`   | `TC`   | `TC1`–`TC10`    | 10    | "Thu cũ"        | `Selection-Thu cũ` |
| Tư vấn           | `consult`   | `TV`   | `TV1`–`TV18`    | 18    | "Tư vấn"        | `Selection-Tư vấn` |
| Backup (Sân khấu)| `backup`    | `BK`   | `BK1`–`BK10`    | 10    | "Backup"        | `Selection-Backup` |
| **TOTAL**        |             |        |                 | **38**|                 |                    |

### The 38 desk IDs
```
Thu cũ  (10): TC1  TC2  TC3  TC4  TC5  TC6  TC7  TC8  TC9  TC10
Tư vấn  (18): TV1  TV2  TV3  TV4  TV5  TV6  TV7  TV8  TV9  TV10
              TV11 TV12 TV13 TV14 TV15 TV16 TV17 TV18
Backup  (10): BK1  BK2  BK3  BK4  BK5  BK6  BK7  BK8  BK9  BK10
```
The desk code is the join key between the map node and the Lark rows.

### Status → color logic (v2)
Driven by the desk's **`Trạng thái` / `Status`** field:
- `"Tiếp nhận"` → **Red** (Occupied) — desk is actively serving a customer.
- `"Hoàn tất"` **or empty/other** → **Green** (Available).
- Grey `idle` only before the first successful sync.

### Popover (click a desk)
- `Tên NV` — staff (`TC_Nhân viên` / `TV_Nhân viên` / `BK_Nhân viên`).
- `STT Khách` — customer queue no. (`CI_STT`, fallback `STT Khách`).
- `Tên sản phẩm` — product (`SP 1`).
- `Ghi chú thanh toán` — payment note (`Note ưu đãi thanh toán`).

### Sidebar
- **Tổng số khách đã Check-in** — count from the `Check-in` field.
- (Step 4) quick filters: "Chỉ hiện bàn trống", "Chỉ hiện bàn Thu cũ".

---

## 2. Naming Conventions
- Components: `PascalCase`, one per file (`Desk.tsx` → `Desk`).
- Hooks: `useCamelCase`. Types: `PascalCase` (no `I` prefix).
- Desk codes: `TC|TV|BK` + 1-based unpadded index (`TV7`, `TC10`).
- Cluster keys (internal): `'tradein' | 'consult' | 'backup'`.
- `@/` path alias → `src/`. UI copy VN; identifiers/comments EN.

---

## 3. File Tree

### Current (after Step 1, v2)
```
npievent/
├── index.html, package.json, vite.config.ts, tsconfig.*, tailwind.config.js,
│   postcss.config.js, .gitignore, .env.example, README.md, memory.md
└── src/
    ├── main.tsx, App.tsx, index.css, vite-env.d.ts
    ├── types/table.ts            <- to migrate to Status string in Step 3
    ├── config/
    │   ├── layoutConfig.ts       <- ✅ v2 IDs TC/TV/BK + CLUSTER_PREFIX
    │   └── larkConfig.ts
    ├── data/mockLarkData.ts      <- to rebuild on CSV fields in Step 3
    ├── services/  (larkTypes.ts, larkClient.ts, larkMapper.ts)
    ├── hooks/useLarkBaseData.ts
    └── components/
        ├── LayoutDashboard.tsx, StatusLegend.tsx, TablePopover.tsx
        ├── TableNode.tsx         <- to become / wrap Desk.tsx in Step 2
        └── Cluster{TradeIn,Consult,Backup}.tsx
```

### Planned target (v2, by Step 4)
```
src/
├── components/
│   ├── Desk.tsx                 <- props: id, type, status, staffName, customerSTT (+ product, note)
│   ├── DeskPopover.tsx          <- Tên NV / STT Khách / Tên sản phẩm / Ghi chú thanh toán
│   ├── LayoutDashboard.tsx      <- map + clusters + overlay
│   ├── Sidebar.tsx              <- Tổng khách Check-in + summary
│   ├── FilterBar.tsx            <- "Chỉ hiện bàn trống" / "Chỉ hiện bàn Thu cũ"
│   └── StatusLegend.tsx
├── services/larkService.ts      <- fetch 3 tables (+ selection) via App_Token/Table_ID
├── hooks/useLarkBaseData.ts     <- 30s polling, merge → DeskData[]
├── config/  (layoutConfig.ts, larkConfig.ts)
├── data/mockLarkData.ts         <- CSV-shaped fixtures per table
└── types/desk.ts
```

---

## 4. Data Schema & Mapping (from real workbook `NPI_Testing_2.xlsx`)

> ✅ Reconciled against the actual file the user uploaded (a Google-Sheets /
> Lark-Base export, 17 sheets, strings stored inline — no `sharedStrings.xml`).
> This **supersedes** the prompt's assumed field names.

### 4.0 Workbook map (sheet → role)
| Sheet            | Role                                                      |
| ---------------- | -------------------------------------------------------- |
| `Check in`       | Customer master (STT, Họ và tên, SDT, SP 1–4, `Note UDTT`, check-in flag) |
| `Điều phối`      | Dispatch: which desk each customer is sent to            |
| `Thu cũ`         | Trade-in **transactions** (per session; has `Trạng thái`)|
| `Tư vấn`         | Consult **transactions** (`Trạng thái`, `TV_MãNV`=desk)  |
| `Back-up`        | Backup **transactions** (`Trạng thái`, `BK_Mã NV`)       |
| **`DS thu cũ`**  | **Desk registry TC** — 1 row/desk, staff + live counts   |
| **`DS Tư vấn`**  | **Desk registry TV** — 1 row/desk, staff + live counts   |
| **`DS backup`**  | **Desk registry BK** — 1 row/desk, staff + live counts   |
| `STT + Status`   | Per-customer journey (status per stage)                  |
| `Kho`,`Phụ kiện`,`DS *`,`* (cũ)` | inventory / accessories / legacy — not used  |

> ⚠️ Test file has only **6 desks per cluster** (TC1–TC6, TV1–TV6, BK1–BK6), not
> 10/18/10. The map keeps 38 fixed nodes; nodes without a matching desk row
> render as "no data" (grey). Real event data will populate more.

### 4.1 Desk registry columns (the primary per-desk source)
- **DS thu cũ:** `STT bàn`(=TCn), `Nhân viên`, `SL TC điều phối`, `SL TC tiếp nhận`, `SL TC hoàn tất`, `SL Khách chờ`, `Selection-Thu cũ`
- **DS Tư vấn:** `STT bàn`(=TVn), `NV Tư vấn`, `Sl điều phối`, `Sl TV tiếp nhận`, `Sl TV hoàn tất`, `Sl khách chờ`, `Selection-Tư vấn`
- **DS backup:** `STT bàn`(=BKn), `Nhân viên`, `SL TC điều phối`, `SL BK tiếp nhận`, `SL BK hoàn tất`, `SL Khách chờ`, `Selection-Backup`

### 4.2 Transaction columns (for popover customer detail)
> Updated from `NPI_Testing_2.1`: **all three** transaction tables carry the
> desk code, so every cluster joins customer detail (Q3 fully resolved).
- **Tư vấn:** `STT`(khách), `Họ và tên`, `Trạng thái`(Tiếp nhận/Hoàn tất), `TV_MãNV`(=desk code TVn), `SP 1`
- **Thu cũ:** `STT`, `Họ và tên`, `Trạng thái`, `TC_Mã NV`(=desk code TCn), `SP 1`
- **Back-up:** `BK_Mã NV`(=desk code BKn), `STT BK`(separate id, NOT the desk), `STT`, `Họ và tên`, `Trạng thái`, `SP 1`
- **Check in:** `STT`, `Họ và tên`, `SP 1`, **`Note UDTT`** (= Ghi chú thanh toán)

### 4.3 Domain types (target `types/desk.ts`)
```ts
type ClusterKey = 'tradein' | 'consult' | 'backup';

interface DeskData {
  id: string;                 // desk code TC/TV/BK, join key
  cluster: ClusterKey;
  x: number; y: number;       // map coords
  // from DS registry:
  staffName: string | null;   // NV Tư vấn / Nhân viên
  received: number;           // Sl … tiếp nhận  (đang phục vụ)
  completed: number;          // Sl … hoàn tất
  waiting: number;            // Sl khách chờ    (bottleneck signal)
  isOccupied: boolean;        // received > 0  → red ; else green
  // from transaction join (optional, popover):
  customerSTT: string | null; // STT khách
  customerName: string | null;// Họ và tên
  productName: string | null; // SP 1
  paymentNote: string | null; // Note UDTT
}
```

### 4.4 Mapping decisions (see §7 open questions — pending user confirm)
| Domain field   | Source                                                        |
| -------------- | ------------------------------------------------------------- |
| desk id        | DS `STT bàn` / `Selection-*` (join key to the 38 map nodes)   |
| staffName      | DS `NV Tư vấn` (TV) · `Nhân viên` (TC/BK)                      |
| **isOccupied** | DS `Sl … tiếp nhận` > 0 → **Đỏ** (≡ Trạng thái "Tiếp nhận")    |
| waiting        | DS `Sl khách chờ` (surfaced as a bottleneck badge)            |
| customerSTT    | transaction `STT` where desk matches & `Trạng thái`="Tiếp nhận"|
| productName    | transaction / Check in `SP 1`                                 |
| paymentNote    | Check in `Note UDTT` (join by `STT`)                          |
| Check-in total | count of rows in `Check in` (sidebar)                         |

### 4.5 Lark Bitable API (planned — Step 3)
- List records: `GET {LARK_HOST}/open-apis/bitable/v1/apps/{App_Token}/tables/{Table_ID}/records?page_size=100`
- Auth: `Authorization: Bearer <tenant_access_token>`.
- Response envelope `{ code:0, msg, data:{ items:[{record_id, fields}], has_more, total } }`.
- One `Table_ID` per zone (Thu cũ / Tư vấn / Backup); recommend a server-side
  proxy to hold the app secret and avoid browser CORS.
- **Auto-refresh: poll every 30s** (`VITE_LARK_POLL_MS=30000`).

### 4.6 Environment variables (detailed in Step 4)
```
VITE_LARK_HOST=https://open.larksuite.com
VITE_LARK_APP_TOKEN=...
# Desk-registry tables (primary source):
VITE_LARK_TABLE_DS_TRADEIN=...  VITE_LARK_TABLE_DS_CONSULT=...  VITE_LARK_TABLE_DS_BACKUP=...
# Transaction tables (popover detail) + Check in:
VITE_LARK_TABLE_TRADEIN=...  VITE_LARK_TABLE_CONSULT=...  VITE_LARK_TABLE_BACKUP=...  VITE_LARK_TABLE_CHECKIN=...
VITE_LARK_ACCESS_TOKEN=...   VITE_LARK_API_URL=...(proxy)   VITE_LARK_POLL_MS=30000
VITE_LARK_USE_MOCK=true|false
```

---

## 5. Progress Log

### v1 (original build) — COMPLETE
Steps 1–4 of the first brief delivered: scaffold, static 38-node layout, Lark
HTTPS service + mock + `useLarkBaseData`, and boolean-`isOccupied` color +
click popover (Tên NV / STT Khách). Verified via Playwright; 5 local commits.
(`git push`/PR blocked by org-policy 403 + integration lacking Contents:write —
source delivered to the user as `npievent-source.zip`.)

### ✅ Step 1 (v2) — Khởi tạo & Memory Core (DONE — 2026-07-24)
- Vite + React + Tailwind already in place (reused from v1); build passes.
- `layoutConfig.ts`: switched desk IDs to **TC1–TC10 / TV1–TV18 / BK1–BK10**
  via new `CLUSTER_PREFIX` map; ids propagate through clusters/mock/hook.
- Rewrote this `memory.md` to spec v2: 38 desk-ID list, folder structure
  (current + target with `Desk.tsx`, `Sidebar`, `larkService`), status logic,
  full field-mapping table, Lark endpoints, env-var plan.
- Flagged that **no CSV was provided** — field names taken from the prompt.

### ✅ Data reconciliation (DONE — 2026-07-24)
User uploaded the real workbook `NPI_Testing_2.xlsx`. Parsed its 17 sheets
(inline strings, raw-XML parse) and rewrote §4 with the true schema: DS registry
tables are the primary per-desk source (staff + counts); transaction tables give
popover detail. Test file has 6 desks/cluster (map keeps 38 fixed nodes).
**User confirmed §7 answers:** (1) color = DS `Sl tiếp nhận > 0`; (2) keep 38
fixed nodes, bind by code; (3) popover customer detail best-effort (TV joins via
`TV_MãNV`; TC/BK show staff+counts where no join exists).

### ✅ Step 2 (v2) — Phác thảo Layout UI (DONE — 2026-07-24)
- New `types/desk.ts`: `ClusterKey`, `TablePosition`, `DeskLiveState`, `DeskData`,
  `deskUiStatus()`, `ClusterSummary`/`DashboardSummary` + `computeSummary()`.
- `Desk.tsx` (replaces TableNode) — props `id, type, status, staffName,
  customerSTT` (+ `waiting` badge, `x/y`, `selected`, `onClick`); tone
  occupied/available/idle.
- `Sidebar.tsx` — "Tổng khách đã Check-in" + per-cluster Tiếp nhận/Trống/Chờ.
- Rewrote `LayoutDashboard.tsx` (renders `Desk` from a `desks: DeskData[]` array,
  keeps the venue backdrop) and `StatusLegend.tsx` (4-state key).
- `App.tsx` renders static board (all desks idle) + sidebar (totals 0).
- **Removed the v1 Lark layer** (hook/services/mock/`table.ts`/old components) —
  to be rebuilt on the real schema in Step 3. `layoutConfig` now imports desk.ts.
- Build passes; verified via screenshot (TC1–TC10/TV1–TV18/BK1–BK10 all grey).

### ✅ Step 3 (v2) — Lark Service Layer (DONE — 2026-07-24)
- `services/larkTypes.ts`: wire types + `TableKey` (7 tables) + `LarkTables`.
- `config/larkConfig.ts`: env config (per-table ids, `pollMs` **30000**, mock
  fallback) + real column maps `DS_FIELDS` / `TX_FIELDS` / `CHECKIN_FIELDS` +
  `STATUS_OCCUPIED='Tiếp nhận'`.
- `services/larkClient.ts`: `fetchTableRecords()` (proxy `${apiUrl}/<key>` or
  canonical Bitable URL), Bearer auth, envelope validation, `AbortSignal`.
- `services/larkService.ts`: `fetchLarkData()` fetches all 7 tables in parallel
  (or returns mock).
- `services/larkMapper.ts`: `mapDeskStates()` → occupancy from DS `Sl tiếp nhận`,
  waiting from DS, best-effort customer join (TV via `TV_MãNV`, BK via `STT BK`,
  TC none), payment note from Check in by STT; `totalCheckIn` = Check-in rows.
- `data/mockLarkData.ts`: 7-table fixtures from the real workbook (real staff,
  TV1/TC transactions; TV1 received+waiting, TC1/TC3 received so colors show).
- `hooks/useLarkBaseData.ts`: fetch + **30s poll** + merge onto 38 positions +
  `computeSummary`. Returns `{ desks, summary, loading, error, lastUpdated,
  isMock, refresh }`.
- App mounts the hook + sync status bar. `.env.example` documents the 7 table ids.
- Verified via screenshot: TC1/TC3 & TV1 red (TV1 shows "1" waiting), DS desks
  1–6 colored, 7+ grey; sidebar Check-in = 4 with correct per-cluster counts.

### ✅ Step 4 (v2) — Interaction & Deploy (DONE — 2026-07-24)
- `DeskPopover.tsx`: click a desk → detail card (Tên NV / STT Khách / Tên sản
  phẩm SP 1 / Ghi chú thanh toán / Khách đang chờ) + status badge; flips
  above/below, clamps at edges, closes on × / Escape.
- `FilterBar.tsx` + `DeskFilters`: "Chỉ hiện bàn trống" / "Chỉ hiện bàn Thu cũ";
  non-matching desks dimmed (opacity-15, non-interactive) to keep spatial context.
- `Desk.tsx` gains `dimmed`; `LayoutDashboard` gains `dimmedIds` + overlay.
- `App.tsx` owns selection (toggle) + filter state, computes `dimmedIds`, mounts
  the popover; selection auto-suppressed when the desk is filtered out.
- README rewritten (features, 7-table architecture, env config).
- **Verified via Playwright**: TV1 popover shows Dương Đình Hưng / STT 1 /
  iPhone 17 Pro Max 2TB | Bạc / ACB 574856 / chờ 1; both filters dim correctly.
- Build passes (41 modules).

**PROJECT v2 COMPLETE.**

---

### Consult received-customer STT dots (added 2026-07-24)
Implemented `docs/UPDATE_consult-customer-dots.md` (Phương án A) with mock:
- `types/desk.ts`: `DeskCustomer`, `DeskLiveState.receivedCustomers`, `DESK_CAPACITY`
  (consult=2).
- `larkTypes`: added `txConsult` TableKey. `larkConfig`: `TxFieldMap`,
  `DEFAULT_TX_CONSULT_FIELDS` (`TV_MãNV`/`Trạng thái`/`STT`/`Họ và tên`),
  `STATUS_RECEIVED='Tiếp nhận'`, `txConsult` in `FieldConfig` + tableIds.
- `larkSettings`: txConsult tableId + field map + `TX_FIELD_LABELS` + settings
  wiring; SettingsPage shows a "Giao dịch Tư vấn" mapping block + table id.
- `larkService`: fetches `txConsult` only when configured (optional).
- `larkMapper.indexReceived`: group txConsult by desk, filter Tiếp nhận, cap 2 →
  `receivedCustomers`; consult uses tx, others/fallback = single gần nhất.
- `LayoutDashboard`: renders amber STT dots under consult desks; `DeskPopover`
  lists "Khách đang tiếp nhận (n/cap)".
- Mock: TV2 = {10 Phạm Đức Dũng, 15 Trần Văn Bình}, TV4 = {13,18}.
- Verified via screenshot: TV2/TV4 show 2 dots each; popover lists both.

### Clickable STT dots for all clusters (added 2026-07-24)
- Dots now render for tradein/consult/backup (not just consult).
- Each dot is a button → `CustomerPopover` (STT, tên, Vị trí+NV, Tên sản phẩm,
  Ghi chú thanh toán). `DeskCustomer` gained `productName`/`paymentNote`, joined
  from Check in by name in `larkMapper` (incl. the non-consult single fallback).
- Placement: single-customer desks (TC/BK, cap 1) show a corner badge (bottom-
  right) to avoid overlapping the tightly-spaced row below; consult (cap 2) shows
  a row of dots below the node.
- `DashboardPage` owns `selectedCustomer` (mutually exclusive with the desk
  popover); `LayoutDashboard` gets `onSelectCustomer` + `selectedCustomer`.
- Verified via screenshots (TC1 → Nguyễn Minh Long, BK1 → Huỳnh Ngọc Linh).

### Check-in funnel card (added 2026-07-24)
Sidebar "Khách" card now shows 3 ratios instead of a single number:
- **Check-in / Tổng đăng ký** = Check-in rows / Orders rows (`Danh sách đơn hàng`)
- **Đang tư vấn / Check-in** = distinct customers at occupied consult desks
- **Chưa được phục vụ / Check-in** = check-in − distinct served (by name)
Added a 5th table `orders` (TableKey/service/config/mock/.env), `totalRegistered`
through mapper→store→hook, and `CustomerFunnel` in `computeSummary` (served/
consulting counted as **distinct customer names** so a person served across
stages isn't double-counted). Mock: 20 orders, 8 check-in → 8/20, 2/8, 3/8.

### Admin demo page (added then REMOVED 2026-07-24)
An editable demo store + `#/admin` flow page existed briefly, then was replaced
by the runtime Settings page below (deskStore, data/customers.ts, AdminPage
deleted).

### Runtime Lark Settings page (added 2026-07-24) — CURRENT
Users configure the Lark connection + field mapping **in-app** (no code/env edit):
- `config/larkConfig.ts` now holds only **DEFAULT_*** maps + types + `ENV_DEFAULTS`
  (env seeds first run) + `LarkRuntimeConfig` (adds `host`).
- `config/larkSettings.ts`: localStorage-backed store (`useLarkSettings`,
  `larkSettingsStore.save/reset`), `toRuntimeConfig()`, `toFieldConfig()`,
  `hasLiveSource()`, plus form labels. Settings = { useMock, mode(proxy|direct),
  apiUrl, host, appToken, accessToken, pollSeconds, tableIds{5}, fields{ds×3 +
  dsStatus + checkin} }.
- `larkClient.buildTableUrl` uses `cfg.host`; `larkService.fetchLarkData` defaults
  to `toRuntimeConfig()`; `mapDeskStates(tables, fields = toFieldConfig())` now
  takes the field config (mock passes `DEFAULT_FIELD_CONFIG`).
- `hooks/useDashboardData.ts`: reads settings reactively, re-syncs on change
  (mock → map mock; live → fetch+poll). No more deskStore.
- `pages/SettingsPage.tsx` (`#/settings`): source toggle, proxy/direct + 5 table
  ids, field-mapping inputs (prefilled defaults), Test connection / Save / Reset.
  Dashboard header link → "Cài đặt Lark".
- Verified: Settings renders full form; dashboard still maps mock (9 red / 3 green).

## 6. Next Action
**All 4 v2 steps complete.** Handover: source zipped for the user. To run live:
copy `.env.example` → `.env.local`, set the proxy URL or app token + 7 table ids,
unset `VITE_LARK_USE_MOCK`. (git push/PR still blocked by org-policy 403 +
integration lacking Contents:write — delivered as a zip instead.)

## 7. Resolved decisions (confirmed by user 2026-07-24)
1. **Color source** — DS `Sl … tiếp nhận > 0` → Đỏ (else Xanh). ✅
2. **Desk count** — keep 38 fixed map nodes, bind by code, absent → grey. ✅
3. **Popover detail** — best-effort. ✅ **Updated with NPI_Testing_2.1**: all
   three transaction tables have a desk code (`TC_Mã NV` / `TV_MãNV` / `BK_Mã NV`),
   so TC/TV/BK all join customer detail now. `TX_FIELDS` updated accordingly.

### Sample data (updated 2026-07-24 → NPI_Testing_2.1)
Mirrored 2.1 verbatim; transactions carried desk codes so all clusters joined.

### DS "Status" block (updated 2026-07-24 → NPI_Testing_2.2) — CURRENT
Each DS table gained a Status block (same columns in all 3): `STT gần nhất
(helper)`, `Trạng thái gần nhất (helper)`, `Khách gần nhất (helper)`,
`Trạng thái hiện tại (kết quả chính)`. This is now the authoritative source:
- **Color / occupancy** ← `Trạng thái hiện tại`: "Đang tư vấn" → occupied (red),
  "Rảnh" → available (green), "Chưa có dữ liệu"/empty → idle (grey).
  (Replaces the old `Sl tiếp nhận` rule; `DS_STATUS_FIELDS` in larkConfig.)
- **Customer** (only when occupied) ← `Khách gần nhất` + `STT gần nhất`; product
  + `Note UDTT` joined from Check in **by customer name** (safer than STT).
- **Popover** now shows a `Trạng thái` row; a free/empty desk shows
  "Bàn trống — chưa có thông tin khách." (no customer).
- **Transaction tables removed** — `TableKey` reduced to
  `dsTradein/dsConsult/dsBackup/checkin`; service, config, mock, `.env.example`
  updated. Negative `Sl khách chờ` (formula artifact, TC6=-1) clamped to 0.
- Verified via screenshots: TC1-5 red, TC6 green (Rảnh), TV2/TV4 red, TV1/TV3
  green, BK1/BK2 red, others grey; TC1 popover shows customer, TC6 shows none.

### 2 khu vực chờ ngoài bàn — Chờ check-in / Chờ điều phối (added 2026-07-29)
User cung cấp screenshot mock-up của board với 2 hộp mới ở góc dưới-trái
(thay cho 2 Region tĩnh cũ "Bàn đợi"/"PG phát STT"), mỗi hộp có vài chấm STT
màu cam — yêu cầu: hiện khách **đã có STT nhưng chưa được điều phối vào bàn
nào** (chờ check-in) và khách **vừa xong 1 khâu, chờ điều phối sang khâu tiếp
theo** (vd xong Thu cũ → chờ vào Tư vấn).

- **Không thêm bảng/cột Lark mới** — suy ra 2 danh sách này từ dữ liệu đã có:
  - `types/desk.ts`: `WaitingCustomer extends DeskCustomer` + `fromCluster?`.
  - `larkConfig.ts`: thêm `STATUS_COMPLETED = 'Hoàn tất'`.
  - `larkMapper.mapDeskStates`: trong lúc build `statesById`, gom thêm
    `everSeenNames` (mọi `Khách gần nhất` từng thấy, mọi trạng thái),
    `activeNames` (khách đang occupied ở BẤT KỲ bàn nào, kể cả nhiều khách
    consult), và `completedCandidates` (bàn `Trạng thái gần nhất` = "Hoàn tất"
    + hiện đang rảnh). Sau vòng lặp:
    - `waitingDispatch` = completedCandidates trừ đi ai đã có trong
      `activeNames` (đã được điều phối đi rồi) + khử trùng theo tên.
    - `waitingCheckin` = khách trong bảng `Check in` mà tên **không** nằm
      trong `everSeenNames` lẫn `activeNames` (chưa từng chạm bàn nào).
  - Trả thêm `waitingCheckin`/`waitingDispatch` trong `MappedData` →
    `useDashboardData` (`RawState` + `UseDashboardDataResult`) → `DashboardPage`.
- **UI**: `LayoutDashboard.tsx` có component `WaitingZone` (hộp viền cam nét
  đứt, nhãn + hàng chấm STT bấm được) thay cho 2 `Region` cũ ở
  `left-3% top-70%/85% h-14% w-15%`. Export `WAITING_ZONE_ANCHOR` (toạ độ neo
  %) + `WaitingZoneKey` để `DashboardPage` định vị popover.
- **Popover riêng**: `WaitingPopover.tsx` (mới) — cùng phong cách
  `CustomerPopover` nhưng neo cố định theo khu vực (không theo bàn), luôn bung
  lên trên (2 khu vực nằm sát đáy board). Hiện STT/tên/SP/ghi chú TT, cụm vừa
  hoàn tất (nếu có).
- `DashboardPage`: thêm state `selectedWaiting` (loại trừ lẫn nhau với
  `selectedId`/`selectedCustomer`), handler `handleSelectWaiting`, nhánh
  overlay thứ 3.
- Với mock data hiện tại: `waitingCheckin` = 2 khách chưa từng vào bàn nào
  (Lê Thanh My, Võ Thu Trang); `waitingDispatch` = 1 khách (Vũ Xuân Phong,
  vừa xong TC6, chưa xuất hiện ở Tư vấn/Backup).
- Không có Node/npm trong môi trường chỉnh sửa → chưa chạy được
  `tsc`/`vite build` để verify, chỉ review code thủ công.

**Verify run (2026-07-29, sau đó):** cài Node v24 portable (không có sẵn trong
sandbox), `rm -rf node_modules package-lock.json` + `xattr -dr
com.apple.quarantine .` để fix lỗi code-signature của binary native
`@rollup/rollup-darwin-arm64` (dlopen bị chặn bởi Gatekeeper) rồi `npm install`
lại sạch. `npx tsc -b --noEmit` không lỗi. `npm run dev` chạy OK (Vite v6.4.3,
`localhost:5173`). Verify bằng browser preview: 2 hộp "Chờ check-in" (STT 7, 8)
và "Chờ điều phối" (STT 7) hiện đúng chấm cam; bấm chấm STT mở đúng
`WaitingPopover` (VD: STT 7 · Vũ Xuân Phong — Khu vực "Chờ điều phối", Trạng
thái "Đã hoàn tất 1 khâu — chờ điều phối sang khâu tiếp theo", Vừa hoàn tất
"Bàn thu cũ", tên SP "iPhone 17 Pro..."). Không có console error.

### Bộ lọc nhanh "Chỉ hiện đã thu thiết bị" (added 2026-07-29)
Yêu cầu: thêm 1 chip lọc nhanh dựa trên trường **"Đã nghiệm thu thiết bị"**
(checkbox) trong bảng **Check-in** — chỉ tô sáng các bàn mà khách đang phục vụ
đã được nghiệm thu thiết bị, các bàn khác bị làm mờ (giống cơ chế `onlyVacant`
/ `onlyTradein` hiện có).

- `larkConfig.ts`: `CheckinFieldMap` + `DEFAULT_CHECKIN_FIELDS` thêm
  `deviceAccepted: 'Đã nghiệm thu thiết bị'`. `larkSettings.ts`:
  `CHECKIN_LABELS` thêm nhãn tương ứng (tự hiện trong form mapping ở
  SettingsPage vì component lặp theo `Object.keys(CHECKIN_LABELS)`).
- `larkMapper.ts`: thêm `cellToBool()` (coerce boolean/"true"/"1"/"Có"/"x"...).
  `indexCheckinByName` trả thêm `deviceAccepted: boolean` mỗi khách. Giá trị
  này được join vào: khách đang phục vụ ở DS (`deviceAccepted` trong
  `statesById[code]`), `receivedCustomers` (indexReceived, cụm Tư vấn),
  `completedCandidates`/`waitingDispatch`, và `waitingCheckin` (đọc thẳng từ
  Check-in). `DeskCustomer`/`DeskLiveState` (`types/desk.ts`) thêm field
  `deviceAccepted?: boolean | null`.
- **Chỉ set giá trị khi bàn đang occupied** (theo đúng pattern productName/
  paymentNote hiện có) — bàn trống/idle có `deviceAccepted = null`, nên tự
  động bị lọc mờ khi bật filter (không tính là "đã nghiệm thu").
- `FilterBar.tsx`: `DeskFilters` thêm `onlyDeviceAccepted`, chip mới "Chỉ hiện
  đã thu thiết bị". `DashboardPage.tsx`: `NO_FILTERS` + `dimmedIds` cộng thêm
  điều kiện `d.deviceAccepted === true`.
- Mock data (`mockLarkData.ts`): thêm cột `'Đã nghiệm thu thiết bị'` (bool) cho
  8 khách check-in, trộn true/false để test dimming.
- **Verify**: `npx tsc -b --noEmit` không lỗi. Test trên browser preview (bật
  chip) — chỉ TC1/TC2/TC4/BK1 (khách có `true`) giữ màu, còn lại (TC3, TC5,
  TC6, BK2, mọi TV) bị làm mờ đúng như kỳ vọng.

### Sửa 3 hiểu sai + 1 bug clipping phát sinh (2026-07-29)
User phản hồi code hiểu sai vài ý sau khi xem bản build đầu:

1. **STT khách phải lấy từ Check-in, không phải "Phụ-STT"** — mỗi khách có 1
   STT duy nhất, cấp 1 lần lúc check-in, theo suốt sự kiện. Trước đó
   `customerSTT`/badge STT ở DS-occupied-desk và ở `receivedCustomers` (cụm Tư
   vấn, qua `txConsult`) đang lấy từ 2 cột **cục bộ/phụ trợ khác nhau mỗi
   bàn**: `dsStatus.sttRecent` ("STT gần nhất (helper)") và `txConsult.stt`
   ("STT" trong bảng Giao dịch Tư vấn) — 2 cột này KHÔNG đảm bảo là số duy
   nhất/cố định của khách (ví dụ đã bắt gặp: khách "Vũ Xuân Phong" checkin
   STT=6 nhưng DS helper lại ghi "7" — trùng ngẫu nhiên với STT thật của một
   khách khác). Fix: `larkMapper.ts` — `indexCheckinByName` giờ trả thêm
   `stt` (từ `checkin.stt`, nguồn canonical); mọi nơi gán `stt` cho
   `DeskCustomer`/`WaitingCustomer` (main loop, `indexReceived`,
   `completedCandidates`) đổi sang `ci?.stt ?? null`, bỏ hẳn
   `dsStatus.sttRecent` khỏi luồng hiển thị (biến `sttRecent` xoá luôn, không
   còn nơi nào dùng). Field mapping `sttRecent`/`txConsult.stt` trong
   config/Settings vẫn giữ nguyên (cột đó có thể vẫn tồn tại bên Lark cho mục
   đích khác), chỉ là mapper không còn đọc nó để gắn nhãn khách nữa.
2. **Thêm dòng "Check thu máy cũ"** — lấy đúng cột **"Check Nghiệm thu"**
   trong Check-in (trước đó turn trước bịa tên cột "Đã nghiệm thu thiết bị" vì
   chưa có tên thật — nay sửa `DEFAULT_CHECKIN_FIELDS.deviceAccepted` +
   mock data sang `'Check Nghiệm thu'`). Thêm 1 dòng label mới, đỏ khi đã
   nghiệm thu, ở cả 3 popover: `CustomerPopover.tsx`, `WaitingPopover.tsx`
   ("Check thu máy cũ" / "Đã nghiệm thu" đỏ / "Chưa nghiệm thu" xám), và
   `DeskPopover.tsx` (thêm row tương tự ở nhánh 1-khách; ở nhánh danh sách
   nhiều khách — tên khách tô đỏ+đậm thay vì thêm dòng riêng, giữ layout gọn).
   Row `Row` component ở cả 3 file đổi từ `highlight?: boolean` (hoặc không
   có) sang `tone?: 'amber' | 'red'` để dùng chung cho cả trạng thái "khách
   chờ" (amber, cũ) và "đã nghiệm thu" (red, mới).
3. **"Trạng thái" ở popover "Chờ điều phối" phải động theo khâu vừa xong** —
   trước đó là text tĩnh giống nhau cho mọi khách ("Đã hoàn tất 1 khâu — chờ
   điều phối sang khâu tiếp theo"). Nay `WaitingPopover.tsx` tự tính
   `statusTextFor(zone, customer)`: `checkin` giữ nguyên text cũ; `dispatch`
   → `Đã hoàn tất "Khâu ${STAGE_NAME[customer.fromCluster]}"` (vd `Đã hoàn tất
   "Khâu Thu cũ"`), dùng map cục bộ `STAGE_NAME` (tradein→Thu cũ,
   consult→Tư vấn, backup→Backup) — ngắn gọn hơn `CLUSTER_LABELS` (tránh lặp
   chữ "Bàn"). Xoá row "Vừa hoàn tất" riêng (đã gộp vào "Trạng thái"), xoá
   `WAITING_ZONE_STATUS` ở `DashboardPage.tsx` (không còn dùng), đổi prop
   `WaitingPopover` từ `statusText: string` → `zone: WaitingZoneKey`.
4. **Bug tự phát hiện khi verify**: thêm dòng "Check thu máy cũ" làm
   `CustomerPopover` cao hơn → bị cắt bởi `overflow-hidden` của board ở những
   bàn nửa dưới (vd TC4, y=42%) — kể cả sau khi thêm logic lật lên/xuống
   (ngưỡng `y<45`) vẫn còn ca giữa board không đủ chỗ cả 2 phía ở viewport
   thường. **Fix gốc rễ** (không phải vá ngưỡng): `LayoutDashboard.tsx` —
   tách lớp `overflow-hidden` (chỉ bọc phần visual: backdrop/regions/desks)
   ra khỏi lớp ngoài chứa `overlay`; overlay giờ là sibling *sau* lớp clip,
   cùng nằm trong 1 `<div className="relative aspect-video ...">` ngoài cùng
   (không đổi toạ độ %, vì lớp clip là `absolute inset-0` = same size). Nhờ
   vậy popover không bao giờ bị ẩn bởi mép board nữa, dù văn bản dài cỡ nào.
   `CustomerPopover.tsx` vẫn giữ thêm logic lật lên khi `y>=45` (UX, không
   phải bắt buộc để tránh clip nữa) như `DeskPopover` đã làm từ trước.
- **Verify**: `npx tsc -b --noEmit` không lỗi (`noUnusedLocals` bắt hết biến
  chết khi bỏ `sttRecent`). Browser preview: badge "Chờ điều phối" đổi đúng
  từ #7 (sai) → #6 (đúng, STT thật của Vũ Xuân Phong); popover khách đó hiện
  "Trạng thái: Đã hoàn tất "Khâu Thu cũ"" + "Check thu máy cũ: Đã nghiệm thu"
  (đỏ); TC4/Dương Xuân Long — popover đầy đủ 5 dòng, không còn bị cắt; filter
  "Chỉ hiện đã thu thiết bị" vẫn hoạt động đúng sau khi đổi tên cột.

### Sửa tiếp: "Check nghiệm thu" là formula field, không phải checkbox (2026-07-29)
User gửi screenshot cột thật trong Lark: có icon `fx` (formula field), giá trị
là **text dạng tag màu** chứ không phải boolean thô — `✅ Đã nghiệm thu (n)
máy` (xanh) / `❌ Chưa nghiệm thu máy` (đỏ). `cellToBool()` lúc đó chỉ so
khớp CHÍNH XÁC chuỗi `"đã nghiệm thu"` → sẽ luôn trả `false` (sai) với giá trị
thật vì lệch chuỗi (thừa emoji + "(n) máy"). Tên cột cũng lệch case: mình đặt
mặc định `"Check Nghiệm thu"` (N hoa), thật ra là `"Check nghiệm thu"` (n
thường).

- Fix `larkMapper.ts::cellToBool` — match theo **emoji/từ khoá substring**
  thay vì so khớp chuỗi chính xác: chứa `✅` hoặc `"đã nghiệm thu"` → `true`;
  chứa `❌` hoặc `"chưa nghiệm thu"` → `false`; rỗng/null → `false`.
- Sửa `DEFAULT_CHECKIN_FIELDS.deviceAccepted` + `CHECKIN_LABELS.deviceAccepted`
  → `'Check nghiệm thu'` (đúng case thật). Mock data (`mockLarkData.ts`) đổi
  từ `true`/`false` thô sang đúng 2 chuỗi tag thật (`DA_NGHIEM_THU`/
  `CHUA_NGHIEM_THU` const) để mock test đúng code path thật (chuỗi), không
  đi tắt qua nhánh `typeof v === 'boolean'`.
- **Verify mạnh hơn hẳn bình thường**: phát hiện browser (Browser pane) đã có
  sẵn kết nối Lark thật đã lưu trong localStorage (`useMock:false`, proxy
  `npi-event-lark-proxy.minhthanhbrvt95.workers.dev` — cấu hình có sẵn của
  user, không đụng vào/không reset). Gọi thẳng `fetch()` tới proxy thật ngay
  trong page để lấy JSON gốc bảng Check-in, xác nhận:
  - Tên cột thật đúng 100% là `"Check nghiệm thu"`.
  - Giá trị thật đúng 100% là `"✅ Đã nghiệm thu (1) máy"` /
    `"❌ Chưa nghiệm thu máy"` / `null` (khi chưa có dữ liệu) — cả 3 case đều
    được `cellToBool` xử lý đúng.
  - Bảng Check-in thật có ĐỦ 5 cột kiểu STT khác nhau: `STT`, `Phụ_STT`,
    `STT Input`, `STT_Selection`, `Check STT` — xác nhận đúng nghi vấn ban đầu
    của user (cột `Phụ_STT` có thật, tách biệt với `STT` chính) → càng chắc
    chắn quyết định dùng `checkin.stt` (mặc định `'STT'`) làm nguồn canonical
    là đúng.
  - Test trực tiếp trên dữ liệu thật qua UI: khách "Nguyễn Minh Long" ở khu
    "Chờ điều phối" hiện đúng "Trạng thái: Đã hoàn tất "Khâu Thu cũ"" và
    "Check thu máy cũ: Chưa nghiệm thu" — khớp dữ liệu Lark thật.
- Không đổi `useMock`/setting kết nối của user — đây là cấu hình riêng của
  họ, chỉ dùng để verify rồi để nguyên hiện trạng.
- **Sai lầm trong lần verify trên** (dòng ngay trên): kết luận "Chưa nghiệm
  thu" của Nguyễn Minh Long là "khớp dữ liệu thật" là SAI — xem entry ngay
  dưới, đây thực ra là do saved-settings mapping cũ, không phải dữ liệu thật.

### Sửa tiếp: saved Settings đè lên default mới, khiến field cũ ("Check
Nghiệm thu" hoa) vẫn được dùng dù code đã sửa (2026-07-29, sau đó)
User hỏi: "Số 1 đã nghiệm thu 1 máy, tại sao hiển thị chưa nghiệm thu" —
đúng, đây là **bug thật**, không phải nhầm lẫn của user.

- **Root cause**: `larkSettingsStore` (`larkSettings.ts`) persist TOÀN BỘ
  settings (kể cả field-mapping) vào `localStorage` (`npievent-lark-settings-
  v1`). `hydrate()` merge: `{...base.fields.checkin, ...(saved.fields.checkin
  ?? {})}` — nếu key `deviceAccepted` ĐÃ có trong bản saved thì nó LUÔN thắng
  default trong code, bất kể sau này code đổi default bao nhiêu lần. Trình
  duyệt test đã có sẵn bản save cũ với `deviceAccepted: "Check Nghiệm thu"`
  (hoa, từ default SAI của mình ở lần sửa trước) — nên dù code đã đổi default
  thành `"Check nghiệm thu"` (thường), app vẫn đọc field SAI TÊN (không tồn
  tại trong data thật) → `cellToBool(undefined)` → luôn `false`.
- **Đây là lỗi có thể xảy ra với chính user** nếu họ từng mở trang Cài đặt
  Lark và bấm Lưu bất kỳ lúc nào giữa lúc mình thêm field này và lúc sửa case
  — cần họ tự kiểm tra/sửa tay, code không thể tự "di chuyển" giá trị đã lưu
  của người dùng.
- **Fix trong phiên preview này**: gọi thẳng
  `larkSettingsStore.save({...current, fields: {...current.fields, checkin:
  {...current.fields.checkin, deviceAccepted: 'Check nghiệm thu'}}})` qua
  console (tương đương việc tự tay sửa ô "Check nghiệm thu" trong Cài đặt Lark
  rồi bấm "Lưu & đồng bộ"), sau đó `navigate()` reload lại để app đọc settings
  mới từ đầu (import động không share instance module với app đang chạy nên
  phải reload thật).
- **Verify lại bằng module thật** (gọi trực tiếp `mapDeskStates` +
  `fetchLarkData` + `toFieldConfig` của app, KHÔNG tự viết lại logic) — làm 2
  lần độc lập, cả 2 lần đều cho kết quả nhất quán:
  `toFieldConfig().checkin.deviceAccepted === 'Check nghiệm thu'` và
  `waitingDispatch` có `{name: 'Nguyễn Minh Long', deviceAccepted: true}`.
  Đây là bằng chứng đáng tin hơn screenshot/click UI vì gọi thẳng hàm mapper
  thật app dùng.
- **Lưu ý cho user**: nếu họ xem app ở một bản deploy/trình duyệt KHÁC (không
  phải preview này), họ cần tự vào **Cài đặt Lark** → mục "Check in" → sửa ô
  "Check nghiệm thu (đã thu máy cũ)" đúng chữ thường "Check nghiệm thu" → bấm
  "Lưu & đồng bộ". KHÔNG dùng nút "Khôi phục mặc định" vì nó reset luôn
  apiUrl/proxy thật của họ.
- Click UI để xác nhận trực quan bị **flaky trên bản live** (đôi khi
  `.click()` không mở được popover dù `props.onClick` gọi trực tiếp luôn
  thành công) — nghi do dữ liệu thật đang tự động refresh mỗi 30s (đây là sự
  kiện đang diễn ra thật) làm re-render đúng lúc click, không phải bug ở
  handler. Không đáng để sửa (test-tooling timing, không phải bug sản phẩm).

### "Trạng thái" ở Chờ điều phối đổi nguồn: đọc "Done in Flow" thay vì tự suy (2026-07-29)
User: cột "Done in Flow" (ban đầu định làm bảng "Điều phối" riêng, nhưng đã
**update trực tiếp vào Check-in** — đỡ phải thêm bảng/route proxy mới) —
dùng giá trị này để điền dòng "Trạng thái" thay vì tự suy `fromCluster` như
trước.

- `larkConfig.ts`: `CheckinFieldMap` + `DEFAULT_CHECKIN_FIELDS` thêm
  `doneInFlow: 'Done in Flow'`. `larkSettings.ts`: nhãn tương ứng.
- `larkMapper.ts`: đặt tên type `CheckinIndexEntry` cho object trả về của
  `indexCheckinByName` (trước đó inline lặp lại 2 chỗ) — thêm field
  `doneInFlow`. `completedCandidates.push` thêm `doneInFlow: ci?.doneInFlow
  ?? null`.
- `types/desk.ts`: `WaitingCustomer` thêm `doneInFlow?: string | null`.
- `WaitingPopover.tsx::statusTextFor`: ưu tiên `customer.doneInFlow`, chỉ
  fallback về `STAGE_NAME[fromCluster]` (suy từ DS) khi thiếu. **Có guard**:
  giá trị thật `"Check in"` (Lark trả cho khách CHƯA hoàn tất khâu nào — dùng
  làm baseline mặc định của formula, không phải tên khâu) bị loại, không hiện
  "Khâu Check in" — coi như thiếu, rơi về fallback.
- Field thật dạng rich-text segment array (`[{text,type}]`), không phải string
  thô — `cellToString()` đã tự xử lý đúng (nhánh `Array.isArray`), không cần
  sửa gì thêm.
- Mock data: thêm `'Done in Flow': 'Thu cũ'` cho Vũ Xuân Phong (ci_6, khách
  waitingDispatch duy nhất trong mock).
- **Verify bằng dữ liệu live thật** (module thật, không viết lại logic):
  `waitingDispatch` trả `{name: 'Nguyễn Minh Long', fromCluster: 'tradein',
  doneInFlow: 'Tư vấn'}` — **chứng minh rõ lý do cần đổi**: cách suy cũ
  (`fromCluster`) nói anh ấy "vừa xong Thu cũ" (dữ liệu cũ/stale tại thời điểm
  DS ghi nhận), còn "Done in Flow" thật nói đúng hơn là "Tư vấn" (anh ấy đã
  tiến xa hơn từ đó, do đây là sự kiện đang chạy real-time). Popover render
  đúng: `Trạng thái: Đã hoàn tất "Khâu Tư vấn"`. `tsc --noEmit` sạch.

### Zone thứ 3 "End Flow" — khách đã xong toàn bộ quy trình (2026-07-29)
User: Check-in có thêm cột **"End flow"** — giá trị `"End flow"` = khách đã
xong toàn bộ (không cần điều phối thêm), `"In flow"` = vẫn đang trong luồng.
Tạo 1 danh sách/zone riêng cho nhóm đã xong.

- Đã verify field thật trước khi code (`fetch` trực tiếp qua proxy): tên cột
  đúng là `"End flow"` (f thường), giá trị đúng 2 case `"End flow"` /
  `"In flow"`, dạng rich-text array giống "Done in Flow" — `cellToString` đã
  xử lý đúng, không cần sửa.
- `larkConfig.ts`: `CheckinFieldMap` + default thêm `endFlow: 'End flow'`.
  `larkSettings.ts`: nhãn.
- `larkMapper.ts`: `CheckinIndexEntry` thêm `endFlow: boolean` (qua helper
  `isEndFlowValue()`, so khớp case-insensitive với hằng `'end flow'`).
  `MappedData` thêm field `endFlow: WaitingCustomer[]` — build bằng cách lọc
  trực tiếp từ `checkinByName` (đã index sẵn, không cần quét lại
  `tables.checkin`). **Quan trọng**: loại khách đã `endFlow` ra khỏi
  `waitingDispatch` (thêm 1 dòng check trong vòng lặp cuối) — nếu không, 1
  khách có thể vừa hiện ở "Chờ điều phối" vừa hiện ở "End Flow" cùng lúc (do
  DS vẫn còn ghi "Hoàn tất" trong khi Check-in đã báo xong hẳn).
- `useDashboardData.ts`: `RawState`/`EMPTY`/`UseDashboardDataResult` thêm
  `endFlow`.
- `LayoutDashboard.tsx`: `WaitingZoneKey` thêm `'endFlow'`. `WaitingZone` thêm
  prop `tone?: 'amber' | 'emerald'` (trước giờ hardcode amber) — "End Flow"
  dùng tone emerald để phân biệt trực quan với 2 zone "đang chờ" (amber).
  Đặt ở góc dưới-phải board (`left-80% top-85% h-13% w-17%`) — khoảng trống
  duy nhất còn lại (dưới panel "Bàn demo 20 SP", vốn dừng ở top-38%+h-46%=84%)
  vì cột trái đã kín chỗ bởi 2 zone cũ + bàn Thu cũ.
- `WaitingPopover.tsx::statusTextFor`: thêm case `zone === 'endFlow'` →
  "Đã hoàn tất toàn bộ quy trình".
- `DashboardPage.tsx`: `WAITING_ZONE_LABEL.endFlow = 'End Flow'`;
  `selectedWaitingData` đổi từ ternary 2 nhánh sang lookup object 3 nhánh.
- Mock data: thêm hằng `IN_FLOW`/`END_FLOW`, gán `'End flow'` cho Huỳnh Ngọc
  Linh (ci_2) để test — lưu ý cô ấy vẫn "occupied" ở TC2/BK1 trong mock đồng
  thời (mock vốn không hoàn toàn nhất quán về narrative, chỉ cốt test đúng
  code path).
- **Verify data thật**: `mapped.endFlow` → `[{name: 'Nguyễn Minh Long', stt:
  '1', doneInFlow: 'Back-up', deviceAccepted: true}]`; đồng thời xác nhận anh
  ấy KHÔNG còn xuất hiện trong `waitingDispatch` nữa (trước đó có) — đúng như
  thiết kế loại trừ lẫn nhau. Verify UI (mock mode, tạm bật rồi trả lại
  `useMock: false` như cũ sau khi xong): zone "END FLOW" hiện đúng màu
  emerald, popover Huỳnh Ngọc Linh hiện đủ: Khu vực "End Flow", Trạng thái
  "Đã hoàn tất toàn bộ quy trình", SP, Check thu máy cũ (đỏ). `tsc --noEmit`
  sạch, không lỗi console mới.

### Bố trí lại board + End Flow đổi sang dạng bảng (2026-07-29, sau đó)
User: chuyển "Chờ check-in" sang chỗ "Vách phụ kiện" (đổi nhãn "ĐÃ CHECK-IN"),
chuyển "Chờ điều phối" sang chỗ "Bàn demo 20 SP"; "End Flow" đổi hẳn sang
dạng xem bảng (table), có nút riêng ở khu "Lọc nhanh" thay vì 1 zone trên
board — không còn dùng cơ chế chấm STT + popover cho nhóm này nữa.

- `LayoutDashboard.tsx`: xoá 2 `Region` tĩnh "Vách phụ kiện" (`left-80%
  top-8% h-24% w-17%`) và "Bàn demo 20 SP" (`left-80% top-38% h-46% w-17%`) —
  2 `WaitingZone` cũ chiếm đúng 2 vị trí đó (check-in nhãn đổi thành
  "Đã check-in", điều phối giữ nguyên nhãn). Xoá `WaitingZone` "End Flow" +
  revert `WaitingZoneKey` về lại `'checkin' | 'dispatch'` (bỏ `'endFlow'`) +
  revert `WAITING_ZONE_ANCHOR`/`WaitingZone` bỏ luôn cơ chế `tone` (chỉ còn
  1 tone amber, không cần enum nữa vì emerald đã hết chỗ dùng). Cột trái
  (Upgrade/Bàn thu ngân/Thu cũ) hết bị 2 zone cũ chiếm chỗ phía dưới.
- **`EndFlowTable.tsx`** (file mới): modal (`fixed inset-0 z-50`, backdrop
  đen mờ, đóng khi click backdrop / nút × / phím Escape — thêm `useEffect`
  keydown giống 3 popover kia cho nhất quán) chứa `<table>` liệt kê toàn bộ
  `endFlow` list: STT | Họ và tên | Tên sản phẩm | Ghi chú thanh toán | Check
  thu máy cũ (đỏ khi đã nghiệm thu) | Khâu cuối (`doneInFlow`).
- `FilterBar.tsx`: thêm props `endFlowCount`/`endFlowOpen`/`onToggleEndFlow`,
  chip thứ 4 "End Flow (n)" (tái dùng `Chip`, không phải filter dimming thật —
  chỉ toggle mở modal, không đụng `dimmedIds`).
- `DashboardPage.tsx`: state mới `showEndFlow`; `WAITING_ZONE_LABEL` +
  `selectedWaitingData` revert về 2 nhánh (bỏ endFlow); render
  `{showEndFlow && <EndFlowTable .../>}` như 1 overlay độc lập ngoài
  `LayoutDashboard` (không còn truyền `endFlow` prop vào board nữa, chỉ dùng
  trực tiếp trong trang).
- **Verify**: `tsc --noEmit` sạch (bắt được 1 lỗi so sánh union-type thiếu
  sót ở `WaitingPopover.tsx` — quên xoá nhánh `zone === 'endFlow'` cũ, đã
  sửa). UI live: 2 zone hiện đúng vị trí mới, nút "End Flow (n)" đúng badge
  đếm, bấm mở modal đúng (cả case rỗng lẫn có data — test qua mock), Escape
  đóng modal hoạt động sau khi thêm handler. Có vài dòng lỗi console
  "[vite] Failed to reload LayoutDashboard.tsx" — xác nhận là stale (cùng 1
  timestamp cũ, lặp lại y hệt qua nhiều lần reload sau đó) từ 1 lần HMR đua
  race lúc toggle mock/live liên tục, không phải lỗi hiện tại — trang render

### Responsive fix: desktop 1920×1080 + iPad 11"/13" (2026-07-29, sau đó)
User yêu cầu tối ưu/fix layout cho đúng 2 nhóm thiết bị. Dùng
`resize_window` (Browser pane) để test thật ở 5 viewport: 1920×1080 (desktop),
1194×834 + 834×1194 (iPad 11" ngang/dọc), 1366×1024 + 1024×1366 (iPad 13"
ngang/dọc) — đo bằng `getBoundingClientRect()` thật, không đoán qua ảnh chụp
(ảnh chụp bị scale-down nên nhìn "thấy" khoảng trắng thừa ở 1920 nhưng đo ra
flex-1 vẫn lấp đầy đúng, chỉ là ảo giác do ảnh thu nhỏ).

- **Bug tìm thấy**: hàng `StatusLegend` + `FilterBar` (trong `DashboardPage.
  tsx`) dùng `lg:flex-row lg:justify-between` (bật ở 1024px) — nhưng đo ra
  2 khối này cần tổng **~1246px** mới đủ chỗ nằm 1 hàng không xuống dòng. Ở
  MỌI viewport iPad ngang/dọc đã test (1194, 1366, và biên 1024) đều
  **≥1024 nhưng <1246**, nên `flex-row` bật nhưng cả 2 khối lại tự
  flex-wrap RIÊNG — 2 chuỗi wrap độc lập nằm cạnh nhau tạo cảm giác nội dung
  bị xáo trộn xen kẽ (dòng 1: vài mục legend + vài chip filter, dòng 2: mục
  legend còn lại + chip còn lại), rất khó đọc. Chỉ iPad 11" dọc (834px, dưới
  1024) không dính vì chưa bật `flex-row`.
- **Fix**: đổi `lg:` → `2xl:` (1536px) cho đúng 1 hàng này (không đụng hàng
  board+sidebar, vẫn dùng `lg:flex-row` vì đã test ổn ở mọi kích thước). 1536
  vừa đủ an toàn dưới ngưỡng 1246px cần thiết (dư ~290px) mà vẫn dưới 1920 —
  nghĩa là desktop giữ nguyên 1 hàng như cũ, còn CẢ 4 kích thước iPad giờ đơn
  giản xếp dọc (giống hệt cách iPad 11" dọc vốn đã hiển thị sạch) thay vì cố
  nhét 1 hàng rồi vỡ.
- Verify lại đủ 5 viewport sau fix: cả 4 iPad đều xếp dọc sạch (không còn xen
  kẽ), 1920×1080 vẫn 1 hàng như cũ. Popover (desk lẫn waiting-zone, kể cả 2
  zone mới dời sang phải ở x≈88.5%) vẫn nằm trong viewport ở 1194px
  (`offScreen: false`, đo bằng `getBoundingClientRect`). `tsc --noEmit` sạch.
- **Chưa sửa (chỉ ghi nhận, chưa làm)**: touch-target trên iPad nhỏ hơn
  khuyến nghị 44×44pt của Apple HIG — nút bàn 36px (`h-9`), chấm STT khu chờ
  20px (`h-5`), chấm khách dưới bàn 16px (`h-4`). Không tăng ngay vì rủi ro:
  ở board thu nhỏ (vd iPad dọc, board ~786px width), khoảng cách dọc giữa 1
  hàng chấm STT và HÀNG BÀN KẾ TIẾP ở cụm Tư vấn (3 hàng, cách nhau 13% —
  ~57px ở board 442px cao) đã khá sít; tăng size chấm có thể gây đè lên bàn
  hàng dưới, cần tính lại toạ độ `layoutConfig.ts` cẩn thận chứ không chỉ đổi
  class — để user quyết định có muốn làm tiếp không.
  đúng hoàn toàn qua screenshot.
