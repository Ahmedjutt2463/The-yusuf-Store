require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authOk = await new Promise(resolve => requireAdmin(req, res, () => resolve(true)));
  if (!authOk) return;

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  try {
    const { search, country, page: pageFilter, from, to, limit = 30, offset = 0 } = req.query;

    let query = sb.from('visits').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`ip.ilike.%${search}%,ip_city.ilike.%${search}%,ip_region.ilike.%${search}%,page.ilike.%${search}%`);
    }
    if (country && country !== 'all') {
      query = query.eq('ip_country', country);
    }
    if (pageFilter && pageFilter !== 'all') {
      query = query.eq('page', pageFilter);
    }
    if (from) {
      query = query.gte('created_at', new Date(from).toISOString());
    }
    if (to) {
      query = query.lte('created_at', new Date(to).toISOString());
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ data: data || [], total: count || 0 });
  } catch (err) {
    console.error('Visits list error:', err.message);
    res.status(500).json({ error: 'Failed to load visits.', details: err.message });
  }
};
