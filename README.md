# FLOWTUS v2 — monorepo

Florist and floral-services platform for Dhaka: storefront, custom flower orders, a five-step gift builder, 12 bookable wedding/event services with quote and deposit workflow, corporate orders, customer status pages, and the owner/staff admin panel. Built from the design handoff in `design_handoff_flowtus_v2` (look and behaviour are reproduced; the prototype's `localStorage` backend is replaced by a real server and PostgreSQL).

| Path | What it is |
|---|---|
| `apps/web` | Next.js 15 storefront (EN / বাংলা), port 3000 |
| `apps/admin` | Next.js 15 admin panel, port 3001 |
| `apps/api` | NestJS 11 API + Prisma + PostgreSQL, port 4000 |
| `packages/core` | The prototype's business rules as typed pure functions (pricing, availability, state machines, quotes, payments, validation) plus the 94-scenario suite. Used by the API (authoritative) and the browsers (instant feedback) |
| `packages/ui` | Design tokens/CSS from the README, the configurable `Field` renderer, i18n, API client |

## Run it

Requires Node 20+ and Docker (for PostgreSQL).

```bash
npm install
npm run db:up                                   # PostgreSQL 16 on :5432
cp apps/api/.env.example apps/api/.env          # edit secrets/passwords
npm run build:packages                          # builds @flowtus/core
npm run db:migrate && npm run db:seed           # schema, demo catalogue, owner + staff accounts
npm run dev:api        # :4000
npm run dev:web        # :3000
npm run dev:admin      # :3001
```

Admin sign-in uses `OWNER_EMAIL`/`OWNER_PASSWORD` and `STAFF_EMAIL`/`STAFF_PASSWORD` from `apps/api/.env` (seeded with bcrypt). In the admin, **Overview › Load sample activity** creates clearly labelled "Sample: …" records (needs `ALLOW_DEMO_TOOLS=true`, never active in production).

`npm run dev:packages` rebuilds `@flowtus/core` on change. If you edit core, rebuild it before restarting the API.

## Tests

```bash
npm test                      # core: 94 scenarios (91 pass, 3 "n/a" by design) + API e2e on real PostgreSQL
```

The API e2e suite wipes orders/requests, so it only runs against a database whose name contains `test` (`DATABASE_URL_TEST`; see `apps/api/.env.example`). It covers idempotent retries, server re-pricing, last-slot and exclusive-booking races, duplicate transaction IDs, role checks, CSRF header, private uploads and `/track` lockout. The admin **Test report** page runs the same core scenarios live.

## How the handoff's production list was handled

1. **Backend + database** — `core` is ported to TypeScript and runs on the server inside PostgreSQL transactions. Capacity is enforced with `pg_advisory_xact_lock` per delivery window and per service-date, re-checked at confirmation. Idempotency keys are stored server-side (`IdempotencyKey`, unique).
2. **Authentication** — bcrypt hashes, signed httpOnly session cookie, rate-limited login, `@Roles` guard on admin routes plus the rules' own owner-only checks (Staff cannot confirm, approve, send quotes, verify payments, refund, or edit payment/policy settings), CSRF header on cookie writes.
3. **Uploads** — type sniffed from file bytes, 5 MB limit, generated filenames, stored outside the web root, served only through short-lived HMAC-signed links for staff. Local disk by default; swap `UploadsService` for S3/R2 in production.
4. **Payments** — manual bKash/Nagad, never auto-verified. Merchant numbers are set by the owner in Settings and are sent to a customer only once an order exists or a quote is approved.
5. **Notifications** — every new order/request and every customer-visible message is written to the `Notification` outbox table (SMS/WhatsApp/email text). **No provider is connected yet**: add a worker that drains rows where `sentAt IS NULL`.
6. **Content** — prices, products, packages, photos (Pexels IDs in `packages/ui/src/images.ts`), policies and FAQs remain demonstration/draft data, flagged as drafts until the owner ticks "approved". Bangla covers navigation, home copy, statuses, units and service names; descriptions, validation messages and policies are English until approved copy exists.
7. **Owner approval** of prices, policies, FAQs and contact details is still required.

Deliberate changes from the prototype: delivery instructions entered at checkout are now stored (the prototype overwrote them); the demo banner is controlled by `NEXT_PUBLIC_DEMO_BANNER`; the 21-day calendar, overview counts and lists are computed from the database.

## Deployment notes

- Set `NODE_ENV=production`, a real `JWT_SECRET` (≥ 32 chars; the API refuses to start otherwise), strong seed passwords, `NEXT_PUBLIC_DEMO_BANNER=false`, `PUBLIC_WEB_URL`, `CORS_ORIGINS`.
- The web and admin apps proxy `/api/*` to `API_URL` so the browser only talks to its own origin. Serve over HTTPS (cookies are `secure` in production).
- `/track` and rate limits keep counters in process memory; use a shared store (Redis) if you run more than one API instance.
- Run `npm run db:migrate` (`prisma migrate deploy`) on each release.
