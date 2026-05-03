# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a QR-based Smart Bin "Find My Things" mobile app (Expo) and a shared API server (Express + PostgreSQL).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## Artifacts

### Smart Bin – Find My Things (`artifacts/smart-bin`)
Mobile app (Expo) for tracking physical items in bins and locations.

**Auth:** Replit OIDC PKCE (mandatory login). Token stored in `expo-secure-store`.
- `lib/auth.tsx` — AuthProvider + useAuth hook
- `app/login.tsx` — login/onboarding screen with gradient

**Subscriptions:** RevenueCat (Lite $1.49/mo · Pro $2.99/mo).
- `lib/revenuecat.tsx` — SubscriptionProvider + useSubscription hook
- `app/paywall.tsx` — plan selection + promo code modal
- RevenueCat integration requires env vars: `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- Seed script: `pnpm --filter @workspace/scripts run seed:revenuecat` (requires RevenueCat integration authorized)

**Data:** Cloud-backed via API (all users must log in).
- `context/AppContext.tsx` — cloud-synced CRUD with optimistic updates. Uses `lib/apiClient.ts` for all API calls.
- `lib/apiClient.ts` — fetch wrapper with Bearer token auth
- Client generates UUIDs (passed to server as optional `id`) for instant optimistic UI

**Features:**
- Search-first item finding
- Location hierarchy: Room → Storage → Sub-storage
- Bins mapped to locations
- Items linked to bins (with optional photos)
- QR code scanning for bins, locations (expo-camera)
- Multi-group support (Family / Business)
- 4 tabs: Search, Locations, Scan, Settings

**Key screens:**
- `app/(tabs)/index.tsx` — Search screen
- `app/(tabs)/locations.tsx` — Location tree
- `app/(tabs)/scan.tsx` — QR scanner
- `app/(tabs)/settings.tsx` — Account, subscription plan, groups
- `app/location/[id].tsx` — Location detail
- `app/bin/[id].tsx` — Bin detail
- `app/item/[id].tsx` — Item detail (shows WHERE the item is)
- `app/add-location.tsx`, `app/add-bin.tsx`, `app/add-item.tsx` — Add modals

**Colors:** Teal primary (`#0D9488`), light background (`#F8FAFC`)
**Env vars needed:** `EXPO_PUBLIC_DOMAIN` (= `$REPLIT_DEV_DOMAIN`), `EXPO_PUBLIC_REPL_ID` (= `$REPL_ID`)

### API Server (`artifacts/api-server`)
Express 5 server at `/api` (port 8080).

**Auth:**
- `src/lib/auth.ts` — OIDC config, session CRUD, Bearer token reading (getSessionId)
- `src/middlewares/authMiddleware.ts` — sets req.user from session
- `src/routes/auth.ts` — GET /auth/user, POST /mobile-auth/token-exchange, POST /mobile-auth/logout

**CRUD routes** (`src/routes/groups.ts`):
- GET/POST `/api/groups`
- GET/PUT/DELETE `/api/groups/:groupId`
- GET/POST `/api/groups/:groupId/locations`
- PUT/DELETE `/api/groups/:groupId/locations/:locationId`
- GET/POST `/api/groups/:groupId/bins`
- PUT/DELETE `/api/groups/:groupId/bins/:binId`
- GET/POST `/api/groups/:groupId/items`
- PUT/DELETE `/api/groups/:groupId/items/:itemId`
- GET `/api/qr/:qrCode`

All POST endpoints accept an optional `id` field for client-side UUID optimistic updates.

## Database (`lib/db`)

Tables: `users`, `sessions`, `groups`, `group_members`, `locations`, `bins`, `items`, `coupons`, `coupon_redemptions`

Schema: `lib/db/src/schema/auth.ts` + `lib/db/src/schema/app.ts`
Push: `pnpm --filter @workspace/db run push`

## Key Commands

- `pnpm run typecheck` — full typecheck (✅ both API server and mobile app pass)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Orval Config Notes (IMPORTANT)

- Do NOT add `workspace` or `schemas` keys to the zod orval output config — they cause orval to regenerate `lib/api-zod/src/index.ts` and create conflicting barrel exports
- Zod output: `target: path.resolve(apiZodSrc, "generated/api.ts")`, `mode: "single"`, `clean: false`
- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types`)

## RevenueCat Notes

- Integration set up WITHOUT Replit connector (user provided secret key directly)
- Secret key stored as `REVENUECAT_SECRET_KEY` (env secret)
- Project: `proj782c830b` (SmartBins)
- Seed script: `pnpm --filter @workspace/scripts run seed:revenuecat` — idempotent, safe to re-run
- RevenueCat init wrapped in try/catch in `_layout.tsx` — app works without keys set
- In Expo Go / web: runs in "Preview API mode" (no real purchases). Use a dev build for real purchases.
- `scripts/src/revenueCatClient.ts` uses `createClient`/`createConfig` from `@replit/revenuecat-sdk/client`
- Do NOT use `getUncachableRevenueCatClient` — that export does not exist in this SDK version

## Environment Variables Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection (already set) |
| `SESSION_SECRET` | Express session signing (already set) |
| `REPL_ID` | OIDC client ID |
| `EXPO_PUBLIC_DOMAIN` | API base URL for mobile (= `$REPLIT_DEV_DOMAIN`) |
| `EXPO_PUBLIC_REPL_ID` | OIDC client ID for mobile |
| `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` | RevenueCat test key |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat iOS production key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat Android production key |
