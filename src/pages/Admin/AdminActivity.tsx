import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, PackageSearch, RefreshCw, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';
import { formatDateUK } from '../../lib/formatters';

type ActivityTab = 'inventory' | 'orders' | 'audit';

export const AdminActivity: React.FC = () => {
  const [tab, setTab] = useState<ActivityTab>('inventory');
  const activityQuery = useQuery({
    queryKey: ['admin', 'operational-activity'],
    queryFn: adminApi.getOperationalActivity,
    refetchInterval: 30_000,
  });

  if (activityQuery.isLoading || activityQuery.error || !activityQuery.data) {
    return <AdminDataState loading={activityQuery.isLoading} error={activityQuery.error} onRetry={() => activityQuery.refetch()} />;
  }

  const { inventory, orders, audit } = activityQuery.data;
  const tabs: { id: ActivityTab; label: string; count: number }[] = [
    { id: 'inventory', label: 'Stock movements', count: inventory.length },
    { id: 'orders', label: 'Order transitions', count: orders.length },
    { id: 'audit', label: 'Admin audit', count: audit.length },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-brand-blue">
            <ShieldCheck className="h-4 w-4" /> Operational traceability
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-dark">Activity & Audit</h1>
          <p className="mt-1 text-sm text-gray-500">The latest 100 database-backed events per area, refreshed every 30 seconds.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => activityQuery.refetch()} isLoading={activityQuery.isFetching}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex snap-x gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-white p-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-11 shrink-0 snap-start whitespace-nowrap rounded-md px-4 py-2 text-xs font-semibold ${tab === item.id ? 'bg-brand-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {item.label} <span className="ml-1 opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <ActivityTable empty={inventory.length === 0} headers={['Time', 'Product', 'Before', 'Change', 'After', 'Reason']}>
          {inventory.map((entry) => (
            <tr key={entry.id} className="border-t border-gray-100">
              <Cell>{formatDateUK(entry.created_at)}</Cell>
              <Cell><div className="font-semibold text-dark">{entry.product?.title || entry.product_id}</div><div className="font-mono text-[10px] text-gray-400">{entry.product?.sku}</div></Cell>
              <Cell mono>{entry.quantity_before}</Cell>
              <Cell mono className={entry.quantity_delta > 0 ? 'text-emerald-700' : 'text-red-700'}>{entry.quantity_delta > 0 ? '+' : ''}{entry.quantity_delta}</Cell>
              <Cell mono>{entry.quantity_after}</Cell>
              <Cell>{entry.reason}</Cell>
            </tr>
          ))}
        </ActivityTable>
      )}

      {tab === 'orders' && (
        <ActivityTable empty={orders.length === 0} headers={['Time', 'Order', 'Previous', 'New status', 'Fulfilment', 'Note']}>
          {orders.map((entry) => (
            <tr key={entry.id} className="border-t border-gray-100">
              <Cell>{formatDateUK(entry.created_at)}</Cell>
              <Cell mono>{entry.order?.order_number || entry.order_id}</Cell>
              <Cell>{entry.previous_status || 'Created'}</Cell>
              <Cell className="font-semibold text-brand-blue">{entry.new_status}</Cell>
              <Cell>{entry.new_fulfilment_status}</Cell>
              <Cell>{entry.note || '—'}</Cell>
            </tr>
          ))}
        </ActivityTable>
      )}

      {tab === 'audit' && (
        <ActivityTable empty={audit.length === 0} headers={['Time', 'Table', 'Action', 'Record ID', 'Changed fields']}>
          {audit.map((entry) => {
            const before = entry.before_data || {};
            const after = entry.after_data || {};
            const changed = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
              .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
              .filter((key) => !['updated_at'].includes(key));
            return (
              <tr key={entry.id} className="border-t border-gray-100">
                <Cell>{formatDateUK(entry.created_at)}</Cell>
                <Cell className="font-semibold text-dark">{entry.table_name}</Cell>
                <Cell><span className="rounded bg-gray-100 px-2 py-1 font-mono text-[10px] font-bold">{entry.action}</span></Cell>
                <Cell mono>{entry.record_id}</Cell>
                <Cell>{changed.length ? changed.join(', ') : 'Record created'}</Cell>
              </tr>
            );
          })}
        </ActivityTable>
      )}
    </div>
  );
};

const Cell: React.FC<React.PropsWithChildren<{ mono?: boolean; className?: string }>> = ({ children, mono, className = '' }) => (
  <td className={`p-3.5 align-top text-xs text-gray-600 ${mono ? 'font-mono' : ''} ${className}`}>{children}</td>
);

const ActivityTable: React.FC<React.PropsWithChildren<{ headers: string[]; empty: boolean }>> = ({ headers, empty, children }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xs">
    {empty ? (
      <div className="flex flex-col items-center gap-2 p-12 text-center text-gray-500">
        <PackageSearch className="h-7 w-7 text-gray-300" />
        <p className="text-sm font-semibold text-dark">No activity recorded yet</p>
        <p className="text-xs">Events appear here after an authorised operational change.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <tr>{headers.map((header) => <th key={header} className="p-3.5">{header}</th>)}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    )}
  </div>
);
