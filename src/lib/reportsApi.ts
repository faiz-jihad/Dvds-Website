import { supabase } from './supabase';

export interface BusinessReportSummary {
  grossRevenue: number;
  refunds: number;
  revenue: number;
  ordersCount: number;
  averageOrderValue: number;
  itemsSold: number;
  customersCount?: number;
  totalExpenses: number;
  cogs: number;
  hasCogs: boolean;
  netResult: number;
  resultLabel: string;
}

export interface TopProductMetric {
  id?: string;
  title: string;
  sku: string;
  unitsSold: number;
  revenue: number;
}

export interface BusinessExpense {
  id: string;
  description: string;
  category: 'shipping' | 'packaging' | 'stripe_fees' | 'inventory' | 'marketing' | 'website_domain' | 'vps_hosting' | 'other';
  amount: number;
  currency: string;
  date: string;
  notes?: string | null;
  created_at: string;
}

export interface WeeklyTrendItem {
  label: string;
  ordersCount: number;
  revenue: number;
}

export interface BusinessReportData {
  type: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: BusinessReportSummary;
  topProducts: TopProductMetric[];
  expenses: {
    total: number;
    items: BusinessExpense[];
  };
  orderStatuses: {
    paid: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  weeklyTrend?: WeeklyTrendItem[];
}

export interface ReportHistoryItem {
  id: string;
  report_type: 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  generated_at: string;
  sent_at: string | null;
  recipient: string;
  status: 'generated' | 'sent' | 'failed';
  error_message: string | null;
}

async function reportPost<T>(body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      headers.Authorization = `Bearer ${data.session.access_token}`;
    }
  }

  const res = await fetch('/api/cron-reports', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Server request failed HTTP ${res.status}`);
  }
  return data;
}

export const reportsApi = {
  async getReport(type: string, startDate?: string, endDate?: string): Promise<BusinessReportData> {
    const res = await reportPost<{ success: boolean; report: BusinessReportData }>({
      action: 'get_report',
      type,
      startDate,
      endDate,
    });
    return res.report;
  },

  async triggerReportEmail(type: string, startDate?: string, endDate?: string) {
    return reportPost<{ success: boolean; emailResult: any; report: BusinessReportData }>({
      action: 'trigger_report',
      type,
      startDate,
      endDate,
    });
  },

  async resendReport(reportId: string) {
    return reportPost<{ success: boolean; emailResult: any }>({
      action: 'resend_report',
      reportId,
    });
  },

  async getExpenses(): Promise<BusinessExpense[]> {
    const res = await reportPost<{ success: boolean; expenses: BusinessExpense[] }>({
      action: 'get_expenses',
    });
    return res.expenses || [];
  },

  async addExpense(payload: {
    description: string;
    category: string;
    amount: number;
    date?: string;
    notes?: string;
  }): Promise<BusinessExpense> {
    const res = await reportPost<{ success: boolean; expense: BusinessExpense }>({
      action: 'add_expense',
      ...payload,
    });
    return res.expense;
  },

  async deleteExpense(id: string) {
    return reportPost<{ success: boolean }>({
      action: 'delete_expense',
      id,
    });
  },

  async getReportHistory(): Promise<ReportHistoryItem[]> {
    const res = await reportPost<{ success: boolean; history: ReportHistoryItem[] }>({
      action: 'get_report_history',
    });
    return res.history || [];
  },
};
