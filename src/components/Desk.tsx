/**
 * Desk — a single interactive desk node on the floor map.
 *
 * Props follow the spec: `id`, `type`, `status`, `staffName`, `customerSTT`
 * (+ `waiting` bottleneck count and selection/click handlers). Color:
 *   occupied → red, available → green, idle (no data) → grey.
 */
import type { ClusterKey, DeskUiStatus } from '@/types/desk';

export interface DeskProps {
  id: string;
  type: ClusterKey;
  status: DeskUiStatus;
  staffName?: string | null;
  customerSTT?: string | null;
  /** DS "khách chờ" — shown as a small bottleneck badge when > 0. */
  waiting?: number;
  /** Node center position (percent of board). */
  x: number;
  y: number;
  selected?: boolean;
  /** Dimmed by an active filter — faded and non-interactive. */
  dimmed?: boolean;
  onClick?: (id: string) => void;
}

const TONE: Record<DeskUiStatus, string> = {
  idle: 'bg-neutral-200 border-neutral-400 text-neutral-600',
  available: 'bg-vacant border-green-700 text-white',
  occupied: 'bg-occupied border-red-800 text-white',
};

/** Rounded-square for trade-in, circle for consult/backup — echoes the photo. */
const SHAPE: Record<ClusterKey, string> = {
  tradein: 'rounded-md',
  consult: 'rounded-full',
  backup: 'rounded-full',
};

export default function Desk({
  id,
  type,
  status,
  waiting = 0,
  x,
  y,
  selected = false,
  dimmed = false,
  onClick,
}: DeskProps) {
  const interactive = Boolean(onClick) && !dimmed;
  return (
    <button
      type="button"
      aria-label={`Bàn ${id} — ${status}`}
      title={id}
      disabled={!interactive}
      onClick={() => interactive && onClick?.(id)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={[
        'absolute -translate-x-1/2 -translate-y-1/2',
        'flex h-9 min-w-9 items-center justify-center px-1',
        'text-[11px] font-semibold leading-none',
        'border shadow-sm transition',
        interactive ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default',
        dimmed ? 'pointer-events-none opacity-15' : '',
        selected ? 'z-20 scale-110 ring-2 ring-blue-500 ring-offset-1' : 'z-10',
        SHAPE[type],
        TONE[status],
      ].join(' ')}
    >
      {id}
      {waiting > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow"
          title={`${waiting} khách đang chờ`}
        >
          {waiting}
        </span>
      )}
    </button>
  );
}
