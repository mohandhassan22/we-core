// Server-side gate: private HTML pages are only served when the sb-access-token
// cookie holds a valid Supabase session. Assets (css/js/img) and the public
// pages below stay open so the login page can render.
import { next } from '@vercel/functions';

const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

const PUBLIC_PAGES = new Set(['/login.html', '/Reset-Password.html', '/404.html']);

export const config = {
  // Everything except static assets; HTML pages, directories and "/" are gated.
  matcher: ['/((?!assets/|img/|error/|favicon|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|json|txt|xml)$).*)'],
};

function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]).replace(/"/g, '') : null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_PAGES.has(url.pathname)) return next();
  // /api/* handlers do their own auth + CSRF checks (login must be reachable without a session).
  if (url.pathname.startsWith('/api/')) return next();

  const token = getCookie(request, 'sb-access-token');
  let ok = false;
  if (token) {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/user`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
      });
      ok = r.ok;
    } catch (_) { ok = false; }
  }
  if (ok) return next();

  // Access token expired but a refresh cookie exists -> refresh server-side and come back.
  if (getCookie(request, 'sb-refresh-token')) {
    const back = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(new URL('/api/refresh?next=' + back, request.url), 302);
  }

  const login = new URL('/login.html', request.url);
  return Response.redirect(login, 302);
}
