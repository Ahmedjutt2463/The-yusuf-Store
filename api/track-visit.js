require('dotenv').config();
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { session_id, page, referrer, device } = req.body || {};

  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0].trim().replace(/^::ffff:/, '') || 'Unknown';

  let loc = null;
  try {
    const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(clientIp)}`, { signal: AbortSignal.timeout(6000) });
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo && geo.success) {
        loc = {
          ip: geo.ip || clientIp,
          city: geo.city,
          region: geo.region,
          country: geo.country,
          flag: geo.flag,
          isp: geo.connection && geo.connection.isp,
          timezone: geo.timezone && geo.timezone.id,
          is_proxy: geo.security ? !!geo.security.is_proxy : false,
          is_vpn: geo.security ? !!geo.security.is_vpn : false
        };
      }
    }
  } catch (err) {
    console.error('IP geolocation lookup failed:', err.message);
  }

  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('visits').insert({
        session_id: session_id || 'anon',
        page: page || '/',
        referrer: referrer || null,
        device: device || null,
        ip: loc ? loc.ip : clientIp,
        ip_city: loc ? loc.city : null,
        ip_region: loc ? loc.region : null,
        ip_country: loc ? loc.country : null,
        ip_flag: loc ? loc.flag : null,
        isp: loc ? loc.isp : null,
        timezone: loc ? loc.timezone : null,
        is_proxy: loc ? loc.is_proxy : false,
        is_vpn: loc ? loc.is_vpn : false
      });
      if (error) console.error('Visit insert failed:', error.message);
    } catch (err) {
      console.error('Visit insert error:', err.message);
    }
  }

  res.json({ ok: true });
};
