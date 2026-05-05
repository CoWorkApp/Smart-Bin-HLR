# Project Context

## 1. Project Overview

**Smart Bin – Find My Things**: A QR-based physical item tracker. Users log in, create locations and bins, assign items to bins, and find items by search or QR scan. Photos can be attached to items.

Monorepo (pnpm workspaces, TypeScript 5.9, Node 24). Three runnable artifacts: mobile app, API server, mockup sandbox (canvas only).

---

## 2. Workspace / Repo Layout

```
/
├── artifacts/
│   ├── smart-bin/          # Expo mobile app (SDK 54)
│   │   ├── app/            # Expo Router screens
│   │   │   ├── (tabs)/     # index, locations, scan, settings
│   │   │   ├── item/[id].tsx, bin/[id].tsx, location/[id].tsx
│   │   │   ├── add-item.tsx, add-bin.tsx, add-location.tsx
│   │   │   ├── edit-item.tsx, edit-bin.tsx, edit-location.tsx
│   │   │   ├── login.tsx, paywall.tsx, scan-result.tsx
│   │   ├── components/     # ItemCard, BinCard, LocationCard, PhotoSourceSheet, QRScanModal, EmptyState, ErrorBoundary
│   │   ├── context/        # AppContext.tsx — cloud-synced CRUD, optimistic updates
│   │   ├── lib/
│   │   │   ├── auth.tsx        # AuthProvider, useAuth, isReady guard
│   │   │   ├── apiClient.ts    # fetch wrapper with Bearer token
│   │   │   ├── photoUpload.ts  # uploadPhoto, resolvePhotoUri, compression
│   │   │   └── revenuecat.tsx  # SubscriptionProvider, useSubscription
│   │   └── hooks/          # useColors (theme tokens)
│   ├── api-server/         # Express 5, port 8080
│   │   └── src/
│   │       ├── routes/     # auth.ts, groups.ts, photos.ts, index.ts
│   │       ├── lib/auth.ts # OIDC config, session CRUD, Bearer token
│   │       └── middlewares/authMiddleware.ts
│   └── mockup-sandbox/     # Vite component preview (canvas only)
├── lib/
│   ├── db/                 # Drizzle ORM schema + client
│   │   └── src/schema/
│   │       ├── auth.ts     # users, sessions
│   │       └── app.ts      # groups, group_members, locations, bins, items, photos, coupons, coupon_redemptions
│   ├── api-client-react/   # Orval-generated hooks
│   └── api-zod/            # Orval-generated Zod schemas (single-file output)
└── scripts/                # Seed scripts (RevenueCat)
```

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces |
| Language | TypeScript 5.9 / Node 24 |
| Mobile | Expo SDK 54, Expo Router v6, React Native |
| API | Express 5 |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (`zod/v4`) |
| API codegen | Orval (OpenAPI → hooks + Zod) |
| Build (API) | esbuild (ESM bundle via `build.mjs`) |
| Auth | Replit OIDC PKCE (native: `expo-auth-session`; web: manual PKCE) |
| Subscriptions | RevenueCat (Lite $1.49/mo, Pro $2.99/mo) |
| Photo compression | `expo-image-manipulator` (native), Canvas API (web) |
| Token storage | `expo-secure-store` (key: `auth_session_token`) |

---

## 4. Architecture & Data Flow

```
Mobile App (Expo)
  └─ lib/auth.tsx          → OIDC login → Bearer token → SecureStore
  └─ lib/apiClient.ts      → all API calls with Authorization header
  └─ context/AppContext.tsx → optimistic CRUD (client UUID → server)
  └─ lib/photoUpload.ts    → compress → base64 → POST /api/photos → returns full URL

API Server (Express, :8080)
  └─ authMiddleware        → reads Bearer token → req.user
  └─ routes/auth.ts        → /auth/user, /mobile-auth/token-exchange, /mobile-auth/logout
  └─ routes/groups.ts      → all CRUD (auth required)
  └─ routes/photos.ts      → POST (auth), GET (public), DELETE (auth)

Database (PostgreSQL)
  └─ Drizzle ORM (lib/db)
  └─ Photos stored as base64 text in `photos` table (not object storage)
```

**Photo URL format stored in `items.photo`:** `https://<domain>/api/photos/<uuid>`

`resolvePhotoUri()` handles both full URLs and legacy relative paths. `ItemCard` and all screens call it before rendering `<Image>`.

**`GET /api/photos/:id` is intentionally public** (no auth required). Photo IDs are UUIDs — security by obscurity is acceptable for this use case.

---

## 5. Domain Model

