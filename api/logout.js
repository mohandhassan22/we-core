const L = require('./_lib');

module.exports = async (req, res) => {
  L.noStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.sameOriginXhr(req)) return res.status(403).json({ error: 'forbidden' });
  const c = L.parseCookies(req.headers.cookie);
  if (c[L.ACCESS]) {
    // Revoke server-side too (best effort).
    try { await fetch(`${L.SB_URL}/auth/v1/logout`, { method: 'POST', headers: { apikey: L.SB_KEY, Authorization: `Bearer ${c[L.ACCESS]}` } }); } catch (_) {}
  }
  L.clearSessionCookies(res);
  return res.status(200).json({ ok: true });
};
