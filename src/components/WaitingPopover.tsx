/**
 * WaitingPopover — thông tin 1 khách đang ở khu vực chờ ngoài bàn (chưa gán
 * vào bàn cụ thể): "Chờ check-in" hoặc "Chờ điều phối".
 *
 * Cùng phong cách với `CustomerPopover` nhưng neo theo toạ độ khu vực chờ
 * (cố định, không phải toạ độ bàn) và luôn bung lên phía trên vì cả 2 khu vực
 * nằm sát mép dưới board.
 */
import { useEffect } from 'react';
import { CLUSTER_LABELS } from '@/config/layoutConfig';
import type { WaitingCustomer } from '@/types/desk';

interface WaitingPopoverProps {
  zoneLabel: string;
  statusText: string;
  customer: WaitingCustomer;
  x: number;
  y: number;
  onClose: () => void;
}

function translateX(x: number): string {
  if (x < 20) return '-5%';
  if (x > 80) return '-95%';
  return '-50%';
}

export default function WaitingPopover({ zoneLabel, statusText, customer, x, y, onClose }: WaitingPopoverProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="absolute z-50"
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(${translateX(x)}, calc(-100% - 10px))` }}
      role="dialog"
      aria-label={`Khách STT ${customer.stt ?? ''}`}
    >
      <div className="w-60 rounded-lg border border-amber-300 bg-white p-3 shadow-xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {customer.stt ?? '•'}
            </span>
            <div className="text-sm font-bold text-neutral-800">{customer.name ?? 'Khách'}</div>
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
          <Row label="Khu vực" value={zoneLabel} />
          <Row label="Trạng thái" value={statusText} />
          {customer.fromCluster && <Row label="Vừa hoàn tất" value={CLUSTER_LABELS[customer.fromCluster]} />}
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
      <dd className="text-right font-medium text-neutral-800">{value && value.trim() ? value : '—'}</dd>
    </div>
  );
}