```
users           (id, replitId, name, email, avatarUrl)
sessions        (id, userId, expiresAt)
groups          (id, name, ownerId)
group_members   (groupId, userId, role)
locations       (id, groupId, parentId?, name, qrCode?)   ← hierarchical
bins            (id, groupId, locationId?, name, qrCode?)
items           (id, groupId, binId?, name, photo?, qrCode?, updatedAt)
photos          (id, data TEXT base64, mimeType, sizeBytes, createdAt)
coupons         (id, code, planId, durationDays, maxRedemptions)
coupon_redemptions (userId, couponId, redeemedAt)
```

**Client generates UUIDs** and passes them as optional `id` to POST endpoints for instant optimistic UI.

---

## 6. Runtime Assumptions & Dependencies

**Environment variables (all must be set):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection |
| `SESSION_SECRET` | Express session signing |
| `REPL_ID` | OIDC client ID (also `EXPO_PUBLIC_REPL_ID`) |
| `EXPO_PUBLIC_DOMAIN` | API base URL for mobile (= `$REPLIT_DEV_DOMAIN`) |
| `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` | RevenueCat test |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat iOS prod |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat Android prod |
| `REVENUECAT_SECRET_KEY` | RevenueCat server-side secret (seed scripts) |

**Photo upload limits:**
- Client rejects if compressed size > 1.5 MB
- Server rejects (`413`) if decoded size > 2 MB
- `express.json({ limit: "10mb" })` in `app.ts` (headroom for base64 overhead)

**Compression pipeline (before upload):**
- Native: `expo-image-manipulator@~13.0.6` → resize max 1024×1024 → JPEG 0.75
- Web: Canvas `drawImage` → `toDataURL("image/jpeg", 0.75)` → max 1024×1024

**RevenueCat:**
- In Expo Go / web: runs in "Preview API mode" — no real purchases
- Init wrapped in try/catch; app works without keys set
- Project ID: `proj782c830b` (SmartBins)
- Do NOT use `getUncachableRevenueCatClient` — that export does not exist in this SDK version
- Use `createClient`/`createConfig` from `@replit/revenuecat-sdk/client`

---

## 7. Operational Commands

```bash
# Push DB schema to dev database
pnpm --filter @workspace/db run push

# Full TypeScript typecheck (API server + mobile app)
pnpm run typecheck

# Regenerate API hooks + Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Build API server
pnpm --filter @workspace/api-server run build

# Seed RevenueCat products (idempotent)
pnpm --filter @workspace/scripts run seed:revenuecat
```

**Workflows (must be running for the app to work):**
- `artifacts/api-server: API Server` — `pnpm --filter @workspace/api-server run dev`
- `artifacts/smart-bin: expo` — `pnpm --filter @workspace/smart-bin run dev`

---

## 8. Constraints & Non-Goals

- Photos stored in PostgreSQL as base64 text (no object storage / GCS). Intentional.
- No local/offline mode — all data is cloud-backed; auth is mandatory.
- No server-side rendering. Mobile-only front end.
- Orval codegen: do NOT add `workspace` or `schemas` keys to the Zod output config — causes conflicting barrel exports.
- `lib/api-zod/src/index.ts` must only export from `./generated/api` (not `./generated/types`).
- Zod orval config: `mode: "single"`, `clean: false`, target = `lib/api-zod/src/generated/api.ts`.

---

## 9. Agent Operating Instructions

1. **Before any DB schema change:** edit `lib/db/src/schema/app.ts` or `auth.ts`, then run `pnpm --filter @workspace/db run push`.
2. **After any API server change:** run `pnpm --filter @workspace/api-server run build`, then restart the `artifacts/api-server: API Server` workflow.
3. **Photo display:** always call `resolvePhotoUri(item.photo)` before passing to `<Image uri>`. Never use `item.photo` raw in an Image component.
4. **Photo source picker:** use `<PhotoSourceSheet>` (camera + gallery) — do not call `ImagePicker` directly in screens.
5. **New API routes:** register in `artifacts/api-server/src/routes/index.ts`. Use `requireAuth` middleware for write operations. GET `/api/photos/:id` is the only intentionally public route.
6. **Client API calls:** go through `lib/apiClient.ts` (auto-attaches Bearer token). Never call `fetch` directly for API requests in the mobile app.
7. **Auth guard:** `lib/auth.tsx` has an `isReady` flag — do not render auth-dependent UI or redirect until `isReady === true`.
8. **Subscriptions:** item/bin limits come from `useSubscription()`. Always check `atLimit` before allowing create operations.
9. **Typecheck before committing:** `pnpm run typecheck` must pass with no errors.
10. **Do not use `expo-file-system` on web** — the photo upload pipeline already branches on `Platform.OS`.
