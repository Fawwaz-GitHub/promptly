# Promptly ✨

Promptly is like Grammarly, but for AI prompts. It fixes grammar and rewrites prompts so they're clear, structured and specific, and it works on any site.

- **Web app** (`web/`): Next.js 15 + TypeScript + Tailwind. It has the editor UI and the API. The API is the only place your OpenRouter key lives.
- **Chrome extension** (`extension/`): Manifest V3. Adds a ✨ Promptly button to text boxes (ChatGPT, Claude, Gemini, Gmail…). The popup has a global on/off switch, an on/off switch for the current site, a mode picker and sign-in.
- **Database/auth** (`supabase/`): Supabase email magic-link login and usage tracking.

## Plans & limits
| Who | Limit |
|---|---|
| Guest (not signed in) | **5 refinements** total, per device |
| Free (signed in with email) | **Unlimited** |
| Pro (future, paid) | configure in `web/src/lib/plans.ts` |

All limits are in **`web/src/lib/plans.ts`**.

## 1. Run locally
```bash
cd web
cp .env.local.example .env.local   # then fill in OPENROUTER_API_KEY
npm install
npm run dev                        # http://localhost:3000
```
If you leave the Supabase variables empty, the app runs in **local mode**: no sign-in, and guest usage is kept in memory.

Get a free OpenRouter key at https://openrouter.ai/keys. Any model whose ID ends in `:free` is free to use. Set `OPENROUTER_MODEL`, and optionally `OPENROUTER_FALLBACK_MODELS`, which OpenRouter tries automatically when a free model is busy.

## 2. Enable email login (Supabase, free tier)
1. Create a project at https://supabase.com.
2. In **SQL Editor**, paste and run `supabase/migrations/001_init.sql`.
3. Go to **Authentication → URL Configuration**. Set **Site URL** to your site (e.g. `http://localhost:3000`) and add `http://localhost:3000/login` and `https://YOUR-DOMAIN/login` to **Redirect URLs**.
4. From **Project Settings → API**, copy the URL, the `anon` key and the `service_role` key into `web/.env.local`.
5. Restart `npm run dev`. "Sign in" now emails a magic link.

## 3. Chrome extension
```bash
cd extension
npm install
npm run build                                   # uses http://localhost:3000
PROMPTLY_API_BASE=https://your-app.vercel.app npm run build   # for production
```
1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick `extension/dist`.
2. Click into any text box. When there's text, a ✨ **Promptly** button appears. Click it, or press **Alt+Shift+P**, then **Replace** or **Copy**.
3. To sign in from the popup: click **Sign in**. A tab opens at `/login?ext=1`. After you click the magic link, the site passes your session to the extension (only pages on the configured server URL are trusted).
4. The popup's **Advanced → Server URL** setting changes which backend the extension talks to.

For Chrome Web Store upload: run `npm run zip`, which creates `promptly-extension.zip`. Optionally set `NEXT_PUBLIC_EXTENSION_ID` in the web env so the API only accepts CORS requests from your published extension.

## 4. Deploy (Vercel, free)
1. Push this repo to GitHub, import it in Vercel and set **Root Directory** to `web`.
2. Add the env vars from `.env.local.example`, with `NEXT_PUBLIC_SITE_URL` set to your Vercel URL.
3. Add `https://YOUR-DOMAIN/login` to Supabase Redirect URLs.
4. Rebuild the extension with `PROMPTLY_API_BASE=https://YOUR-DOMAIN`.

## Adding the paid version later
Usage is already enforced per plan, so a paid tier is a small change:
1. In `web/src/lib/plans.ts`, set limits. For example: `free: { daily: 30 }` and `pro: { daily: null }` (unlimited). You can also give Pro a better (paid) model.
2. Add Stripe Checkout (`/api/checkout`) and a webhook (`/api/stripe/webhook`). On `checkout.session.completed`, run `update profiles set plan = 'pro' where id = <user>`. On cancellation, set it back to `'free'`.
3. Enable the "Upgrade" buttons in `components/PricingCards.tsx` and `app/account/page.tsx`.

Daily limits are counted from the `usage_events` table, which is already written on every refinement.

## Project layout
```
web/src/lib/plans.ts           plan limits (single source of truth)
web/src/lib/usage.ts           quota logic + in-memory store (tested)
web/src/lib/openrouter.ts      OpenRouter client + robust JSON parsing
web/src/lib/prompts.ts         system prompt & modes (Improve / Grammar only / Concise)
web/src/lib/supabase-server.ts caller identity (JWT or device id) + Supabase store
web/src/app/api/refine         POST {text, mode} -> {improved, changes, usage}
web/src/app/api/me             current plan & remaining
web/src/app/api/auth/refresh   token refresh for the extension
web/src/app/app                editor page (diff view, on/off toggle, auto-suggest)
extension/src/content.ts       inline button + suggestion card (Shadow DOM)
extension/src/background.ts    API calls, session storage/refresh
extension/src/popup.ts         toggles, mode, account
supabase/migrations/001_init.sql
```

## Scripts
- `web`: `npm run dev`, `npm run build`, `npm run lint` (typecheck), `npm test` (usage-limit unit tests)
- `extension`: `npm run build`, `npm run watch`, `npm run typecheck`, `npm run zip`

## Notes
- The guest limit is per device ID, and the API also rate-limits by IP (30/min). A determined user can reset the device ID by clearing storage. Sign-in is the real gate, which is why paid limits are tied to accounts.
- The IP rate limiter is in-memory per server instance. Swap it for Upstash Redis if you need it shared across instances.
