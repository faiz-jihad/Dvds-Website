import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Mail,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  Package,
  X,
  Filter,
} from 'lucide-react';
import { adminApi, ContactMessage } from '../../lib/adminApi';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateUK, formatDateTimeUK, cn } from '../../lib/formatters';
import { useUiStore } from '../../stores/useUiStore';

export const AdminSupport: React.FC = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['admin', 'contact-messages'],
    queryFn: adminApi.getContactMessages,
    refetchInterval: 30_000,
  });

  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [status, setStatus] = useState<ContactMessage['status']>('new');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const addToast = useUiStore((state) => state.addToast);
  const messages = query.data || [];

  // KPI counts
  const stats = useMemo(() => {
    const total = messages.length;
    const newCount = messages.filter((m) => m.status === 'new').length;
    const inProgressCount = messages.filter((m) => m.status === 'in_progress').length;
    const resolvedCount = messages.filter((m) => m.status === 'resolved').length;
    return { total, newCount, inProgressCount, resolvedCount };
  }, [messages]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    let result = messages;

    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.order_reference && m.order_reference.toLowerCase().includes(q)) ||
          m.message.toLowerCase().includes(q) ||
          (m.internal_note && m.internal_note.toLowerCase().includes(q))
      );
    }

    return result;
  }, [messages, statusFilter, searchQuery]);

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedMessages,
    totalItems: totalMessagesCount,
  } = useAdminPagination(filteredMessages, 15);

  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast(`${label} copied to clipboard`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const openMessage = (message: ContactMessage) => {
    setSelected(message);
    setStatus(message.status);
    setNote(message.internal_note || '');
    setShowDeleteConfirm(false);
  };

  const saveStatus = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const updated = await adminApi.updateContactMessage(selected.id, status, note);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      setSelected(updated);
      addToast('Enquiry updated successfully', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Enquiry could not be updated', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      await adminApi.deleteContactMessage(selected.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast('Enquiry deleted successfully', 'success');
      setSelected(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not delete enquiry', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const quickUpdateStatus = async (e: React.MouseEvent, msg: ContactMessage, newStatus: ContactMessage['status']) => {
    e.stopPropagation();
    try {
      await adminApi.updateContactMessage(msg.id, newStatus, msg.internal_note || '');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
      addToast(`Marked as ${newStatus.replace('_', ' ')}`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not update status', 'error');
    }
  };

  const renderStatusBadge = (msgStatus: ContactMessage['status']) => {
    switch (msgStatus) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            New
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
            {msgStatus}
          </span>
        );
    }
  };

  if (query.isLoading || query.error) {
    return <AdminDataState loading={query.isLoading} error={query.error} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start gap-4 border-b border-gray-200 dark:border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">
            CUSTOMER ENQUIRIES · SUPPORT DESK
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Customer Enquiries
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage incoming contact requests, customer inquiries, and order queries.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => query.refetch()}
          isLoading={query.isFetching}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div
          onClick={() => setStatusFilter('all')}
          className={cn(
            'cursor-pointer rounded-xl border p-4 transition-all',
            statusFilter === 'all'
              ? 'border-brand-blue bg-blue-50/40 dark:bg-blue-900/10 dark:border-blue-500/40'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:border-gray-300 dark:hover:border-white/20'
          )}
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs font-medium">
            <span>Total Enquiries</span>
            <Mail className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">{stats.total}</p>
        </div>

        <div
          onClick={() => setStatusFilter('new')}
          className={cn(
            'cursor-pointer rounded-xl border p-4 transition-all',
            statusFilter === 'new'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-500/40'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:border-gray-300 dark:hover:border-white/20'
          )}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>New / Awaiting</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {stats.newCount}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={cn(
            'cursor-pointer rounded-xl border p-4 transition-all',
            statusFilter === 'in_progress'
              ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-900/10 dark:border-blue-500/40'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:border-gray-300 dark:hover:border-white/20'
          )}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-medium">
            <span>In Progress</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {stats.inProgressCount}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter('resolved')}
          className={cn(
            'cursor-pointer rounded-xl border p-4 transition-all',
            statusFilter === 'resolved'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10 dark:border-emerald-500/40'
              : 'border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] hover:border-gray-300 dark:hover:border-white/20'
          )}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span>Resolved</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.resolvedCount}
          </p>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, email, order ref, message..."
            className="h-10 w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] pl-10 pr-9 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-brand-blue dark:focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-1 text-xs">
          {(
            [
              { id: 'all', label: 'All', count: stats.total },
              { id: 'new', label: 'New', count: stats.newCount },
              { id: 'in_progress', label: 'In Progress', count: stats.inProgressCount },
              { id: 'resolved', label: 'Resolved', count: stats.resolvedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-medium transition-all text-xs',
                statusFilter === tab.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold',
                  statusFilter === tab.id
                    ? 'bg-gray-800 text-gray-200 dark:bg-gray-200 dark:text-gray-800'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Table or Empty State */}
      {messages.length === 0 ? (
        <AdminDataState
          empty
          emptyTitle="No customer enquiries yet"
          emptyDescription="Contact requests submitted through the storefront contact form will appear here."
        />
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 bg-white dark:bg-[#0E131F] p-12 text-center">
          <Filter className="mx-auto h-8 w-8 text-gray-400" />
          <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">No matching enquiries</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            No messages matched your current search and filter settings.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#141A26] text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10 select-none">
                <tr>
                  <th className="p-3.5">Received</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Message Snippet</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedMessages.map((message) => (
                  <tr
                    key={message.id}
                    onClick={() => openMessage(message)}
                    className="cursor-pointer hover:bg-blue-50/30 dark:hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-3.5 font-mono text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDateUK(message.created_at)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs">
                          {message.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{message.name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{message.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {message.order_reference ? (
                        <span className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                          <Package className="h-3 w-3 text-gray-400" />
                          {message.order_reference}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="max-w-md p-3.5">
                      <p className="line-clamp-2 text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                        {message.message}
                      </p>
                      {message.internal_note && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          <MessageSquare className="h-2.5 w-2.5" />
                          Note: {message.internal_note}
                        </p>
                      )}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">{renderStatusBadge(message.status)}</td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {message.status !== 'resolved' ? (
                          <button
                            title="Quick mark as resolved"
                            onClick={(e) => quickUpdateStatus(e, message, 'resolved')}
                            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131826] p-1.5 text-gray-500 hover:text-emerald-600 hover:border-emerald-500/40 dark:hover:text-emerald-400 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            title="Reopen enquiry"
                            onClick={(e) => quickUpdateStatus(e, message, 'in_progress')}
                            className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#131826] p-1.5 text-gray-500 hover:text-blue-600 hover:border-blue-500/40 dark:hover:text-blue-400 transition-colors"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Button size="xs" variant="secondary" onClick={() => openMessage(message)}>
                          View
                        </Button>
                      </div>
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

      {/* Detail & Response Modal */}
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          setShowDeleteConfirm(false);
        }}
        title={selected ? `Enquiry from ${selected.name}` : 'Customer Enquiry'}
        description={selected ? `Received on ${formatDateTimeUK(selected.created_at)}` : undefined}
        maxWidth="xl"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            {/* Customer Header Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3.5">
              <div className="space-y-0.5">
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  {selected.name}
                  {renderStatusBadge(selected.status)}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                  <span>{selected.email}</span>
                  <button
                    onClick={() => handleCopy(selected.email, 'email', 'Customer email')}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    title="Copy email"
                  >
                    {copiedKey === 'email' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${selected.email}?subject=Regarding your enquiry - DVDs Zone${
                    selected.order_reference ? ` (${selected.order_reference})` : ''
                  }`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue/90 transition-colors shadow-xs"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Reply via Email
                </a>

                {selected.order_reference && (
                  <Link
                    to={`/admin/orders?search=${encodeURIComponent(selected.order_reference)}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-[#131826] px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                  >
                    <Package className="h-3.5 w-3.5" />
                    View Order
                    <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                  </Link>
                )}
              </div>
            </div>

            {/* Order Reference callout if any */}
            {selected.order_reference && (
              <div className="flex items-center justify-between rounded-lg bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20 px-3.5 py-2 text-xs">
                <span className="text-blue-800 dark:text-blue-300 font-medium">
                  Associated Order Reference: <strong className="font-mono">{selected.order_reference}</strong>
                </span>
                <button
                  onClick={() => handleCopy(selected.order_reference!, 'orderRef', 'Order reference')}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                >
                  {copiedKey === 'orderRef' ? 'Copied!' : 'Copy ref'}
                </button>
              </div>
            )}

            {/* Customer Message Body */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Customer Message
              </label>
              <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] p-4 text-xs leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selected.message}
              </div>
            </div>

            {/* Resolution Status Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Update Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContactMessage['status'])}
                  className="mt-1.5 h-10 w-full rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#131826] text-gray-900 dark:text-white px-3 text-xs outline-none focus:border-brand-blue"
                >
                  <option value="new">New (Awaiting response)</option>
                  <option value="in_progress">In Progress (Being handled)</option>
                  <option value="resolved">Resolved (Complete)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  Last Updated
                </label>
                <div className="mt-1.5 h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 flex items-center text-xs font-mono text-gray-500 dark:text-gray-400">
                  {selected.updated_at ? formatDateTimeUK(selected.updated_at) : 'Not updated'}
                </div>
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                Internal Staff Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 min-h-20 w-full rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#131826] text-gray-900 dark:text-white p-3 text-xs outline-none focus:border-brand-blue"
                placeholder="Log internal notes regarding customer enquiry resolution, customer phone calls, or replacement parts..."
              />
            </div>

            {/* Delete Confirmation Box */}
            {showDeleteConfirm && (
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/70 dark:bg-red-950/20 p-3.5 space-y-2">
                <p className="text-xs font-medium text-red-700 dark:text-red-300">
                  Are you sure you want to delete this enquiry? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button size="xs" variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleDelete}
                    isLoading={deleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Confirm Delete
                  </Button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/10 pt-4">
              <div>
                {!showDeleteConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Enquiry
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button onClick={saveStatus} isLoading={saving}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

