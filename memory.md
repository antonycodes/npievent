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
