import { formatMoney, countryName } from '../../../shared/commerce.js';
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PoundSterling,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Film,
  Plus,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { formatGBP, formatDateUK } from '../../lib/formatters';
import { Button } from '../../components/common/Button';
import { AdminDataState } from '../../components/admin/AdminDataState';

export const AdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getFinancialStats(),
    refetchInterval: 60_000,
  });

  if (isLoading || error || !stats) {
    return <AdminDataState loading={isLoading} error={error} onRetry={() => refetch()} />;
  }

  const maxDailyRevenue = Math.max(...stats.dailyRevenue.map((d) => d.amount), 50);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-brand-blue">
            FINANCIAL & STORE INTELLIGENCE
          </span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight mt-0.5">
            Admin Overview & Finances
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/admin/products">
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Add New Product
            </Button>
          </Link>
          <Link to="/admin/orders">
            <Button variant="secondary" size="sm">
              Manage Orders
            </Button>
          </Link>
        </div>
      </div>

      {!stats.settingsConfigured && (
        <div className="flex flex-col gap-4 rounded-lg border border-brand-red/30 bg-brand-red-soft dark:bg-brand-red/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" />
            <div>
              <p className="text-sm font-bold text-dark dark:text-white">Store settings not yet configured</p>
              <p className="mt-1 text-xs text-brand-red/90 dark:text-red-300/90">Sales and order metrics remain active. Configure delivery fees, low stock limits, and store identity to complete operational statistics.</p>
            </div>
          </div>
          <Link to="/admin/settings" className="shrink-0">
            <Button variant="secondary" size="sm">Configure now</Button>
          </Link>
        </div>
      )}

      {/* 4 Key Financial & Operational Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-[#0E131F] p-5 rounded-lg border border-gray-200 dark:border-white/10 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Revenue after refunds</span>
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <PoundSterling className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-dark dark:text-white font-mono">
            {formatGBP(stats.totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand-blue dark:text-blue-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Today: {formatGBP(stats.todayRevenue)}</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-[#0E131F] p-5 rounded-lg border border-gray-200 dark:border-white/10 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Total Orders</span>
            <div className="w-7 h-7 rounded-full bg-brand-blue-soft dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-dark dark:text-white font-mono">
            {stats.totalOrders}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {stats.todayOrders} placed today
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white dark:bg-[#0E131F] p-5 rounded-lg border border-gray-200 dark:border-white/10 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Avg Order Value</span>
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-dark dark:text-white font-mono">
            {formatGBP(stats.averageOrderValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Per paid UK basket
          </div>
        </div>

        {/* Low Stock Warning */}
        <div className="bg-white dark:bg-[#0E131F] p-5 rounded-lg border border-gray-200 dark:border-white/10 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold uppercase tracking-wider">Low Stock Titles</span>
            <div className="w-7 h-7 rounded-full bg-brand-red-soft dark:bg-brand-red/20 text-brand-red dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-brand-red dark:text-red-400 font-mono">
            {stats.lowStockCount}
          </div>
          <Link to="/admin/inventory" className="text-xs text-brand-blue dark:text-blue-400 hover:underline inline-block">
            Review stock levels →
          </Link>
        </div>
      </div>

      {/* Financial Revenue Trend Visualization */}
      <div className="bg-white dark:bg-[#0E131F] p-6 rounded-lg border border-gray-200 dark:border-white/10 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white">
              7-Day Daily Revenue Trend
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Financial performance based on processed customer payments
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-dark dark:text-white bg-gray-100 dark:bg-[#141A26] border border-transparent dark:border-white/10 px-2.5 py-1 rounded-sm">
            GBP (£)
          </span>
        </div>

        {/* Styled Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-4 pt-4 px-2">
          {stats.dailyRevenue.map((day) => {
            const heightPercent = Math.max(8, Math.round((day.amount / maxDailyRevenue) * 100));
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatGBP(day.amount)}
                </span>
                <div className="w-full max-w-[48px] bg-gray-100 dark:bg-[#141A26] rounded-t-sm overflow-hidden flex items-end h-32">
                  <div
                    className="w-full bg-brand-blue hover:bg-brand-blue-hover transition-all duration-300 rounded-t-sm"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-gray-600 dark:text-gray-400">{day.date}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="bg-white dark:bg-[#0E131F] rounded-lg border border-gray-200 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-dark dark:text-white">Recent Customer Orders</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest dispatches requiring fulfilment</p>
          </div>
          <Link to="/admin/orders" className="text-xs font-semibold text-brand-blue dark:text-blue-400 hover:underline">
            View All Orders ({stats.totalOrders}) →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-gray-50 dark:bg-[#141A26] border-b border-gray-200 dark:border-white/10 font-semibold text-gray-700 dark:text-gray-300">
              <tr>
                <th className="p-3.5">Order No</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Payment</th>
                <th className="p-3.5">Fulfilment</th>
                <th className="p-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-dark dark:text-white">
                    <Link to={`/admin/orders`} className="hover:text-brand-blue dark:hover:text-blue-400">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="p-3.5">
                    <div className="font-medium text-dark dark:text-white">{order.shipping_address.full_name}</div>
                    <div className="text-[11px] text-gray-400 truncate max-w-xs">{order.email}</div>
                  </td>
                  <td className="p-3.5 text-gray-500 dark:text-gray-400">{formatDateUK(order.created_at)}</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-sm bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-semibold text-[10px] uppercase">
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-sm font-semibold text-[10px] uppercase ${
                        order.fulfilment_status === 'fulfilled'
                          ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {order.fulfilment_status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-bold text-dark dark:text-white">
                    {formatMoney(order.total_amount, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
