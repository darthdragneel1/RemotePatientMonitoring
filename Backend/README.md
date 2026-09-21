# Telemetry Backend

Backend for the multi-tenant device telemetry dashboard. Receives telemetry, status, and heartbeat data forwarded by MioConnect for Lifesense/Transtek devices (BP monitors, scales, glucose meters, pulse oximeters), stores it, and exposes a scoped API so organizations can see only their own devices/patients while a super admin can see everything.

## Tech Stack

- **Runtime**: Node.js (v24) + TypeScript
- **Framework**: Express 5
- **ORM**: Prisma 6.19.3 (pinned — see [Notes on dependency versions](#notes-on-dependency-versions))
- **Database**: PostgreSQL (local dev via Homebrew, started manually — not a background service)
- **Auth**: JWT (httpOnly cookie) + bcryptjs

## Project Structure

```
src/
  index.ts        # app entrypoint, starts the HTTP server
  app.ts          # express app instance, middleware, routes
  routes/
    auth.routes.ts       # /auth/login, /auth/logout, /auth/me
    ingest.routes.ts     # /ingest/telemetry, /ingest/status, /ingest/heartbeat
    patients.routes.ts   # /patients (CRUD, org-scoped)
    devices.routes.ts    # /devices (CRUD) + /devices/:id/telemetry(/latest)
    admin.routes.ts       # /admin/organizations, /admin/invites (SUPER_ADMIN only)
    invites.routes.ts     # /invites/:token, /invites/:token/accept (public)
  controllers/
    auth.controller.ts    # login/logout/me handlers
    ingest.controller.ts  # MioConnect payload handlers
    patients.controller.ts
    devices.controller.ts
    telemetry.controller.ts
    admin.controller.ts   # org creation, invite creation/listing/revocation
    invites.controller.ts # public accept-invite handlers
  schemas/          # zod request-body/query schemas per resource
  middleware/
    auth.ts              # requireAuth, requireRole, orgScope
    ingestAuth.ts         # requireIngestApiKey (MioConnect header check)
    validate.ts            # validateBody/validateQuery (zod)
  utils/
    jwt.ts               # sign/verify helpers
    inviteToken.ts         # invite token generate/hash
    email.ts               # sendInviteEmail (stubbed, see below)
    scope.ts               # resolveCreateOrgId (org resolution on create)
    params.ts               # typed req.params accessor
  types/
    auth.ts              # JwtPayload type, Express.Request augmentation
  db/
    prisma.ts     # shared PrismaClient singleton
prisma/
  schema.prisma   # data model
  seed.ts         # dev seed data
  migrations/     # generated SQL migrations
```

## Data Model

- **Organization** — a tenant (clinic/hospital group).
- **User** — `email`, `passwordHash`, `role` (`ORG_USER` | `ORG_ADMIN` | `SUPER_ADMIN`), optional `orgId` (null for super admins).
- **Patient** — belongs to an `Organization`; holds name, date of birth, gender, MRN, phone, notes.
- **Device** — belongs to an `Organization`, optionally linked to a `Patient`; holds MioConnect's `deviceId`, model number, IMEI, serial number.
- **TelemetryEvent** — belongs to a `Device` (cascade-deleted with it); `kind` (`TELEMETRY` | `STATUS` | `HEARTBEAT`), raw JSON `payload`, `recordedAt` (indexed with `deviceId` for query performance).
- **Invite** — belongs to an `Organization`; `email`, `role`, a hashed token (`tokenHash`), `expiresAt`, `acceptedAt`. Deleting a `Patient` sets `Device.patientId` to null rather than blocking or cascading.

Multi-tenancy is enforced at the query layer: non-admin requests are always scoped by `orgId`; `SUPER_ADMIN` bypasses that filter.

## Auth

- **`POST /auth/login`** — `{ email, password }` → sets an httpOnly JWT cookie (`secure` in production, `sameSite: lax`, 8h expiry) and returns the user object.
- **`POST /auth/logout`** — clears the session cookie.
- **`GET /auth/me`** — protected; returns the currently authenticated user.

Middleware in `src/middleware/auth.ts`:
- `requireAuth` — verifies the JWT cookie, attaches `req.user` (`userId`, `role`, `orgId`).
- `requireRole(...roles)` — gates a route to specific roles (e.g. admin-only).
- `orgScope(req)` — returns `{ orgId }` for org users or `{}` (no filter) for `SUPER_ADMIN`. This is the single source of truth for tenant isolation — every device/patient/telemetry query should spread this into its Prisma `where` clause rather than re-implementing the role check.

## Ingest (MioConnect → this server)

- **`POST /ingest/telemetry`**, **`/ingest/status`**, **`/ingest/heartbeat`** — receive data forwarded by MioConnect per the [Fully Managed Devices integration guide](https://lifesense.feishu.cn/docx/G9dbdospvouqkFxKUiRcVZIPntb). Each is also registered with an optional `/:deviceId` suffix to support MioConnect's `useDeviceIdInForwardingUrl` dashboard setting.
- Authenticated by a **static header** (`requireIngestApiKey` middleware), not user JWT auth — the header name/value are configured via `INGEST_API_KEY_NAME` / `INGEST_API_KEY_VALUE` in `.env`, and the same pair must be entered in the MioConnect dashboard under **Data Forwarding → Authentication**. These are values you generate yourself (not issued by MioConnect); regenerate before going live if the current dev value has ever left `.env`.
- An unrecognized `deviceId` gets `403 Forbidden` (MioConnect retries on non-2xx) rather than being silently dropped or auto-provisioned as an org-less device — devices must be pre-registered with an org in our DB first.
- Each event is stored in `TelemetryEvent` with `kind` set accordingly, the **full raw payload** preserved as JSON, and `recordedAt` resolved from MioConnect's `createdAt` (unix seconds).

## Dashboard API

All routes below require `requireAuth` and are org-scoped via `orgScope` (a `SUPER_ADMIN` sees every org; everyone else sees only their own). A resource that exists but belongs to another org returns `404`, not `403` — this avoids confirming to a caller that a given ID exists at all outside their org.

**Patients**
- `GET /patients`, `GET /patients/:id`
- `POST /patients` — org users' patients are auto-assigned to their own org; `SUPER_ADMIN` must pass `orgId` in the body
- `PATCH /patients/:id`, `DELETE /patients/:id`

**Devices**
- `GET /devices`, `GET /devices/:id` — includes linked `patient` (name) and `org` (name)
- `POST /devices` — same org-assignment rule as patients; if `patientId` is given, it's validated to belong to the same org
- `PATCH /devices/:id`, `DELETE /devices/:id`
- `GET /devices/:id/telemetry?kind=&from=&to=&limit=` — event history, newest first, `limit` capped at 200
- `GET /devices/:id/telemetry/latest` — most recent event per kind (`TELEMETRY`/`STATUS`/`HEARTBEAT`)

**Organizations & Invites** (`SUPER_ADMIN` only, under `/admin`)
- `GET/POST /admin/organizations`
- `GET/POST /admin/invites` — creating an invite emails a link (`{FRONTEND_URL}/accept-invite?token=...`) to an org (see [User & org provisioning](#user--org-provisioning) below)
- `DELETE /admin/invites/:id` — revoke a pending (unaccepted) invite

**Accept-invite** (public — authenticated by the token in the URL, not a login session)
- `GET /invites/:token` — returns the invited email + org, for the frontend to prefill a "set your password" form
- `POST /invites/:token/accept` — `{ password }` → creates the `User`, marks the invite accepted, logs the new user in (sets the session cookie)

## User & org provisioning

There's no self-signup. Two paths onto the platform:

- **`SUPER_ADMIN`** — never created via the API. Only exists via the seed script or a one-off script run directly against the DB. There should be very few of these accounts.
- **Org users** (`ORG_USER` / `ORG_ADMIN`) — a `SUPER_ADMIN` creates the organization (`POST /admin/organizations`), then invites a user into it (`POST /admin/invites`). The invitee gets an emailed link, sets their own password via `POST /invites/:token/accept`, and is logged in immediately. `ORG_ADMIN` currently has no elevated permissions beyond `ORG_USER` (both are simply org-scoped) — self-service user management by org admins is a possible later addition, deliberately deferred for now.

**Email is currently stubbed** — `src/utils/email.ts`'s `sendInviteEmail` just logs the invite link to the console instead of sending anything, since a Resend API key hasn't been added yet. To wire up real delivery:
1. Sign up for [Resend](https://resend.com), get an API key.
2. `npm install resend`, add `RESEND_API_KEY` to `.env`.
3. Replace the body of `sendInviteEmail` with a real `Resend` client call. No caller needs to change.
4. Resend's sandbox sender (`onboarding@resend.dev`) works without verifying a custom domain, so this is testable immediately.

## Prerequisites

- Node.js v20+ 
- PostgreSQL 16 (installed via `brew install postgresql@16`, **not** run as a background service — start manually before working)

```bash
pg_ctl -D /opt/homebrew/var/postgresql@16 start
```

## Setup

```bash
npm install
cp .env.example .env   # edit DATABASE_URL if your local Postgres user differs
createdb telemetry_dev # if not already created
npx prisma migrate dev # applies schema, generates Prisma Client
npx prisma db seed     # loads sample orgs/users/patients/devices
npm run dev             # starts the server on http://localhost:4000
```

Verify it's working:

```bash
curl http://localhost:4000/health
# {"status":"ok","db":"connected"}

curl -c cookies.txt -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@acme.dev","password":"password123"}'

curl -b cookies.txt http://localhost:4000/auth/me

# ingest (use the deviceId of a seeded device, e.g. 100224300182)
curl -X POST http://localhost:4000/ingest/telemetry \
  -H "Content-Type: application/json" \
  -H "x-mioconnect-key: <INGEST_API_KEY_VALUE from your .env>" \
  -d '{"deviceId":"100224300182","createdAt":1647349680,"data":{"data_type":"bpm_gen2_measure","sys":131,"dia":78,"pul":65},"modelNumber":"TMB-2092-G"}'

# dashboard API (reuses the cookie from the login above)
curl -b cookies.txt http://localhost:4000/devices
curl -b cookies.txt "http://localhost:4000/devices/<a device id from the response above>/telemetry"
```

## Seed Data

Running `npx prisma db seed` creates:

- 2 organizations (Acme Health Clinic, Riverside Medical Group)
- 3 users — all with password `password123`:
  - `admin@telemetry.dev` (SUPER_ADMIN, no org)
  - `user@acme.dev` (ORG_USER, Acme)
  - `user@riverside.dev` (ORG_USER, Riverside)
- 3 patients (2 under Acme, 1 under Riverside)
- 3 devices, each linked to an org and a patient

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server with hot reload (`ts-node-dev`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`dist/index.js`) |
| `npx prisma migrate dev` | Create/apply a migration from schema changes |
| `npx prisma db seed` | Re-run the seed script |
| `npx prisma studio` | Open Prisma's DB browser GUI |

## Notes on dependency versions

At the time this project was scaffolded, npm's `latest` tags pointed to pre-release/major-breaking versions for two key packages — pinned to the last stable releases instead:

- **Prisma** pinned to `6.19.3` (not `8.0.0-rc.12`, which is a release candidate that removes the standard `url = env("DATABASE_URL")` schema syntax in favor of a separate `prisma.config.ts` + driver adapter).
- **TypeScript** pinned to `5.9.3` (not `7.0.2`, a very new major likely built on the new native compiler, with unverified `ts-node`/`ts-node-dev` compatibility).
- **bcryptjs** used instead of **bcrypt** — the native `bcrypt` package's install script (`node-gyp` build) was blocked in this environment; `bcryptjs` is a pure-JS drop-in with the same API.

## Roadmap

See the broader project plan (frontend + backend) for phased build order: ~~auth (Phase 2)~~ done, ~~MioConnect ingest endpoints (Phase 3)~~ done, ~~dashboard-facing API + user/org provisioning (Phase 4)~~ done, frontend (Phases 5-6), end-to-end wiring with ngrok (Phase 7), hardening (Phase 8), deployment (Phase 9).
