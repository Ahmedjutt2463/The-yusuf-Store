require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function startOfDay(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authOk = await new Promise(resolve => requireAdmin(req, res, () => resolve(true)));
  if (!authOk) return; // 401 already sent

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }

  try {
    const todayStart = startOfDay();
    const fourteenDaysAgo = new Date(Date.now() - 13 * 86400000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const sinceIso = fourteenDaysAgo.toISOString();

    const [
      totalVisits,
      totalVisitorsQ,
      todayVisitsQ,
      todayVisitorsQ,
      ordersAll,
      ordersToday,
      dailyVisits,
      recentVisits
    ] = await Promise.all([
      sb.from('visits').select('id', { count: 'exact', head: true }),
      sb.from('visits').select('session_id').limit(100000),
      sb.from('visits').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      sb.from('visits').select('session_id').gte('created_at', todayStart).limit(100000),
      sb.from('orders').select('*').order('created_at', { ascending: false }).limit(100000),
      sb.from('orders').select('*').gte('created_at', todayStart).limit(100000),
      sb.from('visits').select('created_at').gte('created_at', sinceIso).limit(100000),
      sb.from('visits').select('ip_city, ip_country, ip_flag, page, device, is_proxy, is_vpn, created_at, id')
        .gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(100000)
    ]);

    const todayVisitors = new Set((todayVisitorsQ.data || []).map(v => v.session_id)).size;
    const totalVisitors = new Set((totalVisitorsQ.data || []).map(v => v.session_id)).size;

    const ordersData = ordersAll.data || [];
    const ordersTodayData = ordersToday.data || [];
    const totalRevenue = ordersData.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const todayRevenue = ordersTodayData.reduce((s, o) => s + (Number(o.total) || 0), 0);

    const statusCounts = {};
    ordersData.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

    const dayMap = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo.getTime() + i * 86400000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    (dailyVisits.data || []).forEach(v => {
      if (v.created_at) {
        const key = new Date(v.created_at).toISOString().slice(0, 10);
        if (key in dayMap) dayMap[key]++;
      }
    });
    const visitsPerDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    const topCitiesMap = {};
    const topPagesMap = {};
    const osMap = {};
    const browserMap = {};
    const proxyCount = { proxy: 0, total: 0 };

    (recentVisits.data || []).forEach(v => {
      if (v.ip_city && v.ip_city !== 'Unknown') {
        const key = (v.ip_flag ? v.ip_flag + ' ' : '') + v.ip_city + (v.ip_country && v.ip_country !== 'Unknown' ? ', ' + v.ip_country : '');
        topCitiesMap[key] = (topCitiesMap[key] || 0) + 1;
      }
      if (v.page) topPagesMap[v.page] = (topPagesMap[v.page] || 0) + 1;
      const os = v.device && v.device.os;
      if (os) osMap[os] = (osMap[os] || 0) + 1;
      const br = v.device && v.device.browserName;
      if (br) browserMap[br] = (browserMap[br] || 0) + 1;
      proxyCount.total++;
      if (v.is_proxy || v.is_vpn) proxyCount.proxy++;
    });

    const topCities = Object.entries(topCitiesMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, count]) => ({ city, count }));
    const topPages = Object.entries(topPagesMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([page, count]) => ({ page, count }));
    const topOS = Object.entries(osMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([os, count]) => ({ os, count }));
    const topBrowsers = Object.entries(browserMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([b, count]) => ({ browser: b, count }));

    const recentVisitors = (recentVisits.data || []).slice(0, 12).map(v => ({
      id: v.id,
      created_at: v.created_at,
      ip_city: v.ip_city,
      ip_country: v.ip_country,
      ip_flag: v.ip_flag,
      page: v.page,
      device: v.device,
      is_proxy: v.is_proxy,
      is_vpn: v.is_vpn
    }));

    const recentOrders = ordersData.slice(0, 10).map(o => ({
      order_id: o.order_id,
      created_at: o.created_at,
      name: o.name,
      email: o.email,
      phone: o.phone,
      total: o.total,
      status: o.status,
      items: o.items
    }));

    res.json({
      totals: {
        totalVisits: totalVisits.count || 0,
        totalVisitors,
        todayVisits: todayVisitsQ.count || 0,
        todayVisitors,
        totalOrders: ordersData.length,
        todayOrders: ordersTodayData.length,
        totalRevenue,
        todayRevenue
      },
      statusCounts,
      visitsPerDay,
      topCities,
      topPages,
      topOS,
      topBrowsers,
      proxyCount,
      recentVisitors,
      recentOrders
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats.', details: err.message });
  }
};
