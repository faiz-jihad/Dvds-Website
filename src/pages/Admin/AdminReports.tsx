import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Send,
  Plus,
  Trash2,
  TrendingUp,
  Receipt,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  HelpCircle,
  PoundSterling,
  Package,
  Layers,
  FileText,
} from 'lucide-react';
import { reportsApi, BusinessReportData, BusinessExpense } from '../../lib/reportsApi';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';

export const AdminReports: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<'this_week' | 'weekly' | 'this_month' | 'monthly' | 'custom'>('this_week');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Expense form state
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'shipping' as BusinessExpense['category'],
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Query report data
  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-report', selectedRange, customStart, customEnd],
    queryFn: () =>
      reportsApi.getReport(
        selectedRange,
        selectedRange === 'custom' ? customStart : undefined,
        selectedRange === 'custom' ? customEnd : undefined
      ),
  });

  // Query expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['admin-expenses'],
    queryFn: () => reportsApi.getExpenses(),
  });

  // Query report history
  const { data: reportHistory = [] } = useQuery({
    queryKey: ['admin-report-history'],
    queryFn: () => reportsApi.getReportHistory(),
  });

  // Trigger Report Email Mutation
  const emailMutation = useMutation({
    mutationFn: () =>
      reportsApi.triggerReportEmail(
        selectedRange,
        selectedRange === 'custom' ? customStart : undefined,
        selectedRange === 'custom' ? customEnd : undefined
      ),
    onSuccess: (data) => {
      setActionMessage({
        text: `Report successfully dispatched to ${data.emailResult?.recipient || 'Admin Email'}!`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-report-history'] });
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err: any) => {
      setActionMessage({
        text: `Failed to send report: ${err.message}`,
        type: 'error',
      });
      setTimeout(() => setActionMessage(null), 6000);
    },
  });

  // Resend Report Mutation
  const resendMutation = useMutation({
    mutationFn: (id: string) => reportsApi.resendReport(id),
    onSuccess: () => {
      setActionMessage({ text: 'Report resent successfully.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['admin-report-history'] });
      setTimeout(() => setActionMessage(null), 5000);
    },
    onError: (err: any) => {
      setActionMessage({ text: `Resend failed: ${err.message}`, type: 'error' });
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  // Add Expense Mutation
  const addExpenseMutation = useMutation({
    mutationFn: (payload: { description: string; category: string; amount: number; date: string; notes?: string }) =>
      reportsApi.addExpense(payload),
    onSuccess: () => {
      setExpenseModalOpen(false);
      setExpenseForm({
        description: '',
        category: 'shipping',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
      setActionMessage({ text: 'Expense recorded successfully.', type: 'success' });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(`Could not save expense: ${err.message}`);
    },
  });

  // Delete Expense Mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => reportsApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-report'] });
      queryClient.invalidateQueries({ queryKey: ['admin-expenses'] });
    },
  });

  if (isLoading || error || !report) {
    return <AdminDataState loading={isLoading} error={error} onRetry={() => refetch()} />;
  }

  const { summary, topProducts, orderStatuses, weeklyTrend } = report;

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-bold">
            EXECUTIVE INTELLIGENCE & PERFORMANCE
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
            Business Performance & Reports
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Authoritative financial metrics, sales summaries, and automated executive email reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpenseModalOpen(true)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
            className="gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{emailMutation.isPending ? 'Sending...' : 'Email Report to Admin'}</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Period Selection Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'this_week', label: 'This Week' },
            { id: 'weekly', label: 'Last Week (Mon-Sun)' },
            { id: 'this_month', label: 'This Month' },
            { id: 'monthly', label: 'Last Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRange(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedRange === tab.id
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 border border-gray-200 rounded-lg text-xs"
            />
          </div>
        )}

        <div className="text-xs text-gray-500 font-mono px-2">
          Period: {new Date(report.periodStart).toLocaleDateString('en-GB')} &rarr;{' '}
          {new Date(report.periodEnd).toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <PoundSterling className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="font-display font-extrabold text-2xl text-dark">
            {formatGBP(summary.revenue)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Gross: {formatGBP(summary.grossRevenue)}{' '}
            {summary.refunds > 0 && <span className="text-rose-600">(-{formatGBP(summary.refunds)} refunds)</span>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orders Paid</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-display font-extrabold text-2xl text-dark">
            {summary.ordersCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Confirmed & paid transactions
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Items Sold</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-display font-extrabold text-2xl text-dark">
            {summary.itemsSold}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Individual physical DVD units
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Order Value</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display font-extrabold text-2xl text-dark">
            {formatGBP(summary.averageOrderValue)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            Net revenue per paid basket
          </div>
        </div>
      </div>

      {/* Financial Summary & Expense Reconciliation Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <h2 className="font-display font-bold text-base text-dark flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-blue" />
            <span>Financial Performance & Net Breakdown</span>
          </h2>
          <span className="text-[11px] font-semibold text-gray-500 px-2.5 py-0.5 bg-gray-100 rounded-full">
            {summary.resultLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Gross Sales Revenue:</span>
              <span className="font-bold text-dark">{formatGBP(summary.grossRevenue)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Less Processed Refunds:</span>
              <span className="font-bold text-rose-600">-{formatGBP(summary.refunds)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Net Sales Revenue:</span>
              <span className="font-bold text-dark">{formatGBP(summary.revenue)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-600">Less Recorded Business Expenses:</span>
              <span className="font-bold text-rose-600">-{formatGBP(summary.totalExpenses)}</span>
            </div>
            {summary.hasCogs && (
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-600">Less Product Cost (COGS):</span>
                <span className="font-bold text-rose-600">-{formatGBP(summary.cogs)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-sm font-extrabold border-t-2 border-dark text-brand-blue">
              <span>{summary.resultLabel}:</span>
              <span>{formatGBP(summary.netResult)}</span>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-xl p-4 text-xs text-gray-600 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-dark flex items-center gap-1.5 mb-1.5">
                <HelpCircle size={14} className="text-brand-blue" />
                <span>Accounting Transparency Rule</span>
              </div>
              <p className="leading-relaxed text-[11px] text-gray-500">
                {summary.hasCogs
                  ? 'All purchased products possess registered cost data (COGS). This calculation reflects estimated gross profit.'
                  : 'Product unit costs (COGS) are not tracked for inventory items. This metric is strictly labeled "Net Revenue After Recorded Expenses" to prevent misleading accounting claims.'}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200/60 text-[11px] text-gray-500">
              Recorded business expenses: <strong>{formatGBP(summary.totalExpenses)}</strong> across {report.expenses.items.length} logged entry(s).
            </div>
          </div>
        </div>
      </div>

      {/* Top Products & Order Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <h2 className="font-display font-bold text-base text-dark flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-blue" />
              <span>Top Purchased Products</span>
            </h2>
            <span className="text-xs text-gray-500 font-medium">Ranked by units sold</span>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-6 text-center">
              No product purchases recorded during this period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-2 w-8">#</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3 text-center">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-2 font-mono font-bold text-gray-400">#{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-dark">{p.title}</div>
                        {p.sku && <div className="text-[10px] font-mono text-gray-400">{p.sku}</div>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-dark">{p.unitsSold}</td>
                      <td className="py-3 px-3 text-right font-bold text-brand-blue">
                        {formatGBP(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Status Breakdown (1 col) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="font-display font-bold text-base text-dark">
                Order Statuses
              </h2>
              <span className="text-xs text-gray-500 font-mono">This Period</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="font-medium text-emerald-900">Paid / Settled</span>
                <span className="font-bold text-emerald-700">{orderStatuses.paid}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="font-medium text-blue-900">Processing</span>
                <span className="font-bold text-blue-700">{orderStatuses.processing}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <span className="font-medium text-indigo-900">Shipped / Dispatched</span>
                <span className="font-bold text-indigo-700">{orderStatuses.shipped}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="font-medium text-purple-900">Delivered</span>
                <span className="font-bold text-purple-700">{orderStatuses.delivered}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                <span className="font-medium text-rose-900">Refunded</span>
                <span className="font-bold text-rose-700">{orderStatuses.refunded}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 border border-gray-200">
                <span className="font-medium text-gray-700">Cancelled / Expired</span>
                <span className="font-bold text-gray-700">{orderStatuses.cancelled}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 text-center">
            Automated sync with Stripe & Supabase
          </div>
        </div>
      </div>

      {/* Weekly Trend (if monthly view) */}
      {weeklyTrend && weeklyTrend.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
          <h2 className="font-display font-bold text-base text-dark mb-3">
            Monthly Sales Trend (Weekly Progression)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyTrend.map((w, i) => (
              <div key={i} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="text-[11px] font-semibold text-gray-500">{w.label}</div>
                <div className="font-display font-extrabold text-lg text-brand-blue mt-1">
                  {formatGBP(w.revenue)}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">{w.ordersCount} orders</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business Expenses Management Table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-base text-dark">
              Recorded Business Expenses
            </h2>
            <p className="text-xs text-gray-500">Track shipping, packaging, Stripe fees, and overheads.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setExpenseModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Expense
          </Button>
        </div>

        {expenses.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-6 text-center">
            No expense data recorded. Click &quot;Add Expense&quot; above to log business costs.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.slice(0, 20).map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-500">{e.date}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700">
                        {e.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-dark font-medium">{e.description}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {formatGBP(e.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteExpenseMutation.mutate(e.id)}
                        className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                        title="Delete expense"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Automated Report History & Dispatch Audit Log */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-2xs">
        <div className="border-b border-gray-100 pb-3 mb-4">
          <h2 className="font-display font-bold text-base text-dark">
            Report Dispatch History
          </h2>
          <p className="text-xs text-gray-500">Record of automated weekly and monthly reports sent to the business owner.</p>
        </div>

        {reportHistory.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4 text-center">
            No automated reports have been generated or dispatched yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Sent At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reportHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2.5 px-3 font-bold uppercase text-brand-blue">{h.report_type}</td>
                    <td className="py-2.5 px-3 text-gray-600">
                      {new Date(h.period_start).toLocaleDateString('en-GB')} &rarr;{' '}
                      {new Date(h.period_end).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-600">{h.recipient}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          h.status === 'sent'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'failed'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500">
                      {h.sent_at ? new Date(h.sent_at).toLocaleString('en-GB') : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => resendMutation.mutate(h.id)}
                        disabled={resendMutation.isPending}
                        className="text-xs font-semibold text-brand-blue hover:underline flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <RotateCcw size={11} />
                        <span>Resend</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="font-display font-bold text-lg text-dark">Record Business Expense</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Royal Mail batch shipping"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white"
                  >
                    <option value="shipping">Shipping</option>
                    <option value="packaging">Packaging</option>
                    <option value="stripe_fees">Stripe / Payment Fees</option>
                    <option value="inventory">Inventory Stock</option>
                    <option value="marketing">Marketing</option>
                    <option value="website_domain">Website / Domain</option>
                    <option value="vps_hosting">VPS / Hosting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Amount (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or invoice reference"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setExpenseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!expenseForm.description || !expenseForm.amount || addExpenseMutation.isPending}
                onClick={() =>
                  addExpenseMutation.mutate({
                    description: expenseForm.description,
                    category: expenseForm.category,
                    amount: parseFloat(expenseForm.amount),
                    date: expenseForm.date,
                    notes: expenseForm.notes || undefined,
                  })
                }
              >
                {addExpenseMutation.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
