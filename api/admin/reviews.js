require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authOk = await new Promise(resolve => requireAdmin(req, res, () => resolve(true)));
  if (!authOk) return;

  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Database is not configured.' });

  try {
    if (req.method === 'GET') {
      const { search, slug, limit = 50, offset = 0 } = req.query;

      let query = sb.from('reviews').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (slug && slug !== 'all') query = query.eq('slug', slug);
      if (search) {
        query = query.or(`name.ilike.%${search}%,review.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return res.json({ data: data || [], total: count || 0 });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id is required' });
      const { error } = await sb.from('reviews').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin reviews error:', err.message);
    res.status(500).json({ error: 'Failed to process reviews.', details: err.message });
  }
};
