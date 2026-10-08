import { check } from './_checkout.js';

/**
 * Calculate dates for automated or manual reports.
 */
export function getReportDateRange(type, customStart, customEnd) {
  const now = new Date();

  if (type === 'weekly') {
    // Previous Monday 00:00:00 to previous Sunday 23:59:59.999 UTC
    const dayOfWeek = now.getUTCDay(); // 0 is Sunday, 1 is Monday...
    const diffToPrevMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + 7;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToPrevMonday, 0, 0, 0, 0));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999));
    return { start, end };
  }

  if (type === 'monthly') {
    // Previous calendar month (from 1st 00:00:00 to last day 23:59:59.999 UTC)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    return { start, end };
  }

  if (type === 'this_week') {
    const dayOfWeek = now.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0, 0));
    const end = new Date();
    return { start, end };
  }

  if (type === 'this_month') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const end = new Date();
    return { start, end };
  }

  if (customStart && customEnd) {
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
    };
  }

  // Default to past 7 days
  const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start, end: now };
}

/**
 * Authoritative business performance metrics directly from the Supabase database.
 */
export async function calculateBusinessMetrics(db, { type = 'weekly', startDate, endDate }) {
  const { start, end } = getReportDateRange(type, startDate, endDate);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  // 1. Fetch only verified, paid orders within the period
  // We include orders where paid_at or created_at falls in range and payment_status is 'paid' or 'partially_refunded' or 'refunded'
  const { data: rawOrders, error: ordersErr } = await db
    .from('orders')
    .select('id, order_number, email, total_amount, refunded_amount, status, payment_status, currency, paid_at, created_at, items:order_items(*)')
    .or(`paid_at.gte.${startIso},created_at.gte.${startIso}`)
    .or(`paid_at.lte.${endIso},created_at.lte.${endIso}`);

  if (ordersErr) {
    console.error('[reports] Error querying orders:', ordersErr.message);
    throw new Error(`Failed to load orders for report: ${ordersErr.message}`);
  }

  const allPeriodOrders = (rawOrders || []).filter((o) => {
    const ts = new Date(o.paid_at || o.created_at).getTime();
    return ts >= start.getTime() && ts <= end.getTime();
  });

  // Only count successfully paid orders as revenue
  const paidOrders = allPeriodOrders.filter((o) => ['paid', 'partially_refunded', 'refunded'].includes(o.payment_status));

  let grossRevenue = 0;
  let totalRefunds = 0;
  let itemsSold = 0;
  const customersSet = new Set();
  const productAggMap = new Map();

  for (const order of paidOrders) {
    const orderTotal = Number(order.total_amount) || 0;
    const orderRefund = Number(order.refunded_amount) || 0;
    grossRevenue += orderTotal;
    totalRefunds += orderRefund;

    if (order.email) customersSet.add(order.email.toLowerCase().trim());

    if (Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = Number(item.quantity) || 1;
        const itemRevenue = Number(item.total_price) || (Number(item.unit_price) * qty) || 0;
        itemsSold += qty;

        const prodKey = item.product_id || item.product_title || 'Unknown DVD';
        const existing = productAggMap.get(prodKey) || {
          id: item.product_id,
          title: item.product_title || 'Unknown DVD',
          sku: item.product_sku || '',
          unitsSold: 0,
          revenue: 0,
        };
        existing.unitsSold += qty;
        existing.revenue += itemRevenue;
        productAggMap.set(prodKey, existing);
      }
    }
  }

  const netRevenue = Math.max(0, Number((grossRevenue - totalRefunds).toFixed(2)));
  const ordersCount = paidOrders.length;
  const aov = ordersCount > 0 ? Number((netRevenue / ordersCount).toFixed(2)) : 0;

  // Sorted Top Products
  const topProducts = Array.from(productAggMap.values())
    .sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue)
    .slice(0, 10)
    .map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
    }));

  // 2. Fetch recorded business expenses for the period
  let expensesList = [];
  let totalExpenses = 0;
  try {
    const startDateString = start.toISOString().split('T')[0];
    const endDateString = end.toISOString().split('T')[0];

    const { data: expRows, error: expErr } = await db
      .from('expenses')
      .select('*')
      .gte('date', startDateString)
      .lte('date', endDateString)
      .order('date', { ascending: false });

    if (!expErr && Array.isArray(expRows)) {
      expensesList = expRows;
      totalExpenses = expRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      totalExpenses = Number(totalExpenses.toFixed(2));
    } else {
      // Fallback: Read from admin_audit_log if expenses table is pending migration
      try {
        const { data: auditRows } = await db
          .from('admin_audit_log')
          .select('after_data')
          .eq('table_name', 'expenses')
          .order('created_at', { ascending: false });

        if (Array.isArray(auditRows)) {
          const parsed = auditRows
            .map((r) => r.after_data)
            .filter((e) => e && e.date >= startDateString && e.date <= endDateString);
          expensesList = parsed;
          totalExpenses = parsed.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          totalExpenses = Number(totalExpenses.toFixed(2));
        }
      } catch {
        // Fallback gracefully to empty list
      }
    }
  } catch (err) {
    console.warn('[reports] Expenses query note:', err.message);
  }

  // 3. COGS & Profit determination
  // Check if products have cost_price
  let hasCogs = false;
  let totalCogs = 0;
  try {
    const { data: prodsWithCost } = await db
      .from('products')
      .select('id, cost_price')
      .not('cost_price', 'is', null);

    if (Array.isArray(prodsWithCost) && prodsWithCost.length > 0) {
      const costMap = new Map(prodsWithCost.map((p) => [p.id, Number(p.cost_price) || 0]));
      let allHaveCost = true;
      let calculatedCogs = 0;

      for (const order of paidOrders) {
        if (!Array.isArray(order.items)) continue;
        for (const item of order.items) {
          if (item.product_id && costMap.has(item.product_id)) {
            calculatedCogs += costMap.get(item.product_id) * (Number(item.quantity) || 1);
          } else {
            allHaveCost = false;
          }
        }
      }

      if (allHaveCost && calculatedCogs > 0) {
        hasCogs = true;
        totalCogs = Number(calculatedCogs.toFixed(2));
      }
    }
  } catch {
    hasCogs = false;
  }

  const netResult = hasCogs
    ? Number((netRevenue - totalCogs - totalExpenses).toFixed(2))
    : Number((netRevenue - totalExpenses).toFixed(2));

  // 4. Order Status Breakdown for the entire period
  const orderStatuses = {
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };

  for (const o of allPeriodOrders) {
    if (o.status === 'delivered') orderStatuses.delivered++;
    else if (o.status === 'dispatched' || o.status === 'shipped') orderStatuses.shipped++;
    else if (o.status === 'cancelled') orderStatuses.cancelled++;
    else if (o.payment_status === 'refunded' || o.status === 'refunded') orderStatuses.refunded++;
    else if (o.status === 'processing') orderStatuses.processing++;
    else if (o.payment_status === 'paid') orderStatuses.paid++;
  }

  // 5. Weekly trend breakdown for monthly report
  let weeklyTrend = [];
  if (type === 'monthly' || type === 'this_month') {
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weeksCount = Math.ceil(totalDays / 7);

    for (let w = 0; w < weeksCount; w++) {
      const wStart = new Date(start.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const wEnd = new Date(Math.min(end.getTime(), wStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1));

      const weekOrders = paidOrders.filter((o) => {
        const ts = new Date(o.paid_at || o.created_at).getTime();
        return ts >= wStart.getTime() && ts <= wEnd.getTime();
      });

      const weekRev = weekOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0) - (Number(o.refunded_amount) || 0), 0);
      weeklyTrend.push({
        label: `Week ${w + 1} (${wStart.getUTCDate()} ${wStart.toLocaleDateString('en-GB', { month: 'short' })} - ${wEnd.getUTCDate()} ${wEnd.toLocaleDateString('en-GB', { month: 'short' })})`,
        ordersCount: weekOrders.length,
        revenue: Number(weekRev.toFixed(2)),
      });
    }
  }

  return {
    type,
    periodStart: startIso,
    periodEnd: endIso,
    generatedAt: new Date().toISOString(),
    summary: {
      grossRevenue: Number(grossRevenue.toFixed(2)),
      refunds: Number(totalRefunds.toFixed(2)),
      revenue: netRevenue,
      ordersCount,
      averageOrderValue: aov,
      itemsSold,
      customersCount: customersSet.size,
      totalExpenses,
      cogs: totalCogs,
      hasCogs,
      netResult,
      resultLabel: hasCogs ? 'Estimated Profit' : 'Net Revenue After Recorded Expenses',
    },
    topProducts,
    expenses: {
      total: totalExpenses,
      items: expensesList.slice(0, 50),
    },
    orderStatuses,
    weeklyTrend,
  };
}
