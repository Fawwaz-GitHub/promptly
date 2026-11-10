# Promptly ✨

Promptly is like Grammarly, but for AI prompts. It fixes grammar and rewrites prompts so they're clear, structured and specific, and it works on any site.

```
promptly/
  backend/    FastAPI (Python): OpenRouter calls, usage limits, Supabase writes. Holds all secrets.
  web/        React + Vite + TypeScript + Tailwind: landing page, editor, login, account.
  extension/  Chrome extension (Manifest V3): ✨ button on every text box + popup toggles.
  supabase/   SQL migration for users and usage.
```
The browser and the extension only talk to the **backend**. The OpenRouter key never leaves it.

## Plans & limits
| Who | Limit |
|---|---|
| Guest (not signed in) | **5 refinements** total, per device |
| Free (signed in with email) | **Unlimited** |
| Pro (future, paid) | configure in `backend/app/plans.py` |

## 1. Run the backend (port 8000)
Needs Python 3.11+.
```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env               # then put your OpenRouter key in .env
uvicorn app.main:app --reload --port 8000
```
Check it at http://localhost:8000/health. Interactive API docs are at http://localhost:8000/docs.

Get a free OpenRouter key at https://openrouter.ai/keys. Models ending in `:free` cost nothing; set them with `OPENROUTER_MODEL` and `OPENROUTER_FALLBACK_MODELS`. If the Supabase variables are empty, the backend runs in **local mode**: no sign-in, and guest usage is kept in memory.

Run the tests with `pytest`.

## 2. Run the frontend (port 3000)
```bash
cd web
cp .env.example .env               # VITE_API_URL=http://localhost:8000
npm install
npm run dev                        # http://localhost:3000
```

## 3. Chrome extension
```bash
cd extension
npm install
npm run build
```
1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `extension/dist`.
2. Click into any text box with some text. A ✨ **Promptly** button appears; click it, or press **Alt+Shift+P**, then **Replace** or **Copy**.
3. The popup has a global on/off switch, a per-site switch, the mode, your remaining uses and sign-in.
4. For production, bake in your URLs: `PROMPTLY_API_BASE=https://api.your-domain.com PROMPTLY_SITE_BASE=https://your-domain.com npm run build`. You can also change both in the popup under **Advanced**.

## 4. Email login (Supabase, free tier)
1. Create a project at https://supabase.com and run `supabase/migrations/001_init.sql` in its **SQL Editor**.
2. In **Authentication → URL Configuration**, set **Site URL** to the frontend (e.g. `http://localhost:3000`) and add `http://localhost:3000/login` (plus your production `/login` URL) to **Redirect URLs**.
3. From **Project Settings → API**, copy:
   - into `backend/.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - into `web/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Restart both. "Sign in" now emails a magic link. The extension signs in through the website (`/login?ext=1`), which hands the session to the extension.

## Environment variables
| Service | Variable | Purpose |
|---|---|---|
| backend | `OPENROUTER_API_KEY` | your OpenRouter key (secret) |
| backend | `OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS` | free models to use |
| backend | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | login + usage DB (service key is secret) |
| backend | `FRONTEND_URL` | allowed CORS origin(s), comma-separated |
| backend | `EXTENSION_ID` | optional: only allow your published extension |
| web | `VITE_API_URL` | backend URL |
| web | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | browser sign-in (public values) |

## Deploy on Vercel (recommended)
Create **two Vercel projects from this same GitHub repo** at [vercel.com/new](https://vercel.com/new). Enter keys only in the Vercel dashboard (Project → Settings → Environment Variables).

**1. API project (FastAPI)**
- Import the repo and set **Root Directory** to `backend`. Vercel detects FastAPI and serves the `app` exported from `backend/index.py`.
- Environment variables: `OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `FRONTEND_URL`. `FRONTEND_URL` is your web URL; separate several with commas, for example production and preview.
- **Supabase is required here.** Vercel functions are serverless, so the in-memory fallback resets between requests and the 5-refinement guest limit would not hold.
- After deploying, check `https://<api-project>.vercel.app/health`.

**2. Web project (React)**
- Import the repo again and set **Root Directory** to `web`. Vercel detects Vite and reads `web/vercel.json`, which handles SPA routing.
- Environment variables: `VITE_API_URL=https://<api-project>.vercel.app`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Then add the web URL to the API project's `FRONTEND_URL` and redeploy the API.

**3. Supabase:** in Auth → URL Configuration, set Site URL to the web URL and add `https://<web-project>.vercel.app/login` to Redirect URLs.

**4. Extension (free, no Chrome Web Store):** build the downloadable zip against your live URLs:
```bash
cd extension && PROMPTLY_API_BASE=https://<api-project>.vercel.app PROMPTLY_SITE_BASE=https://<web-project>.vercel.app npm run release
```
This writes `web/public/promptly-extension.zip`. Commit it and redeploy the web project. Visitors download it from the website's `/extension` page and install it with **Load unpacked**; the page has step-by-step instructions.

## Other hosts
- **Backend:** any Python host (Render, Railway, Fly.io) or Docker. `backend/Dockerfile` runs `uvicorn` on `$PORT`.
- **Frontend:** Netlify also works (root `web`, build `npm run build`, output `dist`; `public/_redirects` handles SPA routing).

## Adding the paid version later
1. Set limits in `backend/app/plans.py`, e.g. `free` → `daily=30` and `pro` → `daily=None`. Pro could also use a better paid model.
2. Add a FastAPI route for Stripe Checkout and a webhook route. On `checkout.session.completed`, set `profiles.plan = 'pro'` for the user; on cancellation set it back to `'free'`.
3. Enable the "Upgrade" buttons in `web/src/components/PricingCards.tsx` and `web/src/pages/Account.tsx`.

Daily limits are counted from the `usage_events` table, which is already written on every refinement.

## API
| Method | Path | Notes |
|---|---|---|
| POST | `/api/refine` | body `{text, mode}` (`improve`/`grammar`/`concise`); header `Authorization: Bearer <supabase token>` or `X-Device-Id`. Returns `{improved, changes, model, original, mode, usage}`; `402 limit_reached` when out of free uses |
| GET | `/api/me` | plan, remaining uses, whether sign-in is enabled |
| POST | `/api/auth/refresh` | `{refresh_token}` → new session (used by the extension) |
| GET | `/health` | liveness |

## Notes
- The guest limit is per device ID, and the backend also rate-limits by IP (30/min). Clearing storage resets a device ID, so sign-in is the real gate, which is why paid limits are tied to accounts.
- The IP rate limiter is in memory per process. Use Redis if you run several backend instances.
