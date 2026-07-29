/**
 * DashboardPage — the interactive floor map + sidebar + filters + popover.
 */
import { useCallback, useMemo, useState } from 'react';
import CustomerPopover from '@/components/CustomerPopover';
import DeskPopover from '@/components/DeskPopover';
import EndFlowTable from '@/components/EndFlowTable';
import FilterBar, { type DeskFilters } from '@/components/FilterBar';
import LayoutDashboard, { WAITING_ZONE_ANCHOR, type WaitingZoneKey } from '@/components/LayoutDashboard';
import Sidebar from '@/components/Sidebar';
import StatusLegend from '@/components/StatusLegend';
import WaitingPopover from '@/components/WaitingPopover';
import { useDashboardData } from '@/hooks/useDashboardData';
import { deskUiStatus } from '@/types/desk';

const NO_FILTERS: DeskFilters = { onlyVacant: false, onlyTradein: false, onlyDeviceAccepted: false };

const WAITING_ZONE_LABEL: Record<WaitingZoneKey, string> = {
  checkin: 'Đã check-in',
  dispatch: 'Chờ điều phối',
};

export default function DashboardPage() {
  const { desks, summary, waitingCheckin, waitingDispatch, endFlow, loading, error, lastUpdated, isMock, refresh } =
    useDashboardData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ deskId: string; index: number } | null>(null);
  const [selectedWaiting, setSelectedWaiting] = useState<{ zone: WaitingZoneKey; index: number } | null>(null);
  const [filters, setFilters] = useState<DeskFilters>(NO_FILTERS);
  const [showEndFlow, setShowEndFlow] = useState(false);

  const handleSelect = useCallback((id: string) => {
    setSelectedCustomer(null);
    setSelectedWaiting(null);
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSelectCustomer = useCallback((deskId: string, index: number) => {
    setSelectedId(null);
    setSelectedWaiting(null);
    setSelectedCustomer((prev) =>
      prev?.deskId === deskId && prev?.index === index ? null : { deskId, index },
    );
  }, []);

  const handleSelectWaiting = useCallback((zone: WaitingZoneKey, index: number) => {
    setSelectedId(null);
    setSelectedCustomer(null);
    setSelectedWaiting((prev) => (prev?.zone === zone && prev?.index === index ? null : { zone, index }));
  }, []);

  const dimmedIds = useMemo(() => {
    if (!filters.onlyVacant && !filters.onlyTradein && !filters.onlyDeviceAccepted) return undefined;
    const set = new Set<string>();
    for (const d of desks) {
      const matches =
        (!filters.onlyVacant || deskUiStatus(d) === 'available') &&
        (!filters.onlyTradein || d.cluster === 'tradein') &&
        (!filters.onlyDeviceAccepted || d.deviceAccepted === true);
      if (!matches) set.add(d.id);
    }
    return set;
  }, [desks, filters]);

  const selectedDesk = useMemo(() => {
    if (!selectedId || dimmedIds?.has(selectedId)) return null;
    return desks.find((d) => d.id === selectedId) ?? null;
  }, [desks, selectedId, dimmedIds]);

  const selectedCustomerData = useMemo(() => {
    if (!selectedCustomer || dimmedIds?.has(selectedCustomer.deskId)) return null;
    const desk = desks.find((d) => d.id === selectedCustomer.deskId);
    const customer = desk?.receivedCustomers?.[selectedCustomer.index];
    return desk && customer ? { desk, customer } : null;
  }, [desks, selectedCustomer, dimmedIds]);

  const selectedWaitingData = useMemo(() => {
    if (!selectedWaiting) return null;
    const list = selectedWaiting.zone === 'checkin' ? waitingCheckin : waitingDispatch;
    const customer = list[selectedWaiting.index];
    return customer ? { zone: selectedWaiting.zone, customer } : null;
  }, [selectedWaiting, waitingCheckin, waitingDispatch]);

  return (
    <div className="min-h-full bg-neutral-100 text-neutral-800">
      <header className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">NPI Event · Coordinator Dashboard</h1>
            <p className="text-sm text-neutral-500">
              Sơ đồ tương tác điều phối luồng khách — đồng bộ trạng thái bàn từ Lark Base.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href="#/settings"
              className="rounded border border-brand px-2 py-1 font-semibold text-brand hover:bg-brand hover:text-white"
            >
              Cài đặt Lark
            </a>
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold',
                isMock ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700',
              ].join(' ')}
            >
              {isMock ? 'Mock data' : 'Lark Base (live · 30s)'}
            </span>
            {error ? (
              <span className="rounded-full bg-red-100 px-2 py-1 font-semibold text-red-700">
                Lỗi đồng bộ
              </span>
            ) : (
              <span className="text-neutral-500">
                {loading
                  ? 'Đang tải…'
                  : lastUpdated
                    ? `Cập nhật: ${lastUpdated.toLocaleTimeString('vi-VN')}`
                    : '—'}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              className="rounded border border-neutral-300 px-2 py-1 font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Làm mới
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 truncate text-xs text-red-600" title={error}>
            {error}
          </p>
        )}
      </header>

      <main className="px-6 py-6">
        <div className="mb-4 flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <StatusLegend />
          <FilterBar
            filters={filters}
            onChange={setFilters}
            endFlowCount={endFlow.length}
            endFlowOpen={showEndFlow}
            onToggleEndFlow={() => setShowEndFlow((v) => !v)}
          />
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <LayoutDashboard
              desks={desks}
              selectedId={selectedId}
              onSelect={handleSelect}
              onSelectCustomer={handleSelectCustomer}
              selectedCustomer={selectedCustomer}
              waitingCheckin={waitingCheckin}
              waitingDispatch={waitingDispatch}
              onSelectWaiting={handleSelectWaiting}
              selectedWaiting={selectedWaiting}
              dimmedIds={dimmedIds}
              overlay={
                selectedDesk ? (
                  <DeskPopover desk={selectedDesk} onClose={() => setSelectedId(null)} />
                ) : selectedCustomerData ? (
                  <CustomerPopover
                    desk={selectedCustomerData.desk}
                    customer={selectedCustomerData.customer}
                    onClose={() => setSelectedCustomer(null)}
                  />
                ) : selectedWaitingData ? (
                  <WaitingPopover
                    zoneLabel={WAITING_ZONE_LABEL[selectedWaitingData.zone]}
                    zone={selectedWaitingData.zone}
                    customer={selectedWaitingData.customer}
                    x={WAITING_ZONE_ANCHOR[selectedWaitingData.zone].x}
                    y={WAITING_ZONE_ANCHOR[selectedWaitingData.zone].y}
                    onClose={() => setSelectedWaiting(null)}
                  />
                ) : null
              }
            />
          </div>
          <Sidebar summary={summary} />
        </div>
      </main>

      {showEndFlow && <EndFlowTable customers={endFlow} onClose={() => setShowEndFlow(false)} />}
    </div>
  );
}
