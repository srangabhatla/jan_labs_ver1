# Janardhan Labs

> 11 AI utility apps. Each solving a real problem. Built with intent.

Built by **Sriharsha** — Associate PM at Fareportal, founder of Janardhan Comics.

---

## Apps

| # | App | Category | Route |
|---|-----|----------|-------|
| 01 | 🧠 **VisualMind** — Turn notes into visual understanding | Study | `/visualmind` |
| 02 | 💬 **FeedbackTranslator** — Decode what feedback actually means | Communication | `/feedback-translator` |
| 03 | ⚔️ **DebateCoach** — Master both sides of any argument | Thinking | `/debate-coach` |
| 04 | 🎁 **GiftIntelligence** — The perfect gift for every person | Personal | `/gift-intelligence` |
| 05 | 📝 **ExamSimulator** — Test yourself before the test tests you | Study | `/exam-simulator` |
| 06 | 🔍 **ClaimLens** — Verify any claim with evidence | Research | `/claim-lens` |
| 07 | 📖 **Aperture** — See research papers through 6 lenses | Research | `/aperture` |
| 08 | ✍️ **StyleMirror** — Extract your voice. Rewrite anything in it. | Writing | `/style-mirror` |
| 09 | 🚀 **SprintMind** — PRD + JIRA hierarchy from one sentence | Product | `/sprint-mind` |
| 10 | 📋 **ContractScan** — Know what you're signing before you sign it | Legal | `/contract-scan` |
| 11 | ✨ **SkinStack** — Your skin, your stack, no guesswork | Personal | `/skinstack` |

---

## Architecture

```
Browser → React App (CRA, single repo)
               ↓ (session JWT in Authorization header)
        POST /api/claude   ← Vercel serverless function
               ↓ (validates JWT, checks rate limit)
        Supabase Auth      ← session verification
               ↓ (if valid, under 50k tokens/day)
        Anthropic API      ← key lives only here
               ↓
        usage_logs table   ← Supabase, per-app tracking
```

**Key principles:**
- Anthropic key is **never in the browser** — always server-side in Vercel env
- One shared key + one Supabase project — logical per-app separation via `app_id`
- Auth: Supabase magic link (email OTP) — no passwords
- Rate limit: 50,000 tokens / user / day
- All 11 apps share one auth session — sign in once, use everything

---

## Project Structure

```
janardhan-labs/
├── api/
│   └── claude.js              # Vercel serverless proxy
├── apps/
│   ├── visualmind/App.jsx
│   ├── feedback-translator/App.jsx
│   ├── debate-coach/App.jsx
│   ├── gift-intelligence/App.jsx
│   ├── exam-simulator/App.jsx
│   ├── claim-lens/App.jsx
│   ├── aperture/App.jsx
│   ├── style-mirror/App.jsx
│   ├── sprint-mind/App.jsx
│   ├── contract-scan/App.jsx
│   └── skinstack/App.jsx
├── shared/
│   ├── lib/
│   │   ├── api-client.js      # callClaude() — all apps import this
│   │   └── supabase-client.js # Supabase singleton + auth helpers
│   └── components/
│       └── AuthWrapper.jsx    # Themed login screen per app
├── src/
│   ├── index.js               # CRA entry + hash router
│   └── Home.jsx               # Portfolio landing page
├── supabase/
│   └── setup.sql              # DB schema, RLS, views — paste into SQL Editor
├── public/
│   └── index.html
├── .env.example               # Copy to .env, fill in values
├── .gitignore
├── vercel.json                # Routing + function config + security headers
└── package.json
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourusername/janardhan-labs.git
cd janardhan-labs
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste + run `supabase/setup.sql`
3. Go to **Authentication → Settings**:
   - Enable Email provider
   - Set OTP expiry to `3600`
   - Add your domain to Site URL and Redirect URLs
4. Go to **Settings → API** → copy:
   - Project URL → `REACT_APP_SUPABASE_URL`
   - `anon` public key → `REACT_APP_SUPABASE_ANON`
   - `service_role` key → for Vercel only (never in `.env`)

### 3. Environment variables

```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 4. Local development

```bash
npm start
# App runs at http://localhost:3000
# /api/claude won't work locally without a proxy setup
# For local API testing: set REACT_APP_PROXY_URL to a local tunnel URL
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add these environment variables in the Vercel dashboard:

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_URL` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role |
| `ALLOWED_ORIGIN` | Your deployed domain, e.g. `https://janardhan.dev` |
| `REACT_APP_SUPABASE_URL` | Supabase → Settings → API |
| `REACT_APP_SUPABASE_ANON` | Supabase → Settings → API → anon public |

---

## Adding a new app

1. Create `apps/your-app/App.jsx`
2. Import shared utilities:
   ```js
   import { callClaude } from "../../shared/lib/api-client";
   import AuthWrapper from "../../shared/components/AuthWrapper";
   ```
3. Add your app ID to `api/claude.js` → `VALID_APP_IDS`
4. Add a theme to `shared/components/AuthWrapper.jsx` → `APP_THEMES`
5. Add a route to `src/index.js`
6. Add a card to `src/Home.jsx` → `APPS`

---

## Rate limiting

50,000 tokens per user per 24 hours. Tracked in Supabase `usage_logs`.

To adjust: change `DAILY_TOKEN_LIMIT` in `api/claude.js`.

To monitor usage, run in Supabase SQL Editor:
```sql
SELECT * FROM app_analytics ORDER BY day DESC LIMIT 50;
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, CRA |
| API proxy | Vercel Serverless Functions |
| Auth | Supabase Auth (magic link / OTP) |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude Sonnet |
| Deployment | Vercel |
| CI | GitHub Actions |

---

## Made by

**Sriharsha** — Associate PM at Fareportal, founder of [Janardhan Comics](https://janardhan.dev)

LinkedIn: [linkedin.com/in/sriharsha-rangabhatla](https://linkedin.com/in/sriharsha-rangabhatla)

---

*Janardhan Labs © 2026*
