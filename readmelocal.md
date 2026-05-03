# Smart Bin – Find My Things
## Local Development Setup Guide

This guide walks you through running the full project on your own machine from scratch.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Prerequisites](#2-prerequisites)
3. [Get the Source Code](#3-get-the-source-code)
4. [Install Dependencies](#4-install-dependencies)
5. [Set Up PostgreSQL Database](#5-set-up-postgresql-database)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Push the Database Schema](#7-push-the-database-schema)
8. [Run the API Server](#8-run-the-api-server)
9. [Run the Mobile App](#9-run-the-mobile-app)
10. [Optional – Google OAuth Login](#10-optional--google-oauth-login)
11. [Optional – RevenueCat Subscriptions](#11-optional--revenuecat-subscriptions)
12. [Project Structure](#12-project-structure)
13. [Useful Commands](#13-useful-commands)
14. [Troubleshooting](#14-troubleshooting)
15. [Run Natively Without Expo Go](#15-run-natively-without-expo-go)
16. [Build for Production – Android (Google Play)](#16-build-for-production--android-google-play)
17. [Build for Production – iOS (App Store)](#17-build-for-production--ios-app-store)
18. [Deploy the API Server to Production](#18-deploy-the-api-server-to-production)

---

## 1. Project Overview

Smart Bin is a **QR-based household organiser** mobile app. You stick QR labels on bins, scan them, and instantly see what's inside and where it lives.

The project has two runnable services:

| Service | Folder | What it does |
|---|---|---|
| **API Server** | `artifacts/api-server/` | Express + PostgreSQL backend. Handles auth, groups, locations, bins, items |
| **Mobile App** | `artifacts/smart-bin/` | Expo (React Native) app that runs on iOS, Android, and web browser |

They share libraries in `lib/` — a database schema (`lib/db`), OpenAPI spec (`lib/api-spec`), generated Zod schemas (`lib/api-zod`), and generated React Query hooks (`lib/api-client-react`).

---

## 2. Prerequisites

Install the following tools before starting.

### 2.1 Node.js (v20 or later recommended)

Download from [https://nodejs.org](https://nodejs.org) — choose the **LTS** version.

Verify:
```bash
node --version   # should print v20.x.x or higher
```

### 2.2 pnpm (v9 or later)

This project uses **pnpm** as its package manager. Do **not** use npm or yarn — they will not work with the workspace setup.

```bash
npm install -g pnpm
```

Verify:
```bash
pnpm --version   # should print 9.x.x or higher
```

### 2.3 PostgreSQL (v14 or later)

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Windows
Download the installer from [https://www.postgresql.org/download/windows](https://www.postgresql.org/download/windows)

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

Verify PostgreSQL is running:
```bash
psql --version
```

### 2.4 Expo CLI (for mobile development)

```bash
npm install -g @expo/cli
```

### 2.5 Expo Go app (for testing on a real phone — optional)

Install **Expo Go** on your iPhone or Android from the App Store / Google Play.

---

## 3. Get the Source Code

### Option A — Download ZIP from Replit

1. In your Replit project, click the three-dot **⋮** menu in the file tree
2. Select **Download as zip**
3. Unzip it to a folder, e.g. `~/projects/smart-bin`

### Option B — Git (if you pushed to GitHub)

```bash
git clone https://github.com/YOUR_USERNAME/smart-bin.git
cd smart-bin
```

---

## 4. Install Dependencies

From the **root folder** of the project (the folder containing `package.json` and `pnpm-workspace.yaml`):

```bash
pnpm install
```

This installs packages for all workspace packages at once — the API server, mobile app, and all shared libraries. It may take 2–3 minutes the first time.

---

## 5. Set Up PostgreSQL Database

### 5.1 Create a database and user

Open a PostgreSQL prompt:

```bash
# macOS / Linux
psql -U postgres

# Windows (run in Command Prompt as Administrator)
psql -U postgres
```

Then run these SQL commands:

```sql
-- Create a dedicated user
CREATE USER smartbin_user WITH PASSWORD 'choose_a_strong_password';

-- Create the database
CREATE DATABASE smartbin_db OWNER smartbin_user;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE smartbin_db TO smartbin_user;

-- Exit
\q
```

### 5.2 Note your connection string

Your `DATABASE_URL` will look like this:

```
postgresql://smartbin_user:choose_a_strong_password@localhost:5432/smartbin_db
```

Replace `choose_a_strong_password` with whatever you set above.

---

## 6. Configure Environment Variables

You need two `.env` files — one for the API server and one for the mobile app.

### 6.1 API Server environment file

Create a new file at `artifacts/api-server/.env`:

```bash
# In the project root:
touch artifacts/api-server/.env
```

Add these contents:

```env
# PostgreSQL connection string (from Step 5)
DATABASE_URL=postgresql://smartbin_user:choose_a_strong_password@localhost:5432/smartbin_db

# Secret used to sign session cookies — make this long and random
# You can generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=paste_your_random_secret_here

# Port for the API server
PORT=8080
```

**Generate a random SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste it as the value of `SESSION_SECRET`.

### 6.2 Mobile App environment file

The file already exists at `artifacts/smart-bin/.env`. Open it and you will see:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
```

For now you can leave this as-is — Google login will simply not work until you add a real client ID (see [Step 10](#10-optional--google-oauth-login)). The app will still run fine with Replit Auth.

Add one more line to tell the app where your local API server is:

```env
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

> **Note:** On a real device (not simulator), replace `localhost` with your machine's local IP address, e.g. `http://192.168.1.42:8080`. Find your IP with `ipconfig` (Windows) or `ifconfig` / `ip addr` (Mac/Linux).

---

## 7. Push the Database Schema

This creates all the tables in your PostgreSQL database using Drizzle ORM.

```bash
DATABASE_URL=postgresql://smartbin_user:choose_a_strong_password@localhost:5432/smartbin_db \
  pnpm --filter @workspace/db run push
```

You should see output like:

```
[✓] Changes applied
```

> **Tip:** On Windows PowerShell, set the variable first:
> ```powershell
> $env:DATABASE_URL="postgresql://smartbin_user:choose_a_strong_password@localhost:5432/smartbin_db"
> pnpm --filter @workspace/db run push
> ```

---

## 8. Run the API Server

Open a **new terminal window** and run:

```bash
pnpm --filter @workspace/api-server run dev
```

You should see:

```
{"level":"info","port":8080,"msg":"Server listening"}
```

**Test it is working:**
```bash
curl http://localhost:8080/api/healthz
```

Expected response: `{"status":"ok"}`

Keep this terminal running — the API server must be running for the mobile app to work.

---

## 9. Run the Mobile App

Open a **second terminal window** and run:

```bash
pnpm --filter @workspace/smart-bin run dev
```

This starts the Expo development server. After a few seconds you will see a **QR code** printed in the terminal.

### Option A — Run in a web browser (easiest)

Press **`w`** in the terminal. The app will open at `http://localhost:8081` in your browser.

### Option B — Run on your phone with Expo Go

1. Make sure your phone is on the **same Wi-Fi network** as your computer
2. Open the **Expo Go** app on your phone
3. Scan the QR code shown in the terminal
4. The app will load on your device

### Option C — Run in an iOS Simulator (macOS only)

1. Install Xcode from the App Store
2. Press **`i`** in the Expo terminal

### Option D — Run in an Android Emulator

1. Install Android Studio and set up an emulator
2. Press **`a`** in the Expo terminal

---

## 10. Optional – Google OAuth Login

By default, the app uses Replit Auth (OIDC). To also enable "Continue with Google":

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Choose application type: **Desktop app** (important — this enables PKCE with no secret needed)
6. Click **Create** and copy the **Client ID**
7. Open `artifacts/smart-bin/.env` and replace the placeholder:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_actual_client_id_here.apps.googleusercontent.com
   ```
8. Restart the Expo dev server (Ctrl+C then re-run the dev command)

> **Note:** No Google Client Secret is needed because the app uses PKCE (Proof Key for Code Exchange), which is designed for mobile/desktop apps where a secret cannot be stored safely.

---

## 11. Optional – RevenueCat Subscriptions

RevenueCat handles the Free / Lite / Pro subscription tiers.

1. Create an account at [https://app.revenuecat.com](https://app.revenuecat.com)
2. Create a new project and app
3. Copy your **Public SDK Key** (starts with `appl_` for iOS or `goog_` for Android)
4. Copy your **Secret Key** from Project Settings
5. Add to `artifacts/api-server/.env`:
   ```env
   REVENUECAT_SECRET_KEY=your_secret_key_here
   ```
6. In the mobile app, update the SDK key in `artifacts/smart-bin/lib/revenuecat.tsx`

> In development, RevenueCat runs in **Preview API Mode** — subscriptions are simulated and no real charges occur.

---

## 12. Project Structure

```
smart-bin/                          ← project root
│
├── artifacts/
│   ├── api-server/                 ← Express backend
│   │   ├── src/
│   │   │   ├── app.ts              ← Express app setup, CORS, middleware
│   │   │   ├── index.ts            ← Server entry point (reads PORT)
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         ← Replit OIDC + Google OAuth endpoints
│   │   │   │   ├── groups.ts       ← Groups, locations, bins, items CRUD
│   │   │   │   ├── health.ts       ← GET /api/healthz
│   │   │   │   └── index.ts        ← Route registration
│   │   │   ├── middlewares/        ← Auth guard, session middleware
│   │   │   └── lib/                ← Logger, helpers
│   │   └── .env                    ← ← YOU CREATE THIS (Step 6.1)
│   │
│   └── smart-bin/                  ← Expo React Native mobile app
│       ├── app/                    ← Expo Router screens (file-based routing)
│       │   ├── (tabs)/             ← Bottom tab screens
│       │   │   ├── index.tsx       ← Search tab
│       │   │   ├── locations.tsx   ← Locations tab (unmapped bins/items here)
│       │   │   └── scan.tsx        ← QR scanner tab
│       │   ├── add-bin.tsx         ← Add bin screen
│       │   ├── add-item.tsx        ← Add item screen
│       │   ├── add-location.tsx    ← Add location screen
│       │   ├── edit-bin.tsx        ← Edit bin screen
│       │   ├── edit-item.tsx       ← Edit item screen
│       │   ├── edit-location.tsx   ← Edit location screen
│       │   ├── bin/[id].tsx        ← Bin detail screen
│       │   ├── item/[id].tsx       ← Item detail screen
│       │   ├── location/[id].tsx   ← Location detail screen
│       │   ├── login.tsx           ← Login screen (Replit Auth + Google)
│       │   └── paywall.tsx         ← Subscription paywall
│       ├── components/             ← Reusable UI components
│       │   ├── BinCard.tsx
│       │   ├── ItemCard.tsx
│       │   ├── LocationCard.tsx
│       │   └── QRScanModal.tsx     ← Camera QR scanner (with web fallback)
│       ├── context/
│       │   └── AppContext.tsx      ← Global state — groups, bins, items, locations
│       ├── lib/
│       │   ├── auth.tsx            ← Replit OIDC + Google PKCE auth logic
│       │   ├── apiClient.ts        ← Fetch wrapper for API calls
│       │   └── revenuecat.tsx      ← RevenueCat subscription logic
│       └── .env                    ← Google Client ID (already exists)
│
├── lib/
│   ├── db/                         ← Drizzle ORM schema + DB connection
│   │   ├── src/schema/
│   │   │   ├── auth.ts             ← users, sessions tables
│   │   │   └── app.ts              ← groups, locations, bins, items tables
│   │   └── drizzle.config.ts       ← Points to DATABASE_URL
│   ├── api-spec/                   ← OpenAPI 3.0 spec (source of truth)
│   ├── api-zod/                    ← Auto-generated Zod validation schemas
│   └── api-client-react/           ← Auto-generated React Query hooks
│
├── package.json                    ← Root — dev tooling only
└── pnpm-workspace.yaml             ← Workspace package list
```

---

## 13. Useful Commands

Run all commands from the **project root** unless stated otherwise.

| Task | Command |
|---|---|
| Install all packages | `pnpm install` |
| Start API server | `pnpm --filter @workspace/api-server run dev` |
| Start mobile app | `pnpm --filter @workspace/smart-bin run dev` |
| Push DB schema | `DATABASE_URL=<url> pnpm --filter @workspace/db run push` |
| TypeScript check (all) | `pnpm run typecheck` |
| TypeScript check (mobile only) | `pnpm --filter @workspace/smart-bin run typecheck` |
| TypeScript check (API only) | `pnpm --filter @workspace/api-server run typecheck` |

---

## 14. Troubleshooting

### "Cannot find module" or missing packages
```bash
pnpm install
```
Re-run install from the root. This resolves workspace cross-references.

### API server crashes immediately
- Check that `artifacts/api-server/.env` exists and has `DATABASE_URL`, `SESSION_SECRET`, and `PORT`
- Check PostgreSQL is running: `pg_isready -h localhost`

### Database push fails with "connection refused"
PostgreSQL is not running. Start it:
- **macOS:** `brew services start postgresql@16`
- **Linux:** `sudo systemctl start postgresql`
- **Windows:** Open Services and start "PostgreSQL"

### Mobile app cannot reach the API ("Network request failed")
- Make sure the API server is running (`curl http://localhost:8080/api/healthz` should return `{"status":"ok"}`)
- If testing on a real device: change `localhost` to your computer's local IP in `artifacts/smart-bin/.env`
- If testing in browser: both services must be on the same machine — `localhost` works fine

### QR scanner shows blank / no camera
- Camera requires a native build or physical device — it does not work in a desktop browser
- Use the **text input fallback** that appears automatically on web

### "pnpm: command not found"
```bash
npm install -g pnpm
```

### Port already in use (EADDRINUSE)
Find and kill the process using that port:
```bash
# macOS / Linux
lsof -i :8080
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Expo QR code doesn't scan on phone
- Confirm your phone and computer are on the **same Wi-Fi network**
- Try pressing `e` in the Expo terminal to send a link by email instead
- Try running `pnpm --filter @workspace/smart-bin exec expo start --tunnel` for a public tunnel URL

---

## Two-Terminal Quick-Start Summary

Once you have completed the one-time setup (Steps 1–7), starting the project each day is just:

**Terminal 1 — API Server:**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Mobile App:**
```bash
pnpm --filter @workspace/smart-bin run dev
```

Then press **`w`** in Terminal 2 to open the app in your browser, or scan the QR code with Expo Go on your phone.

---

## 15. Run Natively Without Expo Go

Expo Go is a sandbox app — it cannot run native modules installed via custom packages (like the full camera, secure storage, or in-app purchases). To get the full experience you need a **Development Build**: your own compiled version of the app installed directly on your device, without needing Expo Go.

There are two ways to do this: **using EAS Build** (cloud, recommended) or **building locally** on your machine.

---

### Method A — EAS Build (cloud, easiest)

EAS (Expo Application Services) compiles the native app in Expo's cloud. You do not need Xcode or Android Studio installed.

#### Step 1 — Install EAS CLI

```bash
npm install -g eas-cli
```

#### Step 2 — Log in to your Expo account

Create a free account at [https://expo.dev](https://expo.dev) if you don't have one.

```bash
eas login
```

#### Step 3 — Initialise EAS in the project

Run this from inside the mobile app folder:

```bash
cd artifacts/smart-bin
eas init
```

This creates an `eas.json` file. Accept the defaults.

#### Step 4 — Build a development client for Android

```bash
eas build --profile development --platform android
```

EAS will compile the app in the cloud (takes 5–15 minutes). When it finishes, you get a download link for an `.apk` file.

- Transfer the `.apk` to your Android phone
- Enable **Install from unknown sources** in your phone's settings
- Install the `.apk`

#### Step 5 — Build a development client for iOS

```bash
eas build --profile development --platform ios
```

> **Note:** iOS requires an Apple Developer account ($99/year). EAS will ask you to log in to your Apple account and will manage provisioning profiles automatically.

When the build finishes, scan the QR code on the EAS dashboard to install directly on your device via OTA.

#### Step 6 — Start the dev server and open your app

```bash
pnpm --filter @workspace/smart-bin run dev
```

Open your installed development build app on your phone and scan the QR code — it connects to your local dev server just like Expo Go did, but now runs as a fully native app.

---

### Method B — Local Native Build (no cloud, requires Xcode / Android Studio)

This compiles the app entirely on your own machine.

#### Android (requires Android Studio)

1. **Install Android Studio** from [https://developer.android.com/studio](https://developer.android.com/studio)
2. During setup, install the **Android SDK**, **Android SDK Platform**, and an **Android Virtual Device (AVD)**
3. Add the Android SDK to your PATH:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export ANDROID_HOME=$HOME/Library/Android/sdk        # macOS
   export ANDROID_HOME=$HOME/Android/Sdk                # Linux
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Generate the native Android project:
   ```bash
   cd artifacts/smart-bin
   pnpm exec expo prebuild --platform android
   ```
   This creates an `android/` folder.
5. Run on a connected phone or emulator:
   ```bash
   pnpm exec expo run:android
   ```

#### iOS (macOS only, requires Xcode)

1. **Install Xcode** from the Mac App Store (it's free, ~15 GB)
2. Install the Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Install CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```
4. Generate the native iOS project:
   ```bash
   cd artifacts/smart-bin
   pnpm exec expo prebuild --platform ios
   ```
   This creates an `ios/` folder.
5. Install iOS dependencies:
   ```bash
   cd ios && pod install && cd ..
   ```
6. Run on a connected iPhone or simulator:
   ```bash
   pnpm exec expo run:ios
   ```

> **Note:** Running on a real iPhone requires a free or paid Apple Developer account. Xcode will guide you through signing when you first connect your device.

---

## 16. Build for Production – Android (Google Play)

This produces a signed `.aab` (Android App Bundle) file ready for upload to the Google Play Console.

### Prerequisites
- A **Google Play Developer account** ($25 one-time fee) at [https://play.google.com/console](https://play.google.com/console)
- EAS CLI installed (`npm install -g eas-cli`) and logged in (`eas login`)

### Step 1 — Update app.json with your package name

Open `artifacts/smart-bin/app.json` and add your Android package name (must be unique globally, e.g. `com.yourname.smartbin`):

```json
{
  "expo": {
    "android": {
      "package": "com.yourname.smartbin",
      "versionCode": 1
    }
  }
}
```

### Step 2 — Set production API URL

In `artifacts/smart-bin/.env`, set your deployed API server URL (see [Step 18](#18-deploy-the-api-server-to-production)):

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-server.com
```

### Step 3 — Build the production AAB

```bash
cd artifacts/smart-bin
eas build --profile production --platform android
```

EAS will:
- Ask if you want to create a new keystore (say **yes** the first time — EAS stores it securely)
- Compile the app in the cloud (~10–20 minutes)
- Produce a signed `.aab` file

### Step 4 — Download and upload to Google Play

1. Download the `.aab` from the EAS dashboard link
2. Go to [Google Play Console](https://play.google.com/console)
3. Create a new app → fill in the store listing
4. Go to **Production → Create new release**
5. Upload the `.aab` file
6. Complete the content rating questionnaire and pricing
7. Submit for review (usually takes a few hours to a few days)

### Subsequent releases

Increment `versionCode` in `app.json` each time you release an update, then run `eas build` again.

---

## 17. Build for Production – iOS (App Store)

This produces a signed `.ipa` file ready for upload to App Store Connect.

### Prerequisites
- An **Apple Developer account** ($99/year) at [https://developer.apple.com](https://developer.apple.com)
- EAS CLI installed and logged in

### Step 1 — Update app.json with your Bundle ID

Open `artifacts/smart-bin/app.json` and add your iOS bundle identifier (must be unique, registered in your Apple Developer account):

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourname.smartbin",
      "buildNumber": "1",
      "supportsTablet": false
    }
  }
}
```

### Step 2 — Register your Bundle ID in Apple Developer Portal

1. Go to [https://developer.apple.com/account](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles → Identifiers**
3. Click **+** and register your Bundle ID (e.g. `com.yourname.smartbin`)

### Step 3 — Set production API URL

Same as Android — update `EXPO_PUBLIC_API_BASE_URL` in `.env`.

### Step 4 — Build the production IPA

```bash
cd artifacts/smart-bin
eas build --profile production --platform ios
```

EAS will:
- Ask you to log in to your Apple Developer account
- Automatically create provisioning profiles and distribution certificates
- Compile the app in the cloud (~15–30 minutes)
- Produce a signed `.ipa` file

### Step 5 — Submit to the App Store

**Option A — Submit directly via EAS (easiest):**
```bash
eas submit --platform ios
```
EAS will upload the `.ipa` directly to App Store Connect.

**Option B — Manual upload:**
1. Download the `.ipa` from the EAS dashboard
2. Open **Transporter** app on macOS (free from Mac App Store)
3. Drag the `.ipa` into Transporter and click **Deliver**

### Step 6 — Complete App Store Connect listing

1. Go to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app → **TestFlight** to test internally first
3. Once satisfied, go to the **App Store** tab and fill in:
   - App description, keywords, screenshots (required: 6.5" and 5.5" iPhone sizes)
   - Privacy policy URL (required)
   - Age rating
4. Submit for Apple review (usually 1–3 days)

### Over-the-Air (OTA) updates — skip the review for JS-only changes

If you only change JavaScript (no native code changes), you can push updates directly to users without a new App Store review:

```bash
eas update --branch production --message "Fix bug in locations screen"
```

Users get the update automatically the next time they open the app.

---

## 18. Deploy the API Server to Production

The mobile app needs a publicly accessible API server. Here are the most common options.

### Option A — Railway (recommended, easiest)

1. Go to [https://railway.app](https://railway.app) and sign up
2. Click **New Project → Deploy from GitHub repo**
3. Connect your GitHub repository
4. Add a **PostgreSQL** plugin inside the project
5. Set these environment variables in Railway's settings:
   ```
   DATABASE_URL     ← Railway provides this automatically from the Postgres plugin
   SESSION_SECRET   ← generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   PORT             ← Railway sets this automatically
   ```
6. Set the **Start command** to:
   ```
   pnpm --filter @workspace/api-server run dev
   ```
7. Deploy — Railway gives you a public URL like `https://smart-bin-api.up.railway.app`

### Option B — Render

1. Go to [https://render.com](https://render.com) and sign up
2. Click **New → Web Service** and connect your repo
3. Set:
   - **Build command:** `pnpm install`
   - **Start command:** `pnpm --filter @workspace/api-server run dev`
4. Add a **PostgreSQL** database from the Render dashboard
5. Copy the database URL into your service's environment variables
6. Add `SESSION_SECRET` as an environment variable

### Option C — VPS (DigitalOcean, Linode, etc.)

If you prefer full control on a virtual private server:

```bash
# On the server
git clone <your-repo>
cd smart-bin
pnpm install

# Create the env file
nano artifacts/api-server/.env
# Add DATABASE_URL, SESSION_SECRET, PORT=8080

# Push the DB schema
DATABASE_URL=<your-url> pnpm --filter @workspace/db run push

# Install PM2 to keep the server running
npm install -g pm2
pm2 start "pnpm --filter @workspace/api-server run dev" --name smartbin-api
pm2 save
pm2 startup
```

Then set up **Nginx** as a reverse proxy on port 80/443 pointing to port 8080, and use **Certbot** for a free HTTPS certificate.

### After deploying the API

Update your mobile app's env file to point to the production API:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-api.com
```

Then rebuild the mobile app with `eas build --profile production`.

---

## Summary — Development vs Production

| | Development | Production |
|---|---|---|
| **Run mobile app** | `expo start` + Expo Go or dev build | EAS Build → App Store / Play Store |
| **API server** | `localhost:8080` | Railway / Render / VPS |
| **Database** | Local PostgreSQL | Managed PostgreSQL (Railway / Render / Supabase / Neon) |
| **OTA updates** | Instant on save | `eas update` (JS changes only) |
| **Native rebuild needed** | Never in dev | When native dependencies change |
