import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Send,
  Plus,
  Trash2,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  Package,
  Layers,
  TrendingUp,
  Percent,
  HelpCircle,
  Clock,
  ExternalLink,
  Search,
  Filter,
  DollarSign,
  Building2,
  FileText,
  Truck,
  Check,
  Disc,
} from 'lucide-react';
import { reportsApi, BusinessReportData, BusinessExpense } from '../../lib/reportsApi';
import { formatGBP, formatDateUK, cn } from '../../lib/formatters';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { Button } from '../../components/common/Button';

export const AdminReports: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedRange, setSelectedRange] = useState<'this_week' | 'weekly' | 'this_month' | 'monthly' | 'custom'>('this_week');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('all');
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
        text: `Financial report statement successfully dispatched to ${data.emailResult?.recipient || 'Business Owner'}`,
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-report-history'] });
      setTimeout(() => setActionMessage(null), 6000);
    },
    onError: (err: any) => {
      setActionMessage({
        text: `Dispatch failed: ${err.message}`,
        type: 'error',
      });
      setTimeout(() => setActionMessage(null), 6000);
    },
  });

  // Resend Report Mutation
  const resendMutation = useMutation({
    mutationFn: (id: string) => reportsApi.resendReport(id),
    onSuccess: () => {
      setActionMessage({ text: 'Report statement resent successfully.', type: 'success' });
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
      setActionMessage({ text: 'Expenditure entry logged to ledger.', type: 'success' });
      setTimeout(() => setActionMessage(null), 4000);
    },
    onError: (err: any) => {
      alert(`Could not log expense: ${err.message}`);
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

  // Filtered expenses list
  const filteredExpenses = useMemo(() => {
    if (expenseFilterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === expenseFilterCategory);
  }, [expenses, expenseFilterCategory]);

  // CSV Export utility
  const handleExportCsv = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push('DVDS ZONE - FINANCIAL & OPERATING REPORT STATEMENT');
    lines.push(`Period Start,${report.periodStart}`);
    lines.push(`Period End,${report.periodEnd}`);
    lines.push(`Generated At,${report.generatedAt}`);
    lines.push(`Jurisdiction,United Kingdom (GBP £)`);
    lines.push('');
    lines.push('--- REVENUE & TURNOVER RECONCILIATION ---');
    lines.push('Accounting Line Item,Type,Amount (GBP),Percentage');
    lines.push(`Gross Sales (Settled Orders),Gross Revenue,${report.summary.grossRevenue.toFixed(2)},100.0%`);
    lines.push(`Less Processed Refunds,Deduction,-${report.summary.refunds.toFixed(2)},${report.summary.grossRevenue > 0 ? ((report.summary.refunds / report.summary.grossRevenue) * 100).toFixed(1) : 0}%`);
    lines.push(`Net Realised Turnover,Subtotal,${report.summary.revenue.toFixed(2)},${report.summary.grossRevenue > 0 ? ((report.summary.revenue / report.summary.grossRevenue) * 100).toFixed(1) : 0}%`);
    if (report.summary.hasCogs) {
      lines.push(`Less Product Cost of Goods Sold (COGS),Deduction,-${report.summary.cogs.toFixed(2)},${report.summary.grossRevenue > 0 ? ((report.summary.cogs / report.summary.grossRevenue) * 100).toFixed(1) : 0}%`);
    }
    lines.push(`Less Logged Operating Expenditures (OPEX),Deduction,-${report.summary.totalExpenses.toFixed(2)},${report.summary.grossRevenue > 0 ? ((report.summary.totalExpenses / report.summary.grossRevenue) * 100).toFixed(1) : 0}%`);
    lines.push(`Net Trading Position (${report.summary.resultLabel}),Net Result,${report.summary.netResult.toFixed(2)},${report.summary.grossRevenue > 0 ? ((report.summary.netResult / report.summary.grossRevenue) * 100).toFixed(1) : 0}%`);
    lines.push('');
    lines.push('--- OPERATIONAL VOLUMES ---');
    lines.push(`Settled Transactions,${report.summary.ordersCount}`);
    lines.push(`Physical DVD Discs Sold,${report.summary.itemsSold}`);
    lines.push(`Average Basket Realisation (AOV),${report.summary.averageOrderValue.toFixed(2)}`);
    lines.push('');
    lines.push('--- TOP SELLING PRODUCTS ---');
    lines.push('Rank,SKU,Title,Units Sold,Gross Turnover (GBP)');
    report.topProducts.forEach((p, idx) => {
      lines.push(`${idx + 1},"${(p.sku || '').replace(/"/g, '""')}","${p.title.replace(/"/g, '""')}",${p.unitsSold},${p.revenue.toFixed(2)}`);
    });
    lines.push('');
    lines.push('--- LOGGED OPERATING EXPENDITURES ---');
    lines.push('Date,Category,Description,Amount (GBP),Notes');
    expenses.forEach((e) => {
      lines.push(`"${e.date}","${e.category}","${e.description.replace(/"/g, '""')}",${e.amount.toFixed(2)},"${(e.notes || '').replace(/"/g, '""')}"`);
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DVDs-Zone-Financial-Ledger-${report.periodStart}-to-${report.periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || error || !report) {
    return <AdminDataState loading={isLoading} error={error} onRetry={() => refetch()} />;
  }

  const { summary, topProducts, orderStatuses, weeklyTrend } = report;

  // Order status total count for distribution bar
  const totalOrdersInPipeline =
    orderStatuses.paid +
    orderStatuses.processing +
    orderStatuses.shipped +
    orderStatuses.delivered +
    orderStatuses.refunded +
    orderStatuses.cancelled;

  const refundRatePct =
    summary.grossRevenue > 0 ? ((summary.refunds / summary.grossRevenue) * 100).toFixed(1) : '0.0';
  const marginPct =
    summary.grossRevenue > 0 ? ((summary.netResult / summary.grossRevenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 max-w-7xl pb-20 print:p-0 print:space-y-4">
      {/* ── Formal Printable Header (visible on print only) ────────────────────────── */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">DVDS ZONE</h1>
            <p className="text-xs text-gray-600">Trading Performance & Cash Accounting Statement</p>
            <p className="text-[10px] text-gray-500 mt-1">United Kingdom · Retail Physical Media Merchant</p>
          </div>
          <div className="text-right text-xs font-mono">
            <div>Period: {formatDateUK(report.periodStart)} — {formatDateUK(report.periodEnd)}</div>
            <div>Generated: {new Date(report.generatedAt).toLocaleString('en-GB')}</div>
            <div>Currency: GBP (£)</div>
          </div>
        </div>
      </div>

      {/* ── Screen Page Header: Authoritative Financial Tone ──────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              DVDs Zone · Accounts & Reporting
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger Sync
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight mt-1">
            Financial Statements & Performance Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cash basis turnover reconciliation, recorded operating expenditure ledger, and automated reporting audit.
          </p>
        </div>

        {/* Practical Accounting Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setExpenseModalOpen(true)}
            className="gap-1.5 cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Record Expense</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 cursor-pointer font-medium"
            title="Download CSV statement for spreadsheet review"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 cursor-pointer font-medium"
            title="Print or save PDF formal statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
            <span>Print / PDF</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
            className="gap-1.5 shadow-xs cursor-pointer font-medium"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{emailMutation.isPending ? 'Dispatching...' : 'Dispatch to Owner'}</span>
          </Button>
        </div>
      </div>

      {/* Action Flash Message */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all print:hidden ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ── Accounting Period Segmented Filter ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'this_week', label: 'This Week' },
            { id: 'weekly', label: 'Last Week (Mon–Sun)' },
            { id: 'this_month', label: 'This Month' },
            { id: 'monthly', label: 'Last Month' },
            { id: 'custom', label: 'Custom Date Range' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRange(tab.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                selectedRange === tab.id
                  ? 'bg-slate-900 text-white dark:bg-brand-blue dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {selectedRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium text-[11px]">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/10 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-400 font-medium text-[11px]">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/10 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
            />
          </div>
        )}

        <div className="flex items-center gap-2 px-2 text-xs font-mono text-slate-500 dark:text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {formatDateUK(report.periodStart)} — {formatDateUK(report.periodEnd)}
          </span>
        </div>
      </div>

      {/* ── High-Density Financial Ledger Statement ─────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-2">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-blue" />
              <span>Turnover Reconciliation & Trading Position</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cash Accounting Reconciliation · Figures presented in Pounds Sterling (£ GBP)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-white/10">
              {summary.resultLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-5">
          {/* Detailed Double-Entry Accounting Ledger (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-2 px-1">Reconciliation Line Item</th>
                    <th className="py-2 px-2 text-center w-24">Classification</th>
                    <th className="py-2 px-2 text-right w-28">Amount (£)</th>
                    <th className="py-2 px-2 text-right w-20">% of Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {/* Gross Sales */}
                  <tr>
                    <td className="py-2.5 px-1 font-medium text-slate-900 dark:text-slate-100">
                      <div>Gross Sales (Settled Orders)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {summary.ordersCount} confirmed paid transactions via checkout
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold">
                        Revenue
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatGBP(summary.grossRevenue)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-500 text-[11px]">
                      100.0%
                    </td>
                  </tr>

                  {/* Refunds */}
                  <tr>
                    <td className="py-2.5 px-1 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-600 dark:text-rose-400 font-mono">−</span>
                        <span>Less Customer Refunds Issued</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Credit reimbursements and cancellations settled
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">
                        Deduction
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      -{formatGBP(summary.refunds)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 text-[11px]">
                      -{refundRatePct}%
                    </td>
                  </tr>

                  {/* Net Sales Subtotal */}
                  <tr className="bg-slate-50/70 dark:bg-white/[0.02] font-semibold border-y border-slate-200 dark:border-white/10">
                    <td className="py-2 px-1 text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                      Net Realised Sales Turnover
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-slate-200 dark:bg-white/20 text-slate-800 dark:text-slate-200 font-bold">
                        Subtotal
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {formatGBP(summary.revenue)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 text-[11px]">
                      {summary.grossRevenue > 0
                        ? ((summary.revenue / summary.grossRevenue) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </td>
                  </tr>

                  {/* COGS (if recorded) */}
                  {summary.hasCogs ? (
                    <tr>
                      <td className="py-2.5 px-1 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="text-rose-600 dark:text-rose-400 font-mono">−</span>
                          <span>Less Cost of Goods Sold (COGS)</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Registered stock purchase cost of physical media units
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">
                          Direct Cost
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                        -{formatGBP(summary.cogs)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 text-[11px]">
                        -{summary.grossRevenue > 0 ? ((summary.cogs / summary.grossRevenue) * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  ) : null}

                  {/* Operating Expenses */}
                  <tr>
                    <td className="py-2.5 px-1 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-600 dark:text-rose-400 font-mono">−</span>
                        <span>Less Logged Operating Expenditures (OPEX)</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Postage, packaging, Stripe fees, hosting, and marketing
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">
                        Overheads
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                      -{formatGBP(summary.totalExpenses)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400 text-[11px]">
                      -{summary.grossRevenue > 0 ? ((summary.totalExpenses / summary.grossRevenue) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>

                  {/* Net Trading Result (Accounting Double Line Bottom) */}
                  <tr className="border-t-2 border-b-4 border-double border-slate-900 dark:border-slate-100 bg-slate-50/50 dark:bg-white/[0.03]">
                    <td className="py-3 px-1">
                      <div className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                        {summary.resultLabel}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Realised net operating contribution for selected period
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-blue-300 font-bold">
                        Net Margin
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {formatGBP(summary.netResult)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular-nums font-bold text-xs text-brand-blue dark:text-blue-400">
                      {marginPct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Accounting Disclosure & Notes Box (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 p-5 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold pb-2 border-b border-slate-200/60 dark:border-white/10">
                <Building2 size={15} className="text-brand-blue" />
                <span>Basis of Preparation & Accounting Principles</span>
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                This statement applies standard <strong>UK Cash Accounting</strong> principles. Revenue is recognized
                strictly upon Stripe settlement confirmation or verified direct clearing.
              </p>
              <div className="p-3 rounded-lg bg-white dark:bg-[#131826] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-slate-400" />
                  <span>Cost of Goods Sold (COGS) Policy</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  {summary.hasCogs
                    ? 'Catalog items include registered supplier acquisition costs, allowing accurate gross margin computation.'
                    : 'Physical DVD acquisition costs are not catalogued individually. The metric is formally designated "Net Realised After Recorded Expenses" to maintain strict accounting accuracy.'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Recorded OPEX entries:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {report.expenses.items.length} items logged ({formatGBP(summary.totalExpenses)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Operational Indicators Strip ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Settled Orders</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl text-slate-900 dark:text-white tabular-nums">
            {summary.ordersCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Confirmed customer checkouts
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Physical Discs Sold</span>
            <Disc className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="font-mono font-extrabold text-2xl text-slate-900 dark:text-white tabular-nums">
            {summary.itemsSold}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Individual DVD units fulfilled
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Average Basket (AOV)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl text-slate-900 dark:text-white tabular-nums">
            {formatGBP(summary.averageOrderValue)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Average net value per order
          </div>
        </div>

        <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Refund Rate</span>
            <Percent className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-mono font-extrabold text-2xl text-slate-900 dark:text-white tabular-nums">
            {refundRatePct}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Total {formatGBP(summary.refunds)} reimbursed
          </div>
        </div>
      </div>

      {/* ── Order Fulfillment Pipeline Distribution ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Order Fulfillment & Lifecycle Pipeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of orders across processing, fulfillment, and settlement stages
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Total: {totalOrdersInPipeline} orders
          </span>
        </div>

        {/* Visual segmented distribution bar */}
        {totalOrdersInPipeline > 0 && (
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-white/10 mb-4">
            <div
              style={{ width: `${(orderStatuses.paid / totalOrdersInPipeline) * 100}%` }}
              className="bg-emerald-500 transition-all"
              title={`Paid: ${orderStatuses.paid}`}
            />
            <div
              style={{ width: `${(orderStatuses.processing / totalOrdersInPipeline) * 100}%` }}
              className="bg-sky-500 transition-all"
              title={`Processing: ${orderStatuses.processing}`}
            />
            <div
              style={{ width: `${(orderStatuses.shipped / totalOrdersInPipeline) * 100}%` }}
              className="bg-indigo-500 transition-all"
              title={`Shipped: ${orderStatuses.shipped}`}
            />
            <div
              style={{ width: `${(orderStatuses.delivered / totalOrdersInPipeline) * 100}%` }}
              className="bg-purple-500 transition-all"
              title={`Delivered: ${orderStatuses.delivered}`}
            />
            <div
              style={{ width: `${(orderStatuses.refunded / totalOrdersInPipeline) * 100}%` }}
              className="bg-rose-500 transition-all"
              title={`Refunded: ${orderStatuses.refunded}`}
            />
            <div
              style={{ width: `${(orderStatuses.cancelled / totalOrdersInPipeline) * 100}%` }}
              className="bg-slate-400 transition-all"
              title={`Cancelled: ${orderStatuses.cancelled}`}
            />
          </div>
        )}

        {/* Status Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              Paid / Settled
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
              {orderStatuses.paid}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-sky-200/70 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-400">
              Processing
            </div>
            <div className="text-xl font-mono font-extrabold text-sky-700 dark:text-sky-300 mt-1">
              {orderStatuses.processing}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-indigo-200/70 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
              Dispatched / Transit
            </div>
            <div className="text-xl font-mono font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
              {orderStatuses.shipped}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-purple-200/70 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400">
              Delivered
            </div>
            <div className="text-xl font-mono font-extrabold text-purple-700 dark:text-purple-300 mt-1">
              {orderStatuses.delivered}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
              Refunded
            </div>
            <div className="text-xl font-mono font-extrabold text-rose-700 dark:text-rose-300 mt-1">
              {orderStatuses.refunded}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Cancelled / Expired
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-700 dark:text-slate-300 mt-1">
              {orderStatuses.cancelled}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly Trend (Shown on Monthly / Multi-week views) ──────────────────── */}
      {weeklyTrend && weeklyTrend.length > 0 && (
        <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs">
          <div className="border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Turnover Progression (Weekly Cadence)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparison across consecutive 7-day intervals
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {weeklyTrend.map((w, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{w.label}</div>
                <div className="font-mono font-bold text-xl text-slate-900 dark:text-white mt-1 tabular-nums">
                  {formatGBP(w.revenue)}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {w.ordersCount} settled order{w.ordersCount !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Catalog Items Performance ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Disc className="w-4 h-4 text-brand-blue" />
              <span>Catalog Sales Performance</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Inventory velocity and revenue contribution ranked by physical disc units sold
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {topProducts.length} product{topProducts.length !== 1 ? 's' : ''} recorded
          </span>
        </div>

        {topProducts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs italic">
            No product transactions recorded during this accounting window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3">Product / Disc Title</th>
                  <th className="py-2.5 px-3 w-32">SKU Code</th>
                  <th className="py-2.5 px-3 text-center w-28">Units Sold</th>
                  <th className="py-2.5 px-3 text-right w-32">Turnover (£)</th>
                  <th className="py-2.5 px-3 text-right w-24">Share %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {topProducts.map((p, idx) => {
                  const sharePct =
                    summary.grossRevenue > 0 ? ((p.revenue / summary.grossRevenue) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                        {p.title}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {p.sku || '—'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {p.unitsSold}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatGBP(p.revenue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Operating Expenditures (OPEX) Ledger ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-4 gap-3">
          <div>
            <h2 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-blue" />
              <span>Bookkeeping: Logged Operating Expenditures</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Royal Mail postage, packaging, Stripe transaction fees, hosting, and operational costs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setExpenseModalOpen(true)}
              className="gap-1.5 cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4 text-xs">
          {[
            { id: 'all', label: 'All Categories' },
            { id: 'shipping', label: 'Shipping' },
            { id: 'packaging', label: 'Packaging' },
            { id: 'stripe_fees', label: 'Stripe Fees' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'marketing', label: 'Marketing' },
            { id: 'website_domain', label: 'Domain' },
            { id: 'vps_hosting', label: 'Hosting' },
            { id: 'other', label: 'Other' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setExpenseFilterCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer',
                expenseFilterCategory === cat.id
                  ? 'bg-slate-900 text-white dark:bg-white/20 dark:text-white font-semibold'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs italic">
            No expenditures recorded matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3 w-28">Date</th>
                  <th className="py-2.5 px-3 w-36">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Invoice / Ref Notes</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount (£)</th>
                  <th className="py-2.5 px-3 w-12 text-center print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {formatDateUK(e.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10">
                        {e.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                      {e.description}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      {e.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatGBP(e.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete expense record "${e.description}"?`)) {
                            deleteExpenseMutation.mutate(e.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Delete expense entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] font-semibold">
                  <td colSpan={4} className="py-2.5 px-3 text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
                    Total Filtered OPEX
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    -{formatGBP(filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0))}
                  </td>
                  <td className="print:hidden"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Executive Report Dispatch Audit Log ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0E131F] border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 shadow-2xs print:hidden">
        <div className="border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
          <h2 className="font-display font-bold text-base text-slate-900 dark:text-white">
            Automated Report Dispatch Audit Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of automated weekly, monthly, and manual email dispatches to the business owner
          </p>
        </div>

        {reportHistory.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 italic py-6 text-center">
            No automated reports have been dispatched yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Statement Window</th>
                  <th className="py-2.5 px-3">Recipient Email</th>
                  <th className="py-2.5 px-3">Delivery Status</th>
                  <th className="py-2.5 px-3">Dispatched At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {reportHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono font-semibold uppercase text-brand-blue text-[11px]">
                      {h.report_type} Statement
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {formatDateUK(h.period_start)} — {formatDateUK(h.period_end)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {h.recipient}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase',
                          h.status === 'sent'
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : h.status === 'failed'
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {h.sent_at ? new Date(h.sent_at).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => resendMutation.mutate(h.id)}
                        disabled={resendMutation.isPending}
                        className="text-xs font-semibold text-brand-blue hover:underline inline-flex items-center gap-1 cursor-pointer"
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

      {/* ── Modal: Record Business Operating Expense ─────────────────────────────── */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E131F] rounded-2xl border border-slate-200 dark:border-white/15 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Log Operating Expenditure (OPEX)
              </h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Mail Tracked 48 batch postage labels"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  >
                    <option value="shipping">Shipping & Postage</option>
                    <option value="packaging">Packaging Materials</option>
                    <option value="stripe_fees">Stripe / Merchant Fees</option>
                    <option value="inventory">Inventory Stock Purchase</option>
                    <option value="marketing">Advertising & Marketing</option>
                    <option value="website_domain">Domain Registration</option>
                    <option value="vps_hosting">VPS & Server Hosting</option>
                    <option value="other">Other Overhead</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (£ GBP) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/15 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expenditure Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/15 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Ref / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Royal Mail Invoice RM-88291 / VAT ref"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#131826] border border-slate-200 dark:border-white/15 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExpenseModalOpen(false)}
                className="cursor-pointer"
              >
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
                className="cursor-pointer font-medium"
              >
                {addExpenseMutation.isPending ? 'Saving...' : 'Confirm Entry'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
