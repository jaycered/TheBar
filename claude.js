/**
 * THE BAR — Vercel Serverless API Proxy
 * Route: /api/claude  (POST)
 *
 * Priority:
 *  1. ANTHROPIC_API_KEY environment variable (set in Vercel dashboard — free tier safe)
 *  2. x-api-key header sent by the client (user's own key entered in Settings)
 *
 * Security:
 *  - CORS locked to same origin in production
 *  - API key NEVER returned in any response
 *  - Request body validated before forwarding
 *  - Streaming disabled (simpler, free-tier compatible)
 */

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS_HARD_CAP = 4096;

// Allowed origins — update if you use a custom domain
function isAllowedOrigin(origin) {
  if (!origin) return true; // server-to-server or same-origin
  if (process.env.NODE_ENV !== 'production') return true;
  return (
    origin.endsWith('.vercel.app') ||
    (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN)
  );
}

function corsHeaders(origin) {
  const ao = isAllowedOrigin(origin) ? origin || '*' : 'null';
  return {
    'Access-Control-Allow-Origin': ao,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  };
}

function sanitizeKey(key) {
  // Never leak key in logs or responses
  if (!key) return '';
  return key.trim().replace(/[^\x20-\x7E]/g, '');
}

module.exports = async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  const headers = corsHeaders(origin);

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).set(headers).end();
  }

  // Method guard
  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ error: 'Method not allowed' });
  }

  // Resolve API key: env var takes priority, then client-supplied header
  const envKey = sanitizeKey(process.env.ANTHROPIC_API_KEY || '');
  const clientKey = sanitizeKey(req.headers['x-api-key'] || '');
  const apiKey = envKey || clientKey;

  if (!apiKey) {
    return res.status(401).set(headers).json({
      error: 'No API key available. Set ANTHROPIC_API_KEY in Vercel environment variables, or enter your key in Settings.',
    });
  }

  // Parse & validate body
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).set(headers).json({ error: 'Invalid JSON body' });
  }

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).set(headers).json({ error: 'messages array is required' });
  }

  // Build safe request — only forward known fields
  const payload = {
    model: body.model || DEFAULT_MODEL,
    max_tokens: Math.min(Number(body.max_tokens) || 4096, MAX_TOKENS_HARD_CAP),
    messages: body.messages,
  };
  if (body.system) payload.system = body.system;

  // Forward to Anthropic
  let anthropicRes;
  try {
    anthropicRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    console.error('[TheBar proxy] Network error reaching Anthropic:', networkErr.message);
    return res.status(502).set(headers).json({ error: 'Unable to reach Anthropic API. Check network connectivity.' });
  }

  // Read response body once
  let data;
  try {
    data = await anthropicRes.json();
  } catch {
    return res.status(502).set(headers).json({ error: 'Invalid response from Anthropic API' });
  }

  // Surface Anthropic errors without leaking the key
  if (!anthropicRes.ok) {
    const msg = (data?.error?.message || JSON.stringify(data)).replace(apiKey, '[REDACTED]');
    console.error(`[TheBar proxy] Anthropic ${anthropicRes.status}:`, msg);
    return res.status(anthropicRes.status).set(headers).json({
      error: `Anthropic API error (${anthropicRes.status}): ${msg}`,
    });
  }

  // Success — forward response
  return res.status(200).set(headers).json(data);
};
