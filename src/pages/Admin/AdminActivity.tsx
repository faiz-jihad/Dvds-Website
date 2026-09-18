import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  User,
  Shield,
  Bot,
  Eye,
  Copy,
  ArrowRight,
  Check,
  Search,
  Filter,
  FileCode,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { adminApi, ActivityActor, AdminAuditEntry, InventoryMovement, OrderStatusHistory } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { UserAvatar } from '../../components/common/UserAvatar';
import { formatDateUK, cn } from '../../lib/formatters';
import { useUiStore } from '../../stores/useUiStore';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';

type ActivityTab = 'inventory' | 'orders' | 'audit';

interface ActorCellProps {
  actor?: ActivityActor | null;
  actorId?: string | null;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
}

const ActorCell: React.FC<ActorCellProps> = ({
  actor,
  actorId,
  fallbackTitle = 'System Automation',
  fallbackSubtitle = 'Automated service',
}) => {
  if (actor) {
    return (
      <div className="flex items-center gap-2.5 min-w-[190px]">
        <UserAvatar size="sm" name={actor.full_name} email={actor.email} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-dark truncate">
              {actor.full_name || actor.email.split('@')[0]}
            </span>
            <span
              className={cn(
                'rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider',
                actor.role === 'admin'
                  ? 'bg-blue-50 text-brand-blue border border-blue-200/80'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              )}
            >
              {actor.role}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 truncate block font-mono">
            {actor.email}
          </span>
        </div>
      </div>
    );
  }

  if (actorId) {
    return (
      <div className="flex items-center gap-2.5 min-w-[170px]">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
          <User size={14} />
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-xs text-dark block">Registered User</span>
          <span className="text-[10px] text-gray-400 font-mono truncate block" title={actorId}>
            ID: {actorId.slice(0, 8)}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[170px]">
      <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
        <Bot size={14} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-purple-950 truncate">
            {fallbackTitle}
          </span>
          <span className="rounded bg-purple-50 border border-purple-200/80 px-1.5 py-0.2 text-[9px] font-extrabold text-purple-700 uppercase">
            SYSTEM
          </span>
        </div>
        <span className="text-[10px] text-gray-400 block truncate">
          {fallbackSubtitle}
        </span>
      </div>
    </div>
  );
};

export const AdminActivity: React.FC = () => {
  const [tab, setTab] = useState<ActivityTab>('audit');
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<AdminAuditEntry | null>(null);
  const addToast = useUiStore((state) => state.addToast);

  const activityQuery = useQuery({
    queryKey: ['admin', 'operational-activity'],
    queryFn: adminApi.getOperationalActivity,
    refetchInterval: 30_000,
  });

  if (activityQuery.isLoading || activityQuery.error || !activityQuery.data) {
    return (
      <AdminDataState
        loading={activityQuery.isLoading}
        error={activityQuery.error}
        onRetry={() => activityQuery.refetch()}
      />
    );
  }

  const { inventory, orders, audit } = activityQuery.data;

  const auditPagination = useAdminPagination(audit, 25);
  const ordersPagination = useAdminPagination(orders, 25);
  const inventoryPagination = useAdminPagination(inventory, 25);

  const tabs: { id: ActivityTab; label: string; count: number }[] = [
    { id: 'audit', label: 'Admin Audit Log', count: audit.length },
    { id: 'orders', label: 'Order Status Transitions', count: orders.length },
    { id: 'inventory', label: 'Stock Movements', count: inventory.length },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-brand-blue">
            <ShieldCheck className="h-4 w-4" /> Comprehensive Operational Traceability
          </div>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-dark">
            Activity &amp; Audit Trail
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time audit log tracking every change, operator identity, before/after values, and inventory transition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => activityQuery.refetch()}
            isLoading={activityQuery.isFetching}
            className="shadow-2xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex snap-x gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'min-h-11 shrink-0 snap-start whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-2',
              tab === item.id
                ? 'bg-brand-blue text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <span>{item.label}</span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-mono',
                tab === item.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Admin Audit Log */}
      {tab === 'audit' && (
        <ActivityTable
          empty={audit.length === 0}
          headers={['Timestamp', 'Target Resource', 'Action', 'Changed By (Operator)', 'Record ID', 'Fields Modified', 'Action']}
          pagination={
            <AdminPagination
              currentPage={auditPagination.currentPage}
              pageSize={auditPagination.pageSize}
              totalItems={auditPagination.totalItems}
              onPageChange={auditPagination.setCurrentPage}
              onPageSizeChange={auditPagination.setPageSize}
              itemLabel="audit logs"
            />
          }
        >
          {auditPagination.paginatedItems.map((entry) => {
            const before = entry.before_data || {};
            const after = entry.after_data || {};
            const changed = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
              .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
              .filter((key) => !['updated_at'].includes(key));

            return (
              <tr
                key={entry.id}
                onClick={() => setSelectedAuditEntry(entry)}
                className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer group"
              >
                <Cell>
                  <span className="font-semibold text-dark block">{formatDateUK(entry.created_at)}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </Cell>
                <Cell>
                  <span className="font-bold text-dark uppercase font-mono text-xs">{entry.table_name}</span>
                </Cell>
                <Cell>
                  <span
                    className={cn(
                      'rounded-md px-2 py-1 font-mono text-[10px] font-extrabold uppercase border',
                      entry.action === 'UPDATE'
                        ? 'bg-blue-50 text-brand-blue border-blue-200'
                        : entry.action === 'INSERT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    {entry.action}
                  </span>
                </Cell>
                <Cell>
                  <ActorCell
                    actor={entry.actor}
                    actorId={entry.actor_id}
                    fallbackTitle="Automated Trigger"
                    fallbackSubtitle="Database trigger / RPC"
                  />
                </Cell>
                <Cell mono className="text-gray-500 max-w-[120px] truncate" title={entry.record_id}>
                  {entry.record_id}
                </Cell>
                <Cell>
                  {changed.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                      {changed.slice(0, 3).map((field) => (
                        <span key={field} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700">
                          {field}
                        </span>
                      ))}
                      {changed.length > 3 && (
                        <span className="text-[10px] text-gray-400 font-semibold self-center">
                          +{changed.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-[11px]">Record created / unmodified</span>
                  )}
                </Cell>
                <Cell className="text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAuditEntry(entry);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-brand-blue hover:text-white hover:border-brand-blue text-xs font-semibold shadow-2xs transition-colors group-hover:border-brand-blue group-hover:text-brand-blue cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>Inspect</span>
                  </button>
                </Cell>
              </tr>
            );
          })}
        </ActivityTable>
      )}

      {/* Tab 2: Order Status Transitions */}
      {tab === 'orders' && (
        <ActivityTable
          empty={orders.length === 0}
          headers={['Timestamp', 'Order Reference', 'Changed By (Operator)', 'Previous Status', 'New Status', 'Fulfilment', 'Internal Note']}
          pagination={
            <AdminPagination
              currentPage={ordersPagination.currentPage}
              pageSize={ordersPagination.pageSize}
              totalItems={ordersPagination.totalItems}
              onPageChange={ordersPagination.setCurrentPage}
              onPageSizeChange={ordersPagination.setPageSize}
              itemLabel="order logs"
            />
          }
        >
          {ordersPagination.paginatedItems.map((entry) => (
            <tr key={entry.id} className="border-t border-gray-100 hover:bg-blue-50/20 transition-colors">
              <Cell>
                <span className="font-semibold text-dark block">{formatDateUK(entry.created_at)}</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </Cell>
              <Cell mono className="font-bold text-dark">
                {entry.order?.order_number || entry.order_id}
              </Cell>
              <Cell>
                <ActorCell
                  actor={entry.actor}
                  actorId={entry.actor_id}
                  fallbackTitle={entry.note?.toLowerCase().includes('expired') ? 'Stripe Gateway' : 'Checkout Engine'}
                  fallbackSubtitle="Order status transition"
                />
              </Cell>
              <Cell className="capitalize text-gray-500 font-medium">
                {entry.previous_status || 'Initial Creation'}
              </Cell>
              <Cell>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-brand-blue border border-blue-200">
                  {entry.new_status}
                </span>
              </Cell>
              <Cell className="capitalize text-gray-600 font-medium">
                {entry.new_fulfilment_status}
              </Cell>
              <Cell className="text-gray-600 max-w-[200px] truncate" title={entry.note || ''}>
                {entry.note || '—'}
              </Cell>
            </tr>
          ))}
        </ActivityTable>
      )}

      {/* Tab 3: Stock Movements */}
      {tab === 'inventory' && (
        <ActivityTable
          empty={inventory.length === 0}
          headers={['Timestamp', 'Product Title & SKU', 'Changed By (Operator)', 'Before', 'Change', 'After', 'Reason']}
          pagination={
            <AdminPagination
              currentPage={inventoryPagination.currentPage}
              pageSize={inventoryPagination.pageSize}
              totalItems={inventoryPagination.totalItems}
              onPageChange={inventoryPagination.setCurrentPage}
              onPageSizeChange={inventoryPagination.setPageSize}
              itemLabel="stock movements"
            />
          }
        >
          {inventoryPagination.paginatedItems.map((entry) => (
            <tr key={entry.id} className="border-t border-gray-100 hover:bg-blue-50/20 transition-colors">
              <Cell>
                <span className="font-semibold text-dark block">{formatDateUK(entry.created_at)}</span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {new Date(entry.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </Cell>
              <Cell>
                <div className="font-bold text-dark text-xs truncate max-w-[200px]" title={entry.product?.title}>
                  {entry.product?.title || entry.product_id}
                </div>
                {entry.product?.sku && (
                  <div className="font-mono text-[10px] text-gray-400">SKU: {entry.product.sku}</div>
                )}
              </Cell>
              <Cell>
                <ActorCell
                  actor={entry.actor}
                  actorId={entry.actor_id}
                  fallbackTitle={entry.reason.toLowerCase().includes('order') ? 'Order Restock / Sale' : 'Inventory Automation'}
                  fallbackSubtitle="Stock adjustment"
                />
              </Cell>
              <Cell mono className="text-gray-500">{entry.quantity_before}</Cell>
              <Cell mono className={cn('font-bold', entry.quantity_delta > 0 ? 'text-emerald-700' : 'text-rose-700')}>
                {entry.quantity_delta > 0 ? `+${entry.quantity_delta}` : entry.quantity_delta}
              </Cell>
              <Cell mono className="font-bold text-dark">{entry.quantity_after}</Cell>
              <Cell className="text-gray-600 max-w-[220px] truncate" title={entry.reason}>
                {entry.reason}
              </Cell>
            </tr>
          ))}
        </ActivityTable>
      )}

      {/* Detailed Audit Diff Inspector Modal */}
      {selectedAuditEntry && (
        <Modal
          isOpen={Boolean(selectedAuditEntry)}
          onClose={() => setSelectedAuditEntry(null)}
          title={`Audit Record — ${selectedAuditEntry.table_name.toUpperCase()}`}
          description={`Record Reference: ${selectedAuditEntry.record_id}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Operator Card */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                {selectedAuditEntry.actor ? (
                  <UserAvatar
                    size="md"
                    name={selectedAuditEntry.actor.full_name}
                    email={selectedAuditEntry.actor.email}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <Bot size={18} />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-dark">
                      {selectedAuditEntry.actor?.full_name || (selectedAuditEntry.actor_id ? 'Authenticated User' : 'System Automation')}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        selectedAuditEntry.actor?.role === 'admin'
                          ? 'bg-blue-100 text-brand-blue'
                          : 'bg-slate-200 text-slate-800'
                      )}
                    >
                      {selectedAuditEntry.actor?.role || (selectedAuditEntry.actor_id ? 'User' : 'System')}
                    </span>
                  </div>
                  <p className="text-gray-500 font-mono text-[11px] mt-0.5">
                    {selectedAuditEntry.actor?.email || (selectedAuditEntry.actor_id ? `UUID: ${selectedAuditEntry.actor_id}` : 'Triggered by background operational trigger or RPC')}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider border',
                    selectedAuditEntry.action === 'UPDATE'
                      ? 'bg-blue-50 text-brand-blue border-blue-200'
                      : selectedAuditEntry.action === 'INSERT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  )}
                >
                  {selectedAuditEntry.action}
                </span>
                <p className="text-[10px] text-gray-400 mt-1">
                  {formatDateUK(selectedAuditEntry.created_at)}
                </p>
              </div>
            </div>

            {/* Changed Fields Diff Table */}
            {(() => {
              const before = selectedAuditEntry.before_data || {};
              const after = selectedAuditEntry.after_data || {};
              const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter(
                (key) => !['updated_at'].includes(key)
              );
              const modifiedKeys = allKeys.filter(
                (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])
              );

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-dark text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-brand-blue" />
                      Field Modifications ({modifiedKeys.length})
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Table: <strong className="text-dark font-mono">{selectedAuditEntry.table_name}</strong>
                    </span>
                  </div>

                  {modifiedKeys.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-gray-500">
                      Initial record creation. No previous state to compare.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                          <tr>
                            <th className="py-2.5 px-3">Field</th>
                            <th className="py-2.5 px-3">Previous Value (Before)</th>
                            <th className="py-2.5 px-3">New Value (After)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-mono">
                          {modifiedKeys.map((key) => (
                            <tr key={key} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 font-semibold text-dark font-sans">
                                {key}
                              </td>
                              <td className="py-2.5 px-3 text-rose-700 bg-rose-50/40 break-all text-[11px]">
                                {before[key] !== undefined ? JSON.stringify(before[key]) : '<empty>'}
                              </td>
                              <td className="py-2.5 px-3 text-emerald-800 bg-emerald-50/40 break-all text-[11px] font-bold">
                                {after[key] !== undefined ? JSON.stringify(after[key]) : '<empty>'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Raw JSON Data Accordion */}
                  <div className="pt-2">
                    <details className="group rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                      <summary className="cursor-pointer font-bold text-gray-700 flex items-center justify-between text-xs select-none">
                        <span className="flex items-center gap-1.5">
                          <FileCode size={13} className="text-gray-500" />
                          Inspect Full Raw JSON Payload
                        </span>
                        <ChevronRight size={14} className="group-open:rotate-90 transition-transform text-gray-400" />
                      </summary>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[10px]">
                        <div>
                          <span className="font-bold text-gray-500 block mb-1">before_data:</span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 max-h-56 overflow-auto">
                            {JSON.stringify(before, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="font-bold text-gray-500 block mb-1">after_data:</span>
                          <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 max-h-56 overflow-auto">
                            {JSON.stringify(after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};

const Cell: React.FC<React.PropsWithChildren<{ mono?: boolean; className?: string }>> = ({
  children,
  mono,
  className = '',
}) => (
  <td className={`p-3.5 align-middle text-xs text-gray-600 ${mono ? 'font-mono' : ''} ${className}`}>
    {children}
  </td>
);

const ActivityTable: React.FC<React.PropsWithChildren<{ headers: string[]; empty: boolean; pagination?: React.ReactNode }>> = ({
  headers,
  empty,
  pagination,
  children,
}) => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
    {empty ? (
      <div className="flex flex-col items-center gap-2 p-12 text-center text-gray-500">
        <PackageSearch className="h-7 w-7 text-gray-300" />
        <p className="text-sm font-semibold text-dark">No activity recorded yet</p>
        <p className="text-xs">Events appear here after an authorised operational change.</p>
      </div>
    ) : (
      <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500 select-none">
              <tr>
                {headers.map((header) => (
                  <th key={header} className="p-3.5">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">{children}</tbody>
          </table>
        </div>
        {pagination}
      </>
    )}
  </div>
);
