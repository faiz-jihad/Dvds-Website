import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw } from 'lucide-react';
import { adminApi, ContactMessage } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateUK } from '../../lib/formatters';
import { useUiStore } from '../../stores/useUiStore';

export const AdminSupport: React.FC = () => {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'contact-messages'], queryFn: adminApi.getContactMessages, refetchInterval: 30_000 });
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [status, setStatus] = useState<ContactMessage['status']>('new');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const addToast = useUiStore((state) => state.addToast);

  const messages = query.data || [];

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedMessages,
    totalItems: totalMessagesCount,
  } = useAdminPagination(messages, 15);

  if (query.isLoading || query.error) return <AdminDataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;

  const open = (message: ContactMessage) => { setSelected(message); setStatus(message.status); setNote(message.internal_note || ''); };
  const save = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateContactMessage(selected.id, status, note);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      setSelected(updated);
      addToast('Enquiry status updated', 'success');
    } catch (error) { addToast(error instanceof Error ? error.message : 'Enquiry could not be updated', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col items-start gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-blue">Customer operations</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-dark">Enquiry Inbox</h1>
          <p className="mt-1 text-sm text-gray-500">Live contact requests with ownership and resolution status.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => query.refetch()} isLoading={query.isFetching}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {messages.length === 0 ? (
        <AdminDataState empty emptyTitle="No customer enquiries" emptyDescription="New website contact requests will appear here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 select-none">
                <tr>
                  <th className="p-3.5">Received</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Message</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedMessages.map((message) => (
                  <tr key={message.id} onClick={() => open(message)} className="cursor-pointer hover:bg-blue-50/30 transition-colors">
                    <td className="p-3.5 font-mono">{formatDateUK(message.created_at)}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-dark">{message.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{message.email}</p>
                    </td>
                    <td className="p-3.5 font-mono">{message.order_reference || '—'}</td>
                    <td className="max-w-sm truncate p-3.5 text-gray-600">{message.message}</td>
                    <td className="p-3.5">
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 font-mono text-[10px] uppercase font-bold text-gray-700">
                        {message.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalMessagesCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            itemLabel="enquiries"
          />
        </div>
      )}

      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Enquiry from ${selected.name}` : 'Enquiry'} description={selected?.email} maxWidth="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 whitespace-pre-wrap text-gray-700 text-xs leading-relaxed">
              {selected.message}
            </div>
            {selected.order_reference && (
              <p className="font-mono text-xs">Order reference: <strong className="text-dark">{selected.order_reference}</strong></p>
            )}
            <label className="block text-xs font-semibold uppercase text-gray-600">
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContactMessage['status'])}
                className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 normal-case outline-none focus:border-brand-blue"
              >
                <option value="new">New</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase text-gray-600">
              Internal note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 min-h-24 w-full rounded-md border border-gray-300 p-3 normal-case outline-none focus:border-brand-blue text-xs"
                placeholder="Log internal notes regarding customer enquiry resolution..."
              />
            </label>
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="secondary" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={save} isLoading={saving}>Save status</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
