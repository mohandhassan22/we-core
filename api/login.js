const L = require('./_lib');

module.exports = async (req, res) => {
  L.noStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!L.sameOriginXhr(req)) return res.status(403).json({ error: 'forbidden' });

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password || username.length > 200 || password.length > 200) {
    return res.status(400).json({ error: 'bad_request' });
  }
  try {
    const r = await fetch(`${L.SB_URL}/functions/v1/secure-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: L.SB_KEY, Authorization: `Bearer ${L.SB_KEY}` },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json().catch(() => ({}));
    const s = data && data.session;
    if (!r.ok || !s || !s.access_token || !s.refresh_token) return res.status(401).json({ error: 'invalid_credentials' });

    L.setSessionCookies(res, s);
    // Tokens are NOT returned in the body; the page fetches the short-lived access token from /api/session.
    return res.status(200).json({ ok: true });
  } catch (_) {
    return res.status(502).json({ error: 'upstream' });
  }
};
