require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

const TZ = 'Asia/Karachi';
const OFFSET_MS = 5 * 3600 * 1000; // Karachi = UTC+5, no DST

function kParts(d) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short'
  }).formatToParts(d);
  const o = {};
  p.forEach(x => { o[x.type] = x.value; });
  return o;
}

function localMidnight(d, dayOffset = 0) {
  const p = kParts(d);
  const m = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), 0, 0, 0) - OFFSET_MS);
  m.setDate(m.getDate() + dayOffset);
  return m;
}

function localDateKey(ts) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(ts));
}

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function weekStart(d) {
  const mid = localMidnight(d);
  const wd = WEEKDAY[kParts(new Date(mid)).weekday] != null ? WEEKDAY[kParts(new Date(mid)).weekday] : 0;
  const monday = new Date(mid);
  monday.setDate(monday.getDate() - ((wd + 6) % 7));
  return monday;
}

function monthKey(d) {
  const p = kParts(d);
  return String(p.year) + '-' + String(Number(p.month)).padStart(2, '0');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authOk = await new Promise(resolve => requireAdmin(req, res, () => resolve(true)));
  if (!authOk) return;

  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Database is not configured.' });

  try {
    const { data: orders, error } = await sb.from('orders').select('*').order('created_at', { ascending: true }).limit(100000);
    if (error) throw error;
    const list = orders || [];

    const now = new Date();
    const todayStart = localMidnight(now);
    const weekStartD = weekStart(now);
    const pNow = kParts(now);
    const monthStart = new Date(Date.UTC(Number(pNow.year), Number(pNow.month) - 1, 1, 0, 0, 0) - OFFSET_MS);
    const yearStart = new Date(Date.UTC(Number(pNow.year), 0, 1, 0, 0, 0) - OFFSET_MS);

    const sum = arr => arr.reduce((s, o) => s + (Number(o.total) || 0), 0);

    const todayOrders = list.filter(o => new Date(o.created_at) >= todayStart);
    const weekOrders = list.filter(o => new Date(o.created_at) >= weekStartD);
    const monthOrders = list.filter(o => new Date(o.created_at) >= monthStart);
    const yearOrders = list.filter(o => new Date(o.created_at) >= yearStart);

    // Daily buckets (last 30 days)
    const dayMap = {};
    for (let i = 29; i >= 0; i--) {
      const d = localMidnight(now, -i);
      dayMap[localDateKey(d.getTime())] = { date: localDateKey(d.getTime()), count: 0, revenue: 0 };
    }
    // Weekly buckets (last 12 weeks)
    const weekMap = {};
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(weekStartD.getTime());
      ws.setDate(ws.getDate() - 7 * i);
      const key = localDateKey(ws.getTime());
      weekMap[key] = { week: key, count: 0, revenue: 0 };
    }
    // Monthly buckets (last 12 months)
    const monthMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(yearStart.getTime());
      d.setMonth(pNow.month - 1 - i);
      const key = monthKey(d);
      monthMap[key] = { month: key, count: 0, revenue: 0 };
    }

    const byProduct = {};
    const statusCounts = {};

    list.forEach(o => {
      const ts = new Date(o.created_at);
      const rev = Number(o.total) || 0;
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

      const dk = localDateKey(ts.getTime());
      if (dayMap[dk]) { dayMap[dk].count++; dayMap[dk].revenue += rev; }

      const ow = weekStart(ts);
      const wk = localDateKey(ow.getTime());
      if (weekMap[wk]) { weekMap[wk].count++; weekMap[wk].revenue += rev; }

      const mk = monthKey(ts);
      if (monthMap[mk]) { monthMap[mk].count++; monthMap[mk].revenue += rev; }

      (o.items || []).forEach(i => {
        const qty = Number(i.quantity) || 1;
        const price = Number(i.price) || 0;
        const name = String(i.name || 'Unknown');
        if (!byProduct[name]) byProduct[name] = { name, qty: 0, revenue: 0 };
        byProduct[name].qty += qty;
        byProduct[name].revenue += qty * price;
      });
    });

    const topProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
    const totalRevenue = sum(list);

    res.json({
      periods: {
        today: { count: todayOrders.length, revenue: sum(todayOrders) },
        week: { count: weekOrders.length, revenue: sum(weekOrders) },
        month: { count: monthOrders.length, revenue: sum(monthOrders) },
        year: { count: yearOrders.length, revenue: sum(yearOrders) },
        all: { count: list.length, revenue: totalRevenue }
      },
      averageOrderValue: list.length ? Math.round(totalRevenue / list.length) : 0,
      daily: Object.values(dayMap),
      weekly: Object.values(weekMap),
      monthly: Object.values(monthMap),
      topProducts,
      statusCounts
    });
  } catch (err) {
    console.error('Sales error:', err.message);
    res.status(500).json({ error: 'Failed to load sales.', details: err.message });
  }
};
