require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authOk = await new Promise(resolve => requireAdmin(req, res, () => resolve(true)));
  if (!authOk) return;

  const sb = getSupabase();
  if (!sb) {
    return res.status(503).json({ error: 'Database is not configured.' });
  }

  try {
    if (req.method === 'GET') {
      const { search, status, from, to, limit = 30, offset = 0 } = req.query;

      let query = sb.from('orders').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,order_id.ilike.%${search}%`);
      }
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (from) {
        query = query.gte('created_at', new Date(from).toISOString());
      }
      if (to) {
        query = query.lte('created_at', new Date(to).toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return res.json({ data: data || [], total: count || 0 });
    }

    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }
      const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled', 'pending'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      const { data, error } = await sb.from('orders').update({ status }).eq('id', id).select();
      if (error) throw error;
      return res.json({ success: true, data: data && data[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const { error } = await sb.from('orders').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Orders error:', err.message);
    res.status(500).json({ error: 'Failed to process orders.', details: err.message });
  }
};
