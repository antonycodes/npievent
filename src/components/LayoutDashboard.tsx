/**
 * LayoutDashboard — the interactive floor-plan board.
 *
 * Renders a 16:9 stage mirroring the event photo: fixed venue regions as a
 * backdrop plus the 38 interactive desks (driven by the `desks` array).
 */
import { deskUiStatus, type DeskData } from '@/types/desk';
import Desk from './Desk';

interface LayoutDashboardProps {
  desks: DeskData[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Ids to fade out (filtered) — dimmed and non-interactive. */
  dimmedIds?: Set<string>;
  /** Optional overlay (e.g. the popover) drawn on top of the board. */
  overlay?: React.ReactNode;
}

function Region({ label, sub, className }: { label: string; sub?: string; className: string }) {
  return (
    <div
      className={`absolute flex flex-col items-center justify-center rounded-lg border border-dashed text-center ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      {sub && <span className="text-[9px] opacity-70">{sub}</span>}
    </div>
  );
}

function ClusterCaption({ text, className }: { text: string; className: string }) {
  return (
    <span
      className={`absolute -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide text-neutral-500 ${className}`}
    >
      {text}
    </span>
  );
}

export default function LayoutDashboard({
  desks,
  selectedId,
  onSelect,
  dimmedIds,
  overlay,
}: LayoutDashboardProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-300 bg-neutral-50 shadow-inner">
      {/* ── Static venue backdrop ─────────────────────────────────── */}
      <div className="absolute left-[34%] top-[6%] h-[36%] w-[44%] rounded-2xl border border-brand/30 bg-brand/10" />
      <Region label="Sân khấu" className="left-[46%] top-[7%] h-[5%] w-[18%] border-brand/50 text-brand" />
      <Region label="Upgrade" className="left-[3%] top-[8%] h-[9%] w-[15%] border-neutral-300 text-neutral-500" />
      <Region label="Bàn thu ngân" className="left-[3%] top-[19%] h-[8%] w-[15%] border-neutral-300 text-neutral-500" />
      <Region
        label="Vách phụ kiện"
        sub="Cố định · gắn LED"
        className="left-[80%] top-[8%] h-[24%] w-[17%] border-brand/40 text-brand"
      />
      <Region label="Bàn demo 20 SP" className="left-[80%] top-[38%] h-[46%] w-[17%] border-neutral-300 text-neutral-500" />
      <Region
        label="Bàn đợi"
        sub="Sau khi phát STT"
        className="left-[3%] top-[71%] h-[13%] w-[15%] border-neutral-300 text-neutral-500"
      />
      <Region label="PG phát STT" className="left-[3%] top-[86%] h-[9%] w-[15%] border-neutral-300 text-neutral-500" />
      <Region label="Cổng" className="left-[42%] top-[88%] h-[8%] w-[16%] border-neutral-300 text-neutral-500" />

      {/* ── Cluster captions ──────────────────────────────────────── */}
      <ClusterCaption text="Thu cũ" className="left-[13%] top-[29%]" />
      <ClusterCaption text="Tư vấn" className="left-[55%] top-[43%]" />

      {/* ── Interactive desks (38) ────────────────────────────────── */}
      {desks.map((d) => (
        <Desk
          key={d.id}
          id={d.id}
          type={d.cluster}
          status={deskUiStatus(d)}
          staffName={d.staffName}
          customerSTT={d.customerSTT}
          waiting={d.waiting}
          x={d.x}
          y={d.y}
          selected={selectedId === d.id}
          dimmed={dimmedIds?.has(d.id)}
          onClick={onSelect}
        />
      ))}

      {/* ── Chấm STT khách đã tiếp nhận (bàn Tư vấn) ──────────────── */}
      {desks.map((d) =>
        d.cluster === 'consult' && (d.receivedCustomers?.length ?? 0) > 0 ? (
          <div
            key={`dots-${d.id}`}
            className={[
              'absolute z-10 flex -translate-x-1/2 gap-1',
              dimmedIds?.has(d.id) ? 'opacity-15' : '',
            ].join(' ')}
            style={{ left: `${d.x}%`, top: `calc(${d.y}% + 22px)` }}
          >
            {d.receivedCustomers!.map((c, i) => (
              <span
                key={i}
                title={`${c.stt ? `#${c.stt} · ` : ''}${c.name ?? ''}`}
                className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow"
              >
                {c.stt ?? '•'}
              </span>
            ))}
          </div>
        ) : null,
      )}

      {/* ── Overlay (popover) ─────────────────────────────────────── */}
      {overlay}
    </div>
  );
}
