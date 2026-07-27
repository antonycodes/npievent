/**
 * CustomerPopover — thông tin 1 khách khi bấm vào chấm STT.
 *
 * Neo ngay dưới bàn (nơi có các chấm), tự kẹp mép trái/phải, đóng bằng ×/Escape.
 */
import { useEffect } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import type { DeskCustomer, DeskData } from '@/types/desk';

interface CustomerPopoverProps {
  desk: DeskData;
  customer: DeskCustomer;
  onClose: () => void;
}

function translateX(x: number): string {
  if (x < 20) return '-15%';
  if (x > 80) return '-85%';
  return '-50%';
}

export default function CustomerPopover({ desk, customer, onClose }: CustomerPopoverProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { x, y, id, cluster, staffName } = desk;

  return (
    <div
      className="absolute z-50"
      style={{ left: `${x}%`, top: `calc(${y}% + 40px)`, transform: `translate(${translateX(x)}, 0)` }}
      role="dialog"
      aria-label={`Khách STT ${customer.stt ?? ''}`}
    >
      <div className="w-60 rounded-lg border border-amber-300 bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {customer.stt ?? '•'}
            </span>
            <div className="text-sm font-bold text-neutral-800">
              {customer.name ?? 'Khách'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ×
          </button>
        </div>

        <dl className="space-y-1.5 text-sm">
          <Row label="Vị trí" value={`${CLUSTER_LABELS[cluster]} · ${id}`} />
          <Row label="Nhân viên" value={staffName ?? null} />
          <Row label="Tên sản phẩm" value={customer.productName ?? null} />
          <Row label="Ghi chú thanh toán" value={customer.paymentNote ?? null} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-800">
        {value && value.trim() ? value : '—'}
      </dd>
    </div>
  );
}
