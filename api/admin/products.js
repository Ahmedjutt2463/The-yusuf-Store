require('dotenv').config();
const { getSupabase } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/auth');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      const { search, category, active, limit = 100, offset = 0 } = req.query;

      let query = sb.from('products').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }
      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (active === 'true') {
        query = query.eq('active', true);
      } else if (active === 'false') {
        query = query.eq('active', false);
      }
      if (req.query.stock === 'out') {
        query = query.lte('stock', 0);
      } else if (req.query.stock === 'in') {
        query = query.gt('stock', 0);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const products = data || [];

      // Compute "sold" from actual orders and flag out-of-stock
      const { data: orders } = await sb.from('orders').select('items').limit(100000);
      const prodByName = new Map(products.map(p => [String(p.name || '').toLowerCase().trim(), p]));
      const prodBySlug = new Map(products.map(p => [String(p.slug || '').toLowerCase(), p]));
      const soldMap = {};
      (orders || []).forEach(o => {
        (o.items || []).forEach(i => {
          const qty = Number(i.quantity) || 1;
          const n = String(i.name || '').toLowerCase().trim();
          const s = String(i.id || '').toLowerCase().replace(/\.html$/, '');
          const p = prodByName.get(n) || prodBySlug.get(s);
          if (p) soldMap[p.id] = (soldMap[p.id] || 0) + qty;
        });
      });
      products.forEach(p => {
        p.sold = soldMap[p.id] || 0;
        p.out_of_stock = (Number(p.stock) || 0) <= 0;
      });

      return res.json({ data: products, total: count || 0 });
    }

    if (req.method === 'POST') {
      const { name, slug, category, price, old_price, stock, active, description, image, features } = req.body || {};
      if (!name || !slug || !category || price == null) {
        return res.status(400).json({ error: 'name, slug, category and price are required' });
      }
      const { data, error } = await sb.from('products').insert({
        name, slug, category,
        price: Number(price),
        old_price: old_price != null ? Number(old_price) : null,
        stock: stock != null ? Number(stock) : 0,
        active: active !== false,
        description: description || '',
        image: image || '',
        features: features || null
      }).select();
      if (error) throw error;
      return res.json({ success: true, data: data && data[0] });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const allowed = ['name', 'slug', 'category', 'price', 'old_price', 'stock', 'active', 'description', 'image', 'features'];
      const clean = {};
      allowed.forEach(k => {
        if (updates[k] !== undefined) clean[k] = updates[k];
      });
      if (clean.price != null) clean.price = Number(clean.price);
      if (clean.old_price != null) clean.old_price = Number(clean.old_price);
      if (clean.stock != null) clean.stock = Number(clean.stock);

      const { data, error } = await sb.from('products').update(clean).eq('id', id).select();
      if (error) throw error;
      return res.json({ success: true, data: data && data[0] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: 'Failed to process products.', details: err.message });
  }
};
