# Smart Bin – Find My Things: Setup Guide

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/) v9+
- A PostgreSQL database (Replit's built-in database is already configured)
- A Replit account (used for authentication via OIDC)

---

## Steps to Run the App

### 1. Install dependencies

From the project root, install all workspace packages:

```bash
pnpm install
```

### 2. Push the database schema

Create the required database tables (`users` and `sessions`):

```bash
pnpm --filter @workspace/db run push
```

You should see:
```
[✓] Pulling schema from database...
[✓] Changes applied
```

> If you see "No changes detected", the tables already exist — this is fine.

### 3. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The server will build and start on port 8080. You should see:
```
Server listening  port: 8080
```

### 4. Start the mobile app (Expo)

In a separate terminal:

```bash
pnpm --filter @workspace/smart-bin run dev
```

Metro Bundler will start. You can then:
- **Web**: Open the URL shown (e.g. `http://localhost:<PORT>`) in your browser
- **Mobile**: Scan the QR code with the Expo Go app on iOS or Android

---

## Authentication Notes

- Login uses Replit's OIDC provider. The `REPL_ID` environment variable must be set (Replit sets this automatically).
- **If viewing via an iframe** (e.g. inside the Replit canvas preview), tap **"Open in Browser to Sign In"** — OAuth redirects cannot complete inside an iframe.
- Open the app URL in a full browser tab to complete sign-in.

---

## Environment Variables

These are set automatically by Replit at runtime:

| Variable | Purpose |
|---|---|
| `REPL_ID` | Used as the OIDC client ID for Replit Auth |
| `REPLIT_DEV_DOMAIN` | The public domain of your Replit project |
| `REPLIT_EXPO_DEV_DOMAIN` | The Expo tunnel domain for mobile QR scanning |
| `DATABASE_URL` | PostgreSQL connection string (set by Replit Database) |
| `PORT` | Port assigned to each service by Replit |

If running outside Replit, you must set these manually in a `.env` file.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find package 'esbuild'` | Run `pnpm install` from the project root |
| `relation "users" does not exist` | Run `pnpm --filter @workspace/db run push` |
| Login button does nothing on mobile | Wait a moment for the OIDC discovery to load, then try again |
| App not visible in preview | Ensure both the API server and Expo workflows are running |
