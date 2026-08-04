require('dotenv').config();
const { getSupabase } = require('./_lib/supabase');
const { hasOffensiveText, isPhotoSafe } = require('./_lib/moderation');

const BUCKET = 'review-photos';
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const ALLOWED_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_REVIEWS_PER_IP_HOUR = 5;

const ipHits = new Map();
function rateLimit(ip) {
  if (!ip) return true;
  const now = Date.now();
  const recent = (ipHits.get(ip) || []).filter(t => now - t < 3600000);
  if (recent.length >= MAX_REVIEWS_PER_IP_HOUR) return false;
  recent.push(now);
  ipHits.set(ip, recent);
  return true;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getIp(req) {
  const h = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '';
  const first = String(h).split(',')[0].trim();
  if (first) return first.replace(/^::ffff:/, '');
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

async function ensureBucket(sb) {
  try {
    const { data } = await sb.storage.getBucket(BUCKET);
    if (data) return true;
  } catch (e) { /* bucket may not exist yet */ }
  try {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(String(error.message))) {
      console.error('Bucket create error:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Bucket ensure error:', e.message);
    return false;
  }
}

async function storePhoto(sb, req, dataUrl) {
  const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Invalid photo format. Use a base64 data URL.');
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME[mime]) throw new Error('Unsupported image type. Please upload a JPG or PNG photo.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length) throw new Error('Photo is empty.');
  if (buffer.length > MAX_PHOTO_BYTES) throw new Error('Photo is too large (max 1.5MB).');

  const safe = await isPhotoSafe(req, buffer, mime);
  if (!safe) throw new Error('This photo could not be approved. Please upload a different photo.');

  const ok = await ensureBucket(sb);
  if (!ok) throw new Error('Photo storage is not available right now.');

  const ext = ALLOWED_MIME[mime];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(filename, buffer, { contentType: mime });
  if (error) throw new Error('Photo upload failed: ' + (error.message || 'unknown error'));

  return sb.storage.from(BUCKET).getPublicUrl(filename).data.publicUrl;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'Database is not configured.' });

  try {
    if (req.method === 'GET') {
      const slug = String(req.query.slug || '').trim().toLowerCase();
      if (!slug) return res.status(400).json({ error: 'slug is required' });

      const { data, error } = await sb.from('reviews')
        .select('*')
        .eq('slug', slug)
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return res.json({ data: data || [] });
    }

    if (req.method === 'POST') {
      const { slug, name, rating, review, photo } = req.body || {};

      const cleanSlug = String(slug || '').trim().toLowerCase();
      const cleanName = String(name || '').trim().slice(0, 50);
      const cleanReview = String(review || '').trim().slice(0, 1000);
      const cleanRating = Math.round(Number(rating));

      if (!cleanSlug) return res.status(400).json({ error: 'slug is required' });
      if (!cleanName) return res.status(400).json({ error: 'Please enter your name.' });
      if (!cleanReview) return res.status(400).json({ error: 'Please write a review.' });
      if (!Number.isInteger(cleanRating) || cleanRating < 1 || cleanRating > 5) {
        return res.status(400).json({ error: 'Please select a rating from 1 to 5 stars.' });
      }
      if (hasOffensiveText(cleanName, cleanReview)) {
        return res.status(400).json({ error: 'Your review contains inappropriate language. Please remove it and try again.' });
      }

      const ip = getIp(req);
      if (!rateLimit(ip)) {
        return res.status(429).json({ error: 'Too many reviews. Please try again later.' });
      }

      let productName = '';
      try {
        const { data: prod } = await sb.from('products').select('name').eq('slug', cleanSlug).maybeSingle();
        if (prod && prod.name) productName = prod.name;
      } catch (e) { /* product lookup is optional */ }

      let photoUrl = null;
      if (photo) {
        photoUrl = await storePhoto(sb, req, photo);
      }

      const { data, error } = await sb.from('reviews').insert({
        slug: cleanSlug,
        product_name: productName || null,
        name: cleanName,
        rating: cleanRating,
        review: cleanReview,
        photo: photoUrl,
        approved: true,
        ip
      }).select();
      if (error) throw error;

      return res.status(201).json({ success: true, data: data && data[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Reviews error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process review.' });
  }
};
