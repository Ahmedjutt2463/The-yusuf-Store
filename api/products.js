require('dotenv').config();
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  try {
    const { data, error } = await sb.from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('Public products error:', err.message);
    res.status(500).json({ error: 'Failed to load products.', details: err.message });
  }
};
