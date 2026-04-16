/**
 * THE BAR — Node.js server entry point
 * Use this for Railway, Render, Fly.io, or any Node host.
 * For Vercel, this file is ignored — Vercel uses api/claude.js directly.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-… node server.js
 *   PORT=8080 node server.js  (default: 3000)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Inline the proxy handler (avoids needing express) ──────────────────────
const claudeHandler = require('./api/claude');

// Tiny mock of Vercel's req/res interface for the handler
function adaptHandler(nodeReq, nodeRes) {
  return new Promise((resolve) => {
    let body = '';
    nodeReq.on('data', chunk => { body += chunk; });
    nodeReq.on('end', () => {
      // Build a Vercel-compatible req object
      const vReq = {
        method: nodeReq.method,
        headers: nodeReq.headers,
        body: body || '{}',
        url: nodeReq.url,
      };

      // Build a Vercel-compatible res object
      let statusCode = 200;
      const respHeaders = {};
      const vRes = {
        status(code) { statusCode = code; return vRes; },
        set(hdrs) { Object.assign(respHeaders, hdrs); return vRes; },
        json(data) {
          const payload = JSON.stringify(data);
          nodeRes.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...respHeaders,
          });
          nodeRes.end(payload);
          resolve();
        },
        end() {
          nodeRes.writeHead(statusCode, respHeaders);
          nodeRes.end();
          resolve();
        },
      };

      try {
        const result = claudeHandler(vReq, vRes);
        if (result && typeof result.then === 'function') {
          result.then(resolve).catch(err => {
            console.error('[TheBar server] Handler error:', err.message);
            if (!nodeRes.headersSent) {
              nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
              nodeRes.end(JSON.stringify({ error: 'Internal server error' }));
            }
            resolve();
          });
        }
      } catch (err) {
        console.error('[TheBar server] Sync handler error:', err.message);
        if (!nodeRes.headersSent) {
          nodeRes.writeHead(500, { 'Content-Type': 'application/json' });
          nodeRes.end(JSON.stringify({ error: 'Internal server error' }));
        }
        resolve();
      }
    });
  });
}

// ── MIME types ──────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

// ── HTTP server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  // API route
  if (pathname === '/api/claude') {
    await adaptHandler(req, res);
    return;
  }

  // Static file serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Default to index.html for client-side routing
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);

    // Cache headers
    const cacheControl = ext === '.html'
      ? 'no-cache, must-revalidate'
      : 'public, max-age=3600';

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': content.length,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  The Bar — running on port ${PORT}      ║`);
  console.log(`╚══════════════════════════════════════╝`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  API Key:  ${process.env.ANTHROPIC_API_KEY ? '✓ Set via environment' : '✗ Not set — attorneys must supply their own'}`);
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[TheBar] Port ${PORT} is already in use. Set PORT env var to use a different port.\n`);
  } else {
    console.error('[TheBar] Server error:', err.message);
  }
  process.exit(1);
});
