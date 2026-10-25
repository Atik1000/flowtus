# Deploying for free: Render (API + Postgres) and Vercel (storefront + admin)

Deploy the **API first** so the two Vercel apps have an `API_URL` to point at.

## 1. API and database on Render (free)
1. Sign in at https://render.com with GitHub.
2. **New → Blueprint**, choose `Atik1000/flowtus`. Render reads `render.yaml` and creates the `flowtus-api` web service and the free `flowtus-db` PostgreSQL.
3. When asked for the two `sync: false` values, enter anything for now (e.g. `https://example.com`); edit them in step 4.
4. After the first deploy, open the service → **Environment** and read the generated `OWNER_PASSWORD` and `STAFF_PASSWORD` (these are your admin logins). Later set `PUBLIC_WEB_URL` to your Vercel storefront URL.
5. Your API URL looks like `https://flowtus-api.onrender.com`. Check `https://<that>/api/health` returns `{"ok":true}`.

On every start the API runs migrations, seeds the demo catalogue once, and creates the owner and staff accounts.

Free-tier limits: the service sleeps after ~15 minutes idle (first request afterwards takes ~30–60 s), the free database expires after 30 days, and uploaded photos are on an ephemeral disk (they vanish on redeploy). Fine for a demo; for production use a paid plan and an object store.

## 2. Storefront on Vercel
1. https://vercel.com → **Add New → Project** → import `Atik1000/flowtus`.
2. **Root Directory:** `apps/web`. Framework: Next.js (the included `vercel.json` sets the install and build commands).
3. **Environment variables:** `API_URL` = your Render URL (no trailing slash), `NEXT_PUBLIC_ADMIN_URL` = the admin URL from step 3 (add after it exists, then redeploy), `NEXT_PUBLIC_DEMO_BANNER` = `true`.
4. Deploy.

## 3. Admin on Vercel
Same as above, as a second project: **Root Directory** `apps/admin`, env `API_URL` = the Render URL, `NEXT_PUBLIC_STORE_URL` = the storefront URL.

Sign in with `owner@flowtus.local` and the `OWNER_PASSWORD` from Render, then use **Overview › Load sample activity** if you want demo data (it only works when `ALLOW_DEMO_TOOLS=true`; the blueprint leaves it off because `NODE_ENV=production`, so create orders from the storefront instead).

## Notes
- `API_URL` is read at build time for the `/api` rewrite, so changing it needs a redeploy.
- Because the browser only talks to its own Vercel origin, the admin session cookie stays first-party. The first request after the API has been idle may be slow.
