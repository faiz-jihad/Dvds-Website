import { CheckoutError, dbClient, endpoint } from './_checkout.js';
import { calculateBusinessMetrics } from './_reports.js';
import { sendAdminBusinessReport } from './_email.js';

async function verifyAdminOrCron(db, req) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];

  // 1. Allow CRON_SECRET authorization for scheduled jobs
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { isCron: true, role: 'admin' };
  }

  // 2. Allow if Authorization header contains valid admin/staff Supabase JWT
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data, error } = await db.auth.getUser(token);
    if (!error && data?.user) {
      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const isKnownAdmin = ['azrayanltd@gmail.com', 'admin@dvdszone.co.uk', 'admin@azrayan.co.uk'].includes((data.user.email || '').toLowerCase());
      if ((profile && ['admin', 'staff'].includes(profile.role)) || isKnownAdmin) {
        return { user: data.user, role: profile?.role || 'admin', isCron: false };
      }
    }
  }

  // 3. In development / test environment with no CRON_SECRET configured yet
  if (!cronSecret && process.env.NODE_ENV !== 'production') {
    return { isDev: true, role: 'admin' };
  }

  throw new CheckoutError('Unauthorized. Admin authentication or valid CRON_SECRET required.', 401);
}

export default async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  const db = dbClient();

  // Helper response functions for compatibility
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (val) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(val));
    return res;
  };

  try {
    // -------------------------------------------------------------
    // GET: Triggered by Vercel Cron or browser fetch
    // -------------------------------------------------------------
    if (req.method === 'GET') {
      await verifyAdminOrCron(db, req);

      const urlObj = new URL(req.url, 'http://localhost');
      let type = urlObj.searchParams.get('type');

      // If type not explicitly passed, determine based on current UTC calendar
      if (!type) {
        const now = new Date();
        const dayOfWeek = now.getUTCDay(); // 1 = Monday
        const dayOfMonth = now.getUTCDate(); // 1 = First day of month

        if (dayOfMonth === 1) {
          type = 'monthly';
        } else if (dayOfWeek === 1) {
          type = 'weekly';
        } else {
          type = 'weekly'; // Fallback default
        }
      }

      console.log(`[cron-reports] Generating scheduled ${type} business report...`);
      const report = await calculateBusinessMetrics(db, { type });
      const emailResult = await sendAdminBusinessReport(db, report);

      return res.status(200).json({
        success: true,
        type,
        emailResult,
        report: {
          type: report.type,
          periodStart: report.periodStart,
          periodEnd: report.periodEnd,
          summary: report.summary,
        },
      });
    }

    // -------------------------------------------------------------
    // POST: Dashboard interaction & manual management
    // -------------------------------------------------------------
    if (req.method === 'POST') {
      const auth = await verifyAdminOrCron(db, req);
      const body = req.body || {};
      const action = body.action || 'get_report';

      // Action: Calculate and return metrics for dashboard view
      if (action === 'get_report') {
        const report = await calculateBusinessMetrics(db, {
          type: body.type || 'this_week',
          startDate: body.startDate,
          endDate: body.endDate,
        });
        return res.status(200).json({ success: true, report });
      }

      // Action: Manually send report email to ADMIN_EMAIL
      if (action === 'trigger_report') {
        const report = await calculateBusinessMetrics(db, {
          type: body.type || 'weekly',
          startDate: body.startDate,
          endDate: body.endDate,
        });
        const emailResult = await sendAdminBusinessReport(db, report);
        return res.status(200).json({ success: true, emailResult, report });
      }

      // Action: Resend previous report from report_history
      if (action === 'resend_report') {
        const reportId = body.reportId;
        if (!reportId) throw new CheckoutError('Report ID required for resend.', 400);

        const { data: record, error } = await db
          .from('report_history')
          .select('*')
          .eq('id', reportId)
          .maybeSingle();

        if (error || !record || !record.payload) {
          throw new CheckoutError('Report history record not found.', 404);
        }

        const emailResult = await sendAdminBusinessReport(db, record.payload);
        return res.status(200).json({ success: true, emailResult });
      }

      // Action: Get list of recorded expenses
      if (action === 'get_expenses') {
        const { data: expenses, error } = await db
          .from('expenses')
          .select('*')
          .order('date', { ascending: false })
          .limit(100);

        if (error) {
          // If table not present yet, return empty list gracefully
          return res.status(200).json({ success: true, expenses: [] });
        }
        return res.status(200).json({ success: true, expenses: expenses || [] });
      }

      // Action: Add new expense
      if (action === 'add_expense') {
        const { description, category, amount, date, notes } = body;
        if (!description || !category || typeof amount !== 'number' || amount <= 0) {
          throw new CheckoutError('Description, valid category, and positive amount are required.', 400);
        }

        const { data: inserted, error } = await db
          .from('expenses')
          .insert({
            description: String(description).trim(),
            category: String(category).trim().toLowerCase(),
            amount: Number(amount.toFixed(2)),
            date: date || new Date().toISOString().split('T')[0],
            notes: notes ? String(notes).trim() : null,
          })
          .select()
          .single();

        if (error) {
          throw new CheckoutError(`Could not save expense: ${error.message}`, 500);
        }
        return res.status(200).json({ success: true, expense: inserted });
      }

      // Action: Delete expense
      if (action === 'delete_expense') {
        const expenseId = body.id;
        if (!expenseId) throw new CheckoutError('Expense ID is required.', 400);

        const { error } = await db.from('expenses').delete().eq('id', expenseId);
        if (error) throw new CheckoutError(`Could not delete expense: ${error.message}`, 500);
        return res.status(200).json({ success: true });
      }

      // Action: Get report history list
      if (action === 'get_report_history') {
        const { data: history, error } = await db
          .from('report_history')
          .select('id, report_type, period_start, period_end, generated_at, sent_at, recipient, status, error_message')
          .order('generated_at', { ascending: false })
          .limit(50);

        if (error) return res.status(200).json({ success: true, history: [] });
        return res.status(200).json({ success: true, history: history || [] });
      }

      throw new CheckoutError(`Unsupported action: ${action}`, 400);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[cron-reports] Error:', err.message);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
