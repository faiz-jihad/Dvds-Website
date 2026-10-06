import React, { useState, useMemo } from 'react';
import {
  Calendar,
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Info,
} from 'lucide-react';
import { formatGBP } from '../../lib/formatters';

export type TrendPeriod = '7d' | '30d' | 'month' | 'year';

interface BucketItem {
  key: string;
  label: string;
  fullDate: string;
  amount: number;
  orders: number;
}

interface RevenueTrendChartProps {
  dailyRevenue?: { date: string; amount: number; orders: number }[];
  allPaidOrders?: { id: string; date: string; amount: number; rawDate?: string }[];
}

const MONTHS = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Robust date comparison helper that matches ISO strings,
 * YYYY-MM-DD keys, and handles timezone conversions safely.
 */
function orderMatchesDay(orderDateStr: string, targetDayKey: string): boolean {
  if (!orderDateStr || !targetDayKey) return false;
  const cleanStr = String(orderDateStr).trim();

  // 1. Direct slice / string match
  if (cleanStr === targetDayKey || cleanStr.slice(0, 10) === targetDayKey) {
    return true;
  }

  // 2. Parsed Date local and UTC matching
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    const localKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (localKey === targetDayKey) return true;
    const utcKey = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    if (utcKey === targetDayKey) return true;
  }

  return false;
}

/**
 * Robust month comparison helper that checks both target prefix
 * and parsed Date representation.
 */
