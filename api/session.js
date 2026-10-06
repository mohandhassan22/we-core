const L = require('./_lib');

// Returns a short-lived access token for client-side Supabase calls.
// The long-lived refresh token never leaves the HttpOnly cookie.
module.exports = async (req, res) => {
  L.noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  if (!L.sameOriginXhr(req)) return res.status(403).json({ error: 'forbidden' });

  const c = L.parseCookies(req.headers.cookie);
  const force = req.query && req.query.force === '1';
  try {
    if (c[L.ACCESS] && !force) {
      const user = await L.sbUser(c[L.ACCESS]);
      if (user) return res.status(200).json({ access_token: c[L.ACCESS], user: { id: user.id, email: user.email, app_metadata: user.app_metadata, user_metadata: user.user_metadata } });
    }
    if (c[L.REFRESH]) {
      const s = await L.sbRefresh(c[L.REFRESH]);
      if (s) {
        L.setSessionCookies(res, s);
        const u = s.user || {};
        return res.status(200).json({ access_token: s.access_token, user: { id: u.id, email: u.email, app_metadata: u.app_metadata, user_metadata: u.user_metadata } });
      }
    }
  } catch (_) { /* fall through */ }
  L.clearSessionCookies(res);
  return res.status(401).json({ error: 'unauthenticated' });
};
