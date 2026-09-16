import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw } from 'lucide-react';
import { adminApi, ContactMessage } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
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

  if (query.isLoading || query.error) return <AdminDataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  const messages = query.data || [];
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
      <div className="flex flex-col items-start gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-xs uppercase tracking-widest text-brand-blue">Customer operations</p><h1 className="mt-1 font-display text-3xl font-extrabold text-dark">Enquiry Inbox</h1><p className="mt-1 text-sm text-gray-500">Live contact requests with ownership and resolution status.</p></div><Button size="sm" variant="secondary" onClick={() => query.refetch()} isLoading={query.isFetching}><RefreshCw className="mr-1 h-3.5 w-3.5" />Refresh</Button></div>
      {messages.length === 0 ? <AdminDataState empty emptyTitle="No customer enquiries" emptyDescription="New website contact requests will appear here." /> : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="p-3.5">Received</th><th className="p-3.5">Customer</th><th className="p-3.5">Order</th><th className="p-3.5">Message</th><th className="p-3.5">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{messages.map((message) => <tr key={message.id} onClick={() => open(message)} className="cursor-pointer hover:bg-gray-50"><td className="p-3.5">{formatDateUK(message.created_at)}</td><td className="p-3.5"><p className="font-semibold text-dark">{message.name}</p><p className="text-[10px] text-gray-400">{message.email}</p></td><td className="p-3.5 font-mono">{message.order_reference || '—'}</td><td className="max-w-sm truncate p-3.5 text-gray-600">{message.message}</td><td className="p-3.5"><span className="rounded bg-gray-100 px-2 py-1 font-mono text-[10px] uppercase">{message.status.replace('_', ' ')}</span></td></tr>)}</tbody></table></div>
      )}
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? `Enquiry from ${selected.name}` : 'Enquiry'} description={selected?.email} maxWidth="lg">
        {selected && <div className="space-y-4 text-sm"><div className="rounded-md border border-gray-200 bg-gray-50 p-4 whitespace-pre-wrap text-gray-700">{selected.message}</div>{selected.order_reference && <p className="font-mono text-xs">Order reference: {selected.order_reference}</p>}<label className="block text-xs font-semibold uppercase text-gray-600">Status<select value={status} onChange={(e) => setStatus(e.target.value as ContactMessage['status'])} className="mt-1.5 h-11 w-full rounded-md border border-gray-300 bg-white px-3 normal-case"><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label><label className="block text-xs font-semibold uppercase text-gray-600">Internal note<textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 min-h-24 w-full rounded-md border border-gray-300 p-3 normal-case" /></label><div className="flex justify-end"><Button onClick={save} isLoading={saving}>Save status</Button></div></div>}
      </Modal>
    </div>
  );
};