function orderMatchesMonth(orderDateStr: string, targetYear: number, targetMonth: number): boolean {
  if (!orderDateStr) return false;
  const cleanStr = String(orderDateStr).trim();
  const targetPrefix = `${targetYear}-${pad(targetMonth + 1)}`;
  if (cleanStr.startsWith(targetPrefix)) return true;

  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) return true;
    if (d.getUTCFullYear() === targetYear && d.getUTCMonth() === targetMonth) return true;
  }

  return false;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  dailyRevenue = [],
  allPaidOrders = [],
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [period, setPeriod] = useState<TrendPeriod>('7d');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Available years from historical orders or standard adjacent range
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYear, currentYear - 1]);
    (allPaidOrders || []).forEach((o) => {
      const dateStr = String(o?.rawDate || o?.date || '');
      const y = parseInt(dateStr.slice(0, 4), 10);
      if (!isNaN(y) && y >= 2020 && y <= currentYear + 2) yearsSet.add(y);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allPaidOrders, currentYear]);

  // Generate chart data buckets based on selected period
  const buckets: BucketItem[] = useMemo(() => {
    const ordersList = Array.isArray(allPaidOrders) ? allPaidOrders : [];

    // Fallback: If allPaidOrders is empty and dailyRevenue is provided for 7d
    if (period === '7d' && ordersList.length === 0 && dailyRevenue.length > 0) {
      return dailyRevenue.map((d, idx) => ({
        key: `dr-${idx}-${d.date}`,
        label: d.date,
        fullDate: d.date,
        amount: Number(d.amount) || 0,
        orders: Number(d.orders) || 0,
      }));
    }

    if (period === '7d') {
      const list: BucketItem[] = [];
      for (let offset = 6; offset >= 0; offset -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const y = d.getFullYear();
        const m = d.getMonth();
        const dayNum = d.getDate();
        const key = `${y}-${pad(m + 1)}-${pad(dayNum)}`;
        const label = `${dayNum} ${MONTHS[m]?.short || ''}`;
        const fullDate = `${dayNum} ${MONTHS[m]?.label || ''} ${y}`;

        const matching = ordersList.filter((o) =>
          orderMatchesDay(o?.rawDate || o?.date, key)
        );
        const amount = matching.reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);

        list.push({
          key,
          label,
          fullDate,
          amount: Math.round(amount * 100) / 100,
          orders: matching.length,
        });
      }
      return list;
    }

    if (period === '30d') {
      const list: BucketItem[] = [];
      for (let offset = 29; offset >= 0; offset -= 1) {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const y = d.getFullYear();
        const m = d.getMonth();
        const dayNum = d.getDate();
        const key = `${y}-${pad(m + 1)}-${pad(dayNum)}`;
        const label = `${dayNum} ${MONTHS[m]?.short || ''}`;
        const fullDate = `${dayNum} ${MONTHS[m]?.label || ''} ${y}`;

        const matching = ordersList.filter((o) =>
          orderMatchesDay(o?.rawDate || o?.date, key)
        );
        const amount = matching.reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);

        list.push({
          key,
          label,
          fullDate,
          amount: Math.round(amount * 100) / 100,
          orders: matching.length,
        });
      }
      return list;
    }

    if (period === 'month') {
      const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const list: BucketItem[] = [];
      const mLabel = MONTHS[selectedMonth]?.label || '';
      const mShort = MONTHS[selectedMonth]?.short || '';

      for (let day = 1; day <= daysInMonth; day += 1) {
        const key = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(day)}`;
        const label = `${day} ${mShort}`;
        const fullDate = `${day} ${mLabel} ${selectedYear}`;

        const matching = ordersList.filter((o) =>
          orderMatchesDay(o?.rawDate || o?.date, key)
        );
        const amount = matching.reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);

        list.push({
          key,
          label,
          fullDate,
          amount: Math.round(amount * 100) / 100,
          orders: matching.length,
        });
      }
      return list;
    }

    if (period === 'year') {
      const list: BucketItem[] = [];
      for (let m = 0; m < 12; m += 1) {
        const key = `${selectedYear}-${pad(m + 1)}`;
        const label = MONTHS[m]?.short || '';
        const fullDate = `${MONTHS[m]?.label || ''} ${selectedYear}`;

        const matching = ordersList.filter((o) =>
          orderMatchesMonth(o?.rawDate || o?.date, selectedYear, m)
        );
        const amount = matching.reduce((sum, o) => sum + (Number(o?.amount) || 0), 0);

        list.push({
          key,
          label,
          fullDate,
          amount: Math.round(amount * 100) / 100,
          orders: matching.length,
        });
      }
      return list;
    }

    return [];
  }, [period, selectedMonth, selectedYear, allPaidOrders, dailyRevenue]);

  // Aggregated summary metrics
  const totalPeriodRevenue = useMemo(
    () => Math.round(buckets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0) * 100) / 100,
    [buckets]
  );
  const totalPeriodOrders = useMemo(
    () => buckets.reduce((sum, b) => sum + (Number(b.orders) || 0), 0),
    [buckets]
  );
  const maxRevenue = useMemo(() => {
    const highest = Math.max(...buckets.map((b) => Number(b.amount) || 0), 0);
    return Math.max(highest, 50);
  }, [buckets]);

  const peakBucket = useMemo<BucketItem | null>(() => {
    return buckets.reduce<BucketItem | null>((peak, b) => {
      if (b.amount > 0 && (!peak || b.amount > peak.amount)) {
        return b;
      }
      return peak;
    }, null);
  }, [buckets]);

  // Dynamic titles in English
  const { title, subtitle } = useMemo(() => {
    if (period === '7d') {
      return {
        title: '7-Day Daily Revenue Trend',
        subtitle: 'Financial performance over the past 7 days based on settled customer transactions',
      };
    }
    if (period === '30d') {
      return {
        title: '30-Day Daily Revenue Trend',
        subtitle: 'Daily transaction performance across the past 30 operational days',
      };
    }
    if (period === 'month') {
      const mName = MONTHS[selectedMonth]?.label || '';
      return {
        title: `${mName} ${selectedYear} Daily Revenue Trend`,
        subtitle: `Complete day-by-day sales breakdown for ${mName} ${selectedYear}`,
      };
    }
    return {
      title: `${selectedYear} Annual Revenue Trend`,
      subtitle: `Monthly revenue distribution throughout the year ${selectedYear}`,
    };
  }, [period, selectedMonth, selectedYear]);

  const activeBucket: BucketItem | null =
    hoveredIndex !== null && buckets[hoveredIndex] ? buckets[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-[#0E131F] p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-white/10 shadow-xs space-y-5">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-brand-blue dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-base sm:text-lg text-dark dark:text-white">
              {title}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        </div>

        {/* Filter Buttons & Date Pickers */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Segmented Period Tabs */}
          <div className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-[#141A26] p-1 text-xs border border-gray-200/50 dark:border-white/5">
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                period === '7d'
                  ? 'bg-white dark:bg-[#0E131F] text-brand-blue dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
              }`}
            >
              1 Week
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                period === '30d'
                  ? 'bg-white dark:bg-[#0E131F] text-brand-blue dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
              }`}
            >
              1 Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                period === 'month'
                  ? 'bg-white dark:bg-[#0E131F] text-brand-blue dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
              }`}
            >
              Select Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                period === 'year'
                  ? 'bg-white dark:bg-[#0E131F] text-brand-blue dark:text-blue-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-dark dark:hover:text-white'
              }`}
            >
              1 Year
            </button>
          </div>

          {/* Conditional Dropdown for 'Select Month' */}
          {period === 'month' && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1.5 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-dark dark:text-white font-medium focus:outline-none cursor-pointer py-1 pr-1 text-xs"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-white dark:bg-[#0E131F]">
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-dark dark:text-white font-medium focus:outline-none cursor-pointer py-1 pr-1 text-xs border-l border-gray-200 dark:border-white/10 pl-1.5"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-white dark:bg-[#0E131F]">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional Dropdown for '1 Year' */}
          {period === 'year' && (
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 rounded-lg p-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400 ml-1.5 shrink-0" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-dark dark:text-white font-medium focus:outline-none cursor-pointer py-1 px-1 text-xs"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr} className="bg-white dark:bg-[#0E131F]">
                    Year {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Currency Badge */}
          <span className="font-mono text-xs font-bold text-dark dark:text-white bg-gray-100 dark:bg-[#141A26] border border-gray-200 dark:border-white/10 px-2.5 py-1.5 rounded-lg shrink-0">
            GBP (£)
          </span>
        </div>
      </div>

      {/* KPI Summary Cards for Selected Period */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-[#141A26]/50 p-3.5 rounded-xl border border-gray-200/70 dark:border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-3.5 h-3.5 text-brand-blue dark:text-blue-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Period Revenue
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-dark dark:text-white">
            {formatGBP(totalPeriodRevenue)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Total Orders
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-dark dark:text-white">
            {totalPeriodOrders} <span className="text-xs font-normal text-gray-400">orders</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <BarChart3 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              {period === 'year' ? 'Monthly Average' : 'Daily Average'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-dark dark:text-white">
            {formatGBP(buckets.length ? totalPeriodRevenue / buckets.length : 0)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Peak Performance
            </span>
          </div>
          <div className="text-base sm:text-lg font-black font-mono text-brand-blue dark:text-blue-400 truncate">
            {peakBucket && peakBucket.amount > 0 ? (
              <span>
                {formatGBP(peakBucket.amount)}{' '}
                <span className="text-[11px] font-semibold text-gray-400">
                  ({peakBucket.label})
                </span>
              </span>
            ) : (
              <span className="text-gray-400 text-xs">£0.00</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Bar / Inspector */}
      <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-lg min-h-[34px]">
        {activeBucket ? (
          <div className="flex flex-wrap items-center gap-3 text-dark dark:text-white font-medium">
            <span className="flex items-center gap-1.5 font-bold text-brand-blue dark:text-blue-400">
              <Calendar className="w-3.5 h-3.5" />
              {activeBucket.fullDate}
            </span>
            <span>•</span>
            <span>
              Revenue:{' '}
              <strong className="font-mono font-bold text-dark dark:text-white">
                {formatGBP(activeBucket.amount)}
              </strong>
            </span>
            <span>•</span>
            <span>
              Orders:{' '}
              <strong className="font-mono font-bold text-dark dark:text-white">
                {activeBucket.orders} {activeBucket.orders === 1 ? 'order' : 'orders'}
              </strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Hover or tap on any bar to inspect date, revenue, and order breakdown.</span>
          </div>
        )}

        <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">
          Max: {formatGBP(maxRevenue)}
        </span>
      </div>

      {/* Styled Responsive Bar Chart */}
      <div className="relative pt-2">
        <div
          className={`overflow-x-auto pb-2 ${
            period === '30d' || period === 'month' ? 'scrollbar-thin' : ''
          }`}
        >
          <div
            className={`flex items-end justify-between gap-1.5 sm:gap-2.5 pt-10 px-1 h-52 ${
              period === '30d' || period === 'month' ? 'min-w-[700px]' : 'min-w-full'
            }`}
          >
            {buckets.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              const hasRevenue = item.amount > 0;
              const heightPercent = hasRevenue
                ? Math.max(12, Math.round((item.amount / maxRevenue) * 100))
                : 6;

              // Display day number cleanly for 30d/month, or full label for 7d/year
              const displayLabel =
                period === '30d' || period === 'month'
                  ? item.label.split(' ')[0]
                  : item.label;

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(idx)}
                  className="flex-1 flex flex-col items-center gap-2 group cursor-pointer relative"
                  style={{ minWidth: period === '30d' || period === 'month' ? '18px' : '28px' }}
                >
                  {/* Floating Tooltip Bubble on Hover */}
                  {isHovered && (
                    <div className="absolute -top-9 z-30 whitespace-nowrap bg-gray-900 text-white text-[10px] font-mono py-1 px-2 rounded-md shadow-lg pointer-events-none flex items-center gap-1.5">
                      <span className="font-bold">{formatGBP(item.amount)}</span>
                      <span className="text-gray-400 text-[9px]">({item.orders} ord)</span>
                    </div>
                  )}

                  {/* Bar Track Container */}
                  <div
                    className={`w-full max-w-[48px] rounded-t-md overflow-hidden flex items-end h-32 transition-all duration-200 ${
                      isHovered
                        ? 'bg-blue-100/70 dark:bg-blue-950/60 ring-2 ring-brand-blue'
                        : 'bg-gray-100 dark:bg-[#141A26]'
                    }`}
                  >
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ease-out ${
                        hasRevenue
                          ? isHovered
                            ? 'bg-gradient-to-t from-blue-700 to-indigo-500 shadow-md'
                            : 'bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400'
                          : isHovered
                          ? 'bg-gray-300 dark:bg-white/20'
                          : 'bg-gray-200/70 dark:bg-white/10'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>

                  {/* Bottom Label (Date/Month) */}
                  <span
                    className={`text-[10px] font-mono text-center transition-colors truncate max-w-full ${
                      isHovered
                        ? 'font-bold text-brand-blue dark:text-blue-400'
                        : hasRevenue
                        ? 'font-semibold text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                    title={item.fullDate}
                  >
                    {displayLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom indicator for long months with scrolling */}
        {(period === '30d' || period === 'month') && (
          <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 px-1 pt-1">
            <span>← Earlier dates</span>
            <span className="italic">Scroll horizontally to inspect full timeline</span>
            <span>Latest dates →</span>
          </div>
        )}
      </div>
    </div>
  );
};
