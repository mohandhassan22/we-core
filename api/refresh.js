const L = require('./_lib');

// Used by middleware when the access cookie expired: refresh, then bounce back to the page.
module.exports = async (req, res) => {
  L.noStore(res);
  const next = L.safeNext(req.query && req.query.next);
  const c = L.parseCookies(req.headers.cookie);
  try {
    if (c[L.REFRESH]) {
      const s = await L.sbRefresh(c[L.REFRESH]);
      if (s) {
        L.setSessionCookies(res, s);
        res.setHeader('Location', next);
        return res.status(302).end();
      }
    }
  } catch (_) {}
  L.clearSessionCookies(res);
  res.setHeader('Location', '/login.html');
  return res.status(302).end();
};
