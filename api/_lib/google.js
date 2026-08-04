require('dotenv').config();
const crypto = require('crypto');

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CERT_TTL_MS = 60 * 60 * 1000;
const VALID_ISS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const CLOCK_SKEW_SEC = 60;

let cachedKeys = null;
let cachedAt = 0;
let fetchCerts = async () => {
  const res = await fetch(CERTS_URL, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Could not fetch Google signing keys.');
  return res.json();
};

function _setCertFetcher(fn) {
  fetchCerts = fn;
  cachedKeys = null;
  cachedAt = 0;
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSegment(seg) {
  try {
    const b64 = String(seg).replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}

async function getKeys() {
  if (cachedKeys && Date.now() - cachedAt < CERT_TTL_MS) return cachedKeys;
  const jwks = await fetchCerts();
  const keys = new Map();
  (jwks.keys || []).forEach(k => keys.set(k.kid, k));
  cachedKeys = keys;
  cachedAt = Date.now();
  return keys;
}

function verifyWithJwk(signingInput, signature, jwk) {
  try {
    const publicKey = crypto.createPublicKey({ key: { kty: 'RSA', n: jwk.n, e: jwk.e }, format: 'jwk' });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signingInput);
    verifier.end();
    return verifier.verify(publicKey, signature);
  } catch (e) {
    return false;
  }
}

async function verifyGoogleCredential(credential, clientId) {
  try {
    if (!credential || !clientId) return null;
    const parts = String(credential).split('.');
    if (parts.length !== 3) return null;

    const header = decodeSegment(parts[0]);
    const payload = decodeSegment(parts[1]);
    if (!header || !payload) return null;
    if (!header.kid) return null;
    if (!VALID_ISS.has(payload.iss)) return null;
    if (payload.aud !== clientId) return null;
    if (!payload.email || !payload.email_verified) return null;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000) - CLOCK_SKEW_SEC) return null;

    const keys = await getKeys();
    const jwk = keys.get(header.kid);
    if (!jwk) return null;

    const signature = Buffer.from(parts[2].replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    if (!verifyWithJwk(parts[0] + '.' + parts[1], signature, jwk)) return null;

    return {
      google_sub: String(payload.sub || ''),
      email: String(payload.email || '').toLowerCase(),
      name: payload.name ? String(payload.name).slice(0, 50) : null,
      picture: payload.picture || null
    };
  } catch (e) {
    return null;
  }
}

module.exports = { verifyGoogleCredential, _setCertFetcher, _base64url: base64url };
