# 🏛️ TheBar — AI Legal Practice Platform

**Free for solo & small firm attorneys.** AI-powered intake, research, drafting, and practice management — no subscription, no credit card.

---

## ⚡ Deploy in 5 Minutes

### Option A — Vercel (Recommended · Free Forever)

Vercel's free Hobby tier covers everything TheBar needs: global CDN, edge functions, automatic HTTPS, custom domain.

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Clone / download this repo, then:
cd thebar
vercel

# 3. Follow the prompts (no framework, output dir = public)
# 4. Add your API key in Vercel Dashboard → Project → Settings → Environment Variables:
#    ANTHROPIC_API_KEY = sk-ant-...
# 5. Redeploy: vercel --prod
```

**That's it.** Attorneys visit the URL and use TheBar — no API key required on their end.

---

### Option B — Railway (Recommended · Free Tier Available)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login and deploy
railway login
cd thebar
railway init
railway up

# 3. Set env var in Railway Dashboard → Variables:
#    ANTHROPIC_API_KEY = sk-ant-...
# 4. Generate a public domain: Railway Dashboard → Settings → Domains
```

---

### Option C — Local / Self-Hosted (Any VPS, Fly.io, Render, etc.)

```bash
cd thebar
node server.js
# App runs on http://localhost:3000
```

Set `ANTHROPIC_API_KEY` in your environment or `.env.local` file.

---

## 🔑 API Key Architecture

TheBar uses a **two-tier key system** so attorneys never need to supply their own key:

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Attorney)                │
│                                                      │
│  Sends request to /api/claude                        │
│  ├─ X-Provider: anthropic                            │
│  └─ X-User-Key: [only if attorney entered one]      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│             Server-Side Proxy (/api/claude)          │
│                                                      │
│  1. Use ANTHROPIC_API_KEY env var  ← PRIORITY        │
│  2. Fall back to user-supplied key (X-User-Key)      │
│  3. Error if neither present                         │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│         Anthropic / OpenAI / Gemini API              │
└─────────────────────────────────────────────────────┘
```

**What this means:**
- Set `ANTHROPIC_API_KEY` in Vercel/Railway → attorneys use AI for free, zero config
- No env var set → attorneys can enter their own key in Settings (stored in their browser)
- Attorney-supplied keys are **never logged** and are only used as a proxy passthrough

---

## 🏗️ Project Structure

```
thebar/
├── public/
│   └── index.html          ← Complete SPA (all UI + client logic)
├── api/
│   └── claude.js           ← Vercel Edge Function (AI proxy)
├── server.js               ← Node.js server for Railway/VPS
├── vercel.json             ← Vercel deployment config
├── railway.toml            ← Railway deployment config
├── nixpacks.toml           ← Railway build config
├── package.json
├── .env.example
└── .gitignore
```

---

## 🛡️ Security

- **Keys never leave the server** — the proxy receives the key from env vars, never exposes it to the browser
- **CORS locked** — only `.vercel.app`, `.railway.app`, and `https://thebar.*` domains accepted
- **Rate limiting** — 25 requests/IP/minute server-side (+ 12/min client-side)
- **Path traversal protection** — static file server validates all paths
- **No logging of API keys** — error messages redact any key material
- **HTTPS enforced** — HTTP redirects to HTTPS in production
- **CSP headers** — restrict script sources, prevent data exfiltration
- **No database** — all attorney data stays in their browser (localStorage)

---

## 💸 Cost Estimate (Free Tier)

| Platform | Cost | Limits | Suitable for |
|----------|------|--------|--------------|
| Vercel Hobby | **Free** | 100GB bandwidth, unlimited edge fn calls | ✅ Up to ~500 attorneys/mo |
| Railway Starter | **Free** | $5 credit/mo (~500h runtime) | ✅ Solo/small launch |
| Anthropic API | ~$3–15/mo per active attorney | claude-sonnet-4: $3/MTok in, $15/MTok out | Budget: share 1 key across attorneys |

**Practical cost at launch:** $0 platform + Anthropic API usage (~$0.03–0.15 per full intake generation).

---

## 🚀 Investor / Acquisition Readiness

TheBar is architected for zero-friction handoff:

- **No database to migrate** — stateless server, data is client-side
- **Single HTML file UI** — trivially hostable anywhere
- **Provider-agnostic** — swap Anthropic for OpenAI/Gemini in env vars
- **No vendor lock-in** — standard fetch + REST APIs throughout
- **Monetization levers ready:** rate limit tiers, usage analytics hook, white-label theming

---

## 🔧 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Recommended | Powers Claude for all attorneys. If absent, attorneys enter their own. |
| `OPENAI_API_KEY` | Optional | Enables GPT-4o for attorneys who select OpenAI in Settings |
| `GEMINI_API_KEY` | Optional | Enables Gemini 1.5 Pro for attorneys who select Google in Settings |
| `PORT` | Auto | Set by Railway/Heroku automatically. Defaults to 3000. |
| `NODE_ENV` | Auto | Set to `production` to enable HTTPS redirect |

---

## 📋 Local Development

```bash
cd thebar

# Set your key
export ANTHROPIC_API_KEY=sk-ant-...

# Run (no install needed — zero dependencies)
node server.js

# Visit http://localhost:3000
```

The app auto-detects localhost and allows direct browser-to-API calls as fallback (attorneys can enter keys locally).

---

## ⚖️ Legal Disclaimer

TheBar is not a law firm and does not provide legal advice. All AI-generated content requires attorney review before use. Use constitutes acceptance of these terms.
