// Server-side gate: private HTML pages are only served when the sb-access-token
// cookie holds a valid Supabase session. Assets (css/js/img) and the public
// pages below stay open so the login page can render.
import { next } from '@vercel/functions';

const SB_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SB_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';

const PUBLIC_PAGES = new Set(['/login.html', '/Reset-Password.html', '/404.html', '/access_denied.html']);

export const config = {
  // Everything except static assets; HTML pages, directories and "/" are gated.
  matcher: ['/((?!assets/|img/|error/|favicon|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|map|json|txt|xml)$).*)'],
};

function getCookie(req, name) {
  const m = (req.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]).replace(/"/g, '') : null;
}

// ---- Role-based gate (server side) ----
// /admin           -> admin only
// /target-manager/ -> per-role page list (kept in sync with assets/js/auth.js and target-manager/js/permissions.js)
const TM_PAGES = {
  agent:          ['agent', 'performance', 'history'],
  branch_manager: ['branch-manager', 'agent', 'performance', 'history', 'settings'],
  area_manager:   ['area-manager', 'branch-manager', 'agent', 'history'],
  supervisor:     ['supervisor', 'area-manager', 'branch-manager', 'agent', 'history'],
  admin:          ['supervisor', 'area-manager', 'branch-manager', 'agent', 'performance', 'history', 'settings'],
};

function normalizeRole(raw) {
  const r = String(raw || '').toLowerCase().trim();
  if (r === 'admin') return 'admin';
  if (r === 'supervisor') return 'supervisor';
  if (r === 'area_manager' || r === 'area-manager') return 'area_manager';
  if (r === 'branch_manager' || r === 'branch-manager' || r === 'manager' || r === 'store-manager') return 'branch_manager';
  return 'agent';
}

// returns 'admin' | 'target' | null for the path
function gateKind(pathname) {
  const p = pathname.toLowerCase().replace(/\/+$/, '').replace(/\.html$/, '');
  if (p === '/admin') return 'admin';
  if (p === '/target-manager' || p === '/target-manager/index') return null;      // router page, redirects client side
  if (p.startsWith('/target-manager/')) return 'target';
  return null;
}

function targetPageName(pathname) {
  return pathname.toLowerCase().replace(/\/+$/, '').replace(/\.html$/, '').split('/').pop();
}

async function getRole(token, userId) {
  const r = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role&limit=1`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows && rows[0] ? rows[0].role : null;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_PAGES.has(url.pathname)) return next();

  const token = getCookie(request, 'sb-access-token');
  let user = null;
  if (token) {
    try {
      const r = await fetch(`${SB_URL}/auth/v1/user`, {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` },
      });
      if (r.ok) user = await r.json();
    } catch (_) { user = null; }
  }
  if (!user || !user.id) {
    return Response.redirect(new URL('/login.html', request.url), 302);
  }

  const kind = gateKind(url.pathname);
  if (!kind) return next();

  // fail closed: if the role cannot be read, the sensitive page is not served
  let role = null;
  try { role = await getRole(token, user.id); } catch (_) { role = null; }
  const denied = () => Response.redirect(new URL('/access_denied.html', request.url), 302);
  if (!role) return denied();

  if (kind === 'admin') {
    return String(role).toLowerCase().trim() === 'admin' ? next() : denied();
  }
  const allowed = TM_PAGES[normalizeRole(role)] || TM_PAGES.agent;
  return allowed.includes(targetPageName(url.pathname)) ? next() : denied();
}
