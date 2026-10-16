const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = path.normalize('c:/Users/h/Desktop/New folder');
const REMOTE_HOST = 'iygwhapcpdmsasqlfelv.supabase.co';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function handleProxy(req, res, targetPath) {
  const clientOrigin = req.headers.origin || '*';

  // Handle CORS preflight options
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': clientOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
      'Access-Control-Allow-Credentials': 'true',
    });
    return res.end();
  }

  const options = {
    hostname: REMOTE_HOST,
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: REMOTE_HOST,
      origin: 'https://we-core.icu',
      referer: 'https://we-core.icu/',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers };
    headers['access-control-allow-origin'] = clientOrigin;
    headers['access-control-allow-credentials'] = 'true';
    headers['access-control-allow-methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
    headers['access-control-allow-headers'] = req.headers['access-control-request-headers'] || 'authorization, x-client-info, apikey, content-type, x-supabase-auth';
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy failed', detail: err.message }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch (_) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  // Intercept proxy requests
  if (parsedUrl.pathname.startsWith('/supabase-proxy')) {
    const targetPath = (parsedUrl.pathname.replace(/^\/supabase-proxy/, '') || '/') + parsedUrl.search;
    return handleProxy(req, res, targetPath);
  }

  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname.endsWith('/')) {
    pathname += 'index.html';
  }

  let filePath = path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (!path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
          filePath = htmlPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end('<h1>404 Not Found</h1><p><a href="/Game.html">Go to Games</a></p>');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end('<h1>404 Not Found</h1><p><a href="/Game.html">Go to Games</a></p>');
      }
    } else if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Internal Server Error: ' + readErr.message);
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`WE-Core Local Dev Server running at: http://localhost:${PORT}`);
  console.log(`- Game Portal: http://localhost:${PORT}/Game.html`);
  console.log(`- WE Quiz Game: http://localhost:${PORT}/quiz-game/index.html`);
});
