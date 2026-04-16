# The Bar — AI Legal Practice Platform

> Free forever for solo & small-firm attorneys. Powered by Claude Sonnet 4.

---

## Architecture

```
/
├── public/
│   └── index.html        ← Full SPA (landing + app)
├── api/
│   └── claude.js         ← Vercel serverless proxy (Node 18+)
├── vercel.json           ← Routes, headers, function config
├── package.json
└── .env.example
```

**How the API key works:**

| Environment | Key Source |
|---|---|
| Deployed (Vercel/Railway) | `ANTHROPIC_API_KEY` env var — attorneys pay nothing |
| Local dev without env var | User prompted; stored in localStorage only |
| User adds key in Settings | Forwarded as override; env var still takes priority |

---

## Deploy to Vercel — 5 minutes, free

**1. Install & deploy**
```bash
npm i -g vercel
vercel
# Framework: Other | Root: ./
```

**2. Set the env var** — Vercel Dashboard → Project → Settings → Environment Variables:
```
ANTHROPIC_API_KEY = sk-ant-api03-...
Environments: Production + Preview + Development
```

**3. Redeploy**
```bash
vercel --prod
```

Done. Attorneys visit your URL, set up in 90 seconds, all AI calls are covered by your key.

---

## Local dev
```bash
npm install
cp .env.example .env.local   # add your key
npx vercel dev               # http://localhost:3000
```

Or just open `public/index.html` — you'll be prompted for a key on first AI use.

---

## Railway alternative

Add `server.js` at root:
```js
const express = require('express');
const handler = require('./api/claude');
const app = express();
app.use(express.json());
app.use(express.static('public'));
app.all('/api/claude', handler);
app.listen(process.env.PORT || 3000);
```

Add `express` to dependencies, set `start: "node server.js"` in package.json.
Set `ANTHROPIC_API_KEY` in Railway Variables. Vercel is simpler.

---

## Cost at scale (Anthropic API)

Claude Sonnet 4 ≈ $0.05 per full intake generation.
$50/month covers ~1,000 full intakes + unlimited research/drafting.
Client-side rate limit: 12 AI calls/60s per browser tab (built-in).

---

## Security

- API key: Vercel env only, never in client code
- CSP: blocks unauthorized origins, `frame-ancestors: none`
- XSS: all user input sanitized via `esc()` before DOM injection  
- Keys redacted from all error messages and logs
- HTTPS enforced via client-side redirect

---

© 2026 The Bar — v6.0
