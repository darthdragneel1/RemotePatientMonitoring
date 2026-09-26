# Telemetry Frontend

Dashboard for the multi-tenant device telemetry app. Organizations log in and see only their own devices/patients; a super admin sees everything and manages organizations and user invites. Talks to [telemetry-backend](../telemetry-backend).

## Tech Stack

- **Build tool**: Vite + React 19 + TypeScript
- **Routing**: React Router
- **Data fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS v4 + shadcn/ui (style: `base-nova`, base color: neutral) — built on **Base UI** (`@base-ui/react`), not Radix; see [Base UI gotchas](#base-ui-gotchas) below
- **Auth**: session cookie (httpOnly, set by the backend) — no client-side token storage
- **Forms**: plain `useState` per form (no react-hook-form) — forms here are short enough not to need it
- **Notifications**: `sonner` toasts for mutations, Web Push (VAPID + Service Worker), real-time SSE alerts, and an interactive notification dropdown with touch/mouse drag-to-dismiss gestures.

## Project Structure

```
src/
  main.tsx              # entrypoint: QueryClientProvider, BrowserRouter, AuthProvider, Toaster, ThemeProvider
  App.tsx                # route definitions
  context/
    AuthContext.tsx        # current user state, login/logout, backed by GET /auth/me
  components/
    AppLayout.tsx           # nav bar (role-aware links) + page outlet + notification bell + theme toggle
    ThemeProvider.tsx       # dark/light mode context provider
    ThemeToggle.tsx         # theme switcher button
    NotificationDropdown.tsx # header notification dropdown with badge count & clear all
    SwipeableAlertItem.tsx   # swipe/drag-to-dismiss notification card with direct navigation
    ProtectedRoute.tsx        # redirects to /login if unauthenticated; RequireRole for admin-only routes
    ui/                        # shadcn components (button, input, label, card, table, badge, dialog, select, ...)
  hooks/
    useWebPush.ts              # Web Push subscription management (subscribe/unsubscribe/status)
    useLiveTelemetry.tsx       # SSE live telemetry stream + abnormal vital alerts
    usePatients.ts             # list/get/create/update/delete
    useDevices.ts               # list/get/create/update/delete + telemetry history/latest
    useAdmin.ts                   # organizations + invites (admin-only)
    useAcceptInvite.ts              # public invite preview + accept
  pages/
    LoginPage.tsx             # login form
    AcceptInvitePage.tsx        # set-password form from an invite token
    DevicesPage.tsx               # device list + add-device dialog
    DeviceDetailPage.tsx            # device info, patient reassignment, telemetry history
    PatientsPage.tsx                  # patient list + add-patient dialog
    PatientDetailPage.tsx               # patient info (editable), linked devices
    admin/
      OrganizationsPage.tsx               # org list + create dialog
      InvitesPage.tsx                       # invite list + create/revoke
  lib/
    api.ts                    # fetch wrapper — sends cookies, typed ApiError on non-2xx
    types.ts                   # types mirroring the backend's API shapes
    utils.ts                    # shadcn's cn() helper
```

## Routes

```
/login                     — public
/accept-invite?token=...    — public: preview email/org for the token, set a password, auto-logs in
/                            — protected, redirects to /login if unauthenticated
  /devices                   — device list (org-scoped server-side), add-device dialog
  /devices/:id                 — device detail: info, patient reassignment, interactive display threshold sliders (unified across patient record, live alerting, and table styling), telemetry history
  /patients                     — patient list, add-patient dialog
  /patients/:id                   — patient detail: editable info, linked devices
  /admin/organizations               — SUPER_ADMIN only: org list + create
  /admin/invites                       — SUPER_ADMIN only: invite list + create/revoke
```

Route guards (`ProtectedRoute`, `RequireRole`) are UX only — hiding nav items and avoiding a flash of content a user shouldn't see. The backend enforces real authorization on every request regardless of what the client shows.

## Auth flow

- On load, `AuthContext` calls `GET /auth/me` once (via React Query, `staleTime: Infinity`) to check for an existing session.
- `login(email, password)` calls `POST /auth/login`; the backend sets an httpOnly cookie, so nothing is stored client-side beyond the in-memory user object in React Query's cache.
- Every `api.*` call sends `credentials: "include"` so the cookie rides along automatically.
- `logout()` calls `POST /auth/logout` and clears the cached user.

## Theme

Clinical Blue — chosen to read as calm/trustworthy rather than the default shadcn near-black. Defined as CSS custom properties in `src/index.css` (`:root` for light mode, `.dark` for dark mode):

| Token | Light | Dark |
|---|---|---|
| `--primary` | `#2563eb` (blue-600) | `#3b82f6` (blue-500) |
| `--accent` | `#dbeafe` (blue-100) | `#1e3a8a` (blue-900) |
| `--ring` | `#2563eb` | `#3b82f6` |

Active nav links in `AppLayout` also use `text-primary` to match. To retheme later, edit the token values in `src/index.css` — everything else (buttons, focus rings, active states) derives from them via Tailwind's `@theme inline` mapping, no per-component changes needed.

## Base UI gotchas

The shadcn style used here (`base-nova`) is built on [Base UI](https://base-ui.com), not Radix — the two have different APIs despite shadcn's docs/examples usually assuming Radix. Things that bit us building the feature screens:

- **No `asChild`.** Radix's composition pattern (`<Trigger asChild><Button/></Trigger>`) doesn't exist. Use Base UI's `render` prop instead: `<DialogTrigger render={<Button>Add Device</Button>} />`.
- **`Select`'s `onValueChange` passes `string | null`**, not `string` — Base UI natively supports "no selection" as `null` rather than requiring a sentinel value. Handlers need to account for the `null` case (see `DeviceDetailPage`'s patient-unassign handling).
- **`SelectValue` shows the raw value, not a label, when pre-populated on load.** If a `Select` mounts with a `value` already set (e.g. reassigning an existing device's patient), the trigger displays the raw value string until the user opens the dropdown — because it hasn't yet seen a `SelectItem` with a matching label. Fix: pass a render-function as `SelectValue`'s `children`, mapping value → label yourself:
  ```tsx
  <SelectValue>
    {(value: string | null) => {
      if (!value) return "Unassigned";
      return patients?.find((p) => p.id === value)?.firstName ?? value;
    }}
  </SelectValue>
  ```
- **The shadcn CLI (`npx shadcn@latest add ...`) has, twice now, written new components into a literal `./@/...` folder at the project root** instead of resolving the `@/` alias to `src/`, despite `tsconfig.app.json` and `vite.config.ts` both being configured correctly first. Check for a stray `./@` directory after running `add` and move its contents into `src/` manually if present.

## Prerequisites

- Node.js v20+
- The backend running locally (see [telemetry-backend/README.md](../telemetry-backend/README.md)) — this app has no functionality without it

## Setup

```bash
npm install
cp .env.example .env   # edit VITE_API_URL if the backend isn't on the default port
npm run dev             # starts the dev server on http://localhost:5173
```

## Seeded accounts (from the backend's seed data)

All passwords are `password123`:

| Email | Role |
|---|---|
| `admin@telemetry.dev` | Super Admin — sees all orgs |
| `user@acme.dev` | Org User — Acme Health Clinic |
| `user@riverside.dev` | Org User — Riverside Medical Group |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |

## Notes on dependency versions

`npm create vite@latest` pulled fairly new majors for a couple of packages at scaffold time (React 19, Vite 8, TypeScript 6.0.2). These were left as scaffolded rather than pinned down, since Vite uses esbuild for dev/build (not `tsc`), so the `ts-node`-style compatibility risk that applied to the backend doesn't apply here — `tsc` only runs for the build's type-check step. `tsconfig.app.json` drops the `baseUrl` option (deprecated as of TS 6.0.2 ahead of its removal in TS 7) in favor of `paths` alone, which resolves relative to the tsconfig file without it.

## Roadmap

See the broader project plan (frontend + backend) for phased build order: ~~backend Phases 1-4~~ done, ~~frontend foundation (Phase 5)~~ done, ~~feature screens (Phase 6)~~ done, end-to-end wiring with ngrok (Phase 7), hardening (Phase 8), deployment (Phase 9).
