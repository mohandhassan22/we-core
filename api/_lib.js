// Shared helpers for the auth API (files starting with "_" are not exposed as routes).
const SB_URL = process.env.SUPABASE_URL || 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

const ACCESS = 'sb-access-token';
const REFRESH = 'sb-refresh-token';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) {
      try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim().replace(/^"|"$/g, '')); } catch (_) {}
    }
  });
  return out;
}

function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function setSessionCookies(res, s) {
  const accessAge = Math.max(60, Math.min(Number(s.expires_in) || 3600, 86400));
  res.setHeader('Set-Cookie', [
    cookie(ACCESS, s.access_token, accessAge),
    cookie(REFRESH, s.refresh_token, REFRESH_MAX_AGE),
  ]);
}

function clearSessionCookies(res) {
  res.setHeader('Set-Cookie', [cookie(ACCESS, '', 0), cookie(REFRESH, '', 0)]);
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
}

// CSRF: state-changing / token-returning calls must be same-origin AND carry a custom header
// (a cross-site page cannot set X-Requested-With without a CORS preflight, which we never allow).
function sameOriginXhr(req) {
  const host = req.headers.host;
  const origin = req.headers.origin;
  if (origin) {
    try { if (new URL(origin).host !== host) return false; } catch (_) { return false; }
  }
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin') return false;
  return req.headers['x-requested-with'] === 'WE';
}

async function sbUser(token) {
  const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } });
  return r.ok ? r.json() : null;
}

async function sbRefresh(refreshToken) {
  const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!r.ok) return null;
  const s = await r.json();
  return s && s.access_token && s.refresh_token ? s : null;
}

// Only allow same-site relative paths as redirect targets (prevents open redirect).
function safeNext(n) {
  if (typeof n !== 'string' || !n.startsWith('/') || n.startsWith('//') || n.includes('\\') || /[\r\n]/.test(n)) return '/index.html';
  return n;
}

module.exports = { SB_URL, SB_KEY, ACCESS, REFRESH, parseCookies, setSessionCookies, clearSessionCookies, noStore, sameOriginXhr, sbUser, sbRefresh, safeNext };
