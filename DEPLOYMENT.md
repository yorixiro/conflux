# Deployment

> 此页保留既有部署技术细节，部分环境变量及脚本名称仍含旧项目命名；命令以实际 `package.json` 与部署环境为准。日常开发流程只见 [AGENTS.md](AGENTS.md)，不额外设测试门槛。

Polaris has separate deployment paths for the source checkout, a web build,
backend API routes, and native wrappers. A working source build is not the same
thing as an Android APK, iOS/TestFlight build, or hosted service release.

## Quick Start

Run the web app locally:

```bash
npm i
npm run dev
```

Build the static frontend:

```bash
npm run build
```

The production frontend is written to `dist/`.

## Requirements

- Node.js 20 or newer
- npm
- Android Studio or Android command line tools for Android builds
- Xcode on macOS for iOS builds
- Wrangler only if deploying `workers/polaris-api/`

## Configuration

Create a local environment file when the frontend needs to talk to a backend on
another origin:

```bash
cp .env.example .env.local
```

Set:

```bash
VITE_POLARIS_API_ORIGIN=https://your-backend.example.com
```

Leave `VITE_POLARIS_API_ORIGIN` empty for same-origin web deployments where the
frontend and `/api` routes are served by the same host.

Provider API keys are server-side secrets. `VITE_` variables are bundled into
browser code, so provider keys fit serverless functions, Workers, native secure
storage, or another deployer-owned backend.

## Local Web Development

```bash
npm i
npm run dev
```

The Vite dev server serves the shared frontend. It does not start backend API
handlers by itself.

If `VITE_POLARIS_API_ORIGIN` is set, Vite proxies `/api` to that origin. If it is
not set, `/api` stays relative to the current origin and will return 404 unless
the current host also serves API routes.

## Static Web Deployment

Build the frontend:

```bash
npm run build
```

Deploy `dist/` to any static host.

For chat routes, provider relay, image generation, embeddings, search,
diagnostics, or built-in model gateways, pair the static frontend with a backend
origin and set `VITE_POLARIS_API_ORIGIN` at build time:

```bash
VITE_POLARIS_API_ORIGIN=https://api.example.com npm run build
```

The static frontend keeps user data in the browser runtime. Deploying a new
frontend build does not automatically migrate a user's existing browser,
Android, or iOS data.

Static hosting by itself does not create accounts, cloud sync, or a central
database. It only serves the app shell. User data remains in the user's current
browser or native app storage unless the user explicitly exports, imports, or
connects a separate backend feature.

## Same-Origin API Deployment

The `api/` directory contains Vercel-style serverless handlers. A same-origin
deployment serves both:

- `dist/` for the frontend
- `/api/...` for serverless routes

Typical settings:

```text
Install command: npm ci
Build command: npm run build
Output directory: dist
```

Add server-side environment variables for the routes you enable. Common keys are
listed in [docs/connect-your-own-backend.md](docs/connect-your-own-backend.md).

Some frontend paths refer to API capabilities that need additional handler work
before they are complete in a managed public service. The route table in
[docs/connect-your-own-backend.md](docs/connect-your-own-backend.md) marks those
surfaces.

## Split Frontend And Backend

Use a split deployment when the frontend is on one origin and the API is on
another:

```bash
VITE_POLARIS_API_ORIGIN=https://api.example.com npm run build
```

The backend needs to allow the deployed frontend origin in CORS. For routes that
forward provider credentials, receive diagnostics, or handle user content, keep
CORS scoped to known frontend origins rather than wildcard origins.

Backend origin and relay rules are documented in
[docs/connect-your-own-backend.md](docs/connect-your-own-backend.md).

## Backend Visibility

A backend can see the traffic it handles. If it forwards provider requests,
search requests, diagnostics, image generation, embeddings, or other model
inputs, the backend operator may be able to inspect that content.

A private Polaris install is safest with a backend the deployer operates or
already trusts. A reachable public backend is still a backend operated by
someone else.

Connecting a backend does not automatically enable account sync, shared cloud
storage, or remote backups. Those are separate product features and need their
own data model, authentication, authorization, storage, migration, and deletion
rules.

## Cloudflare Worker Example

`workers/polaris-api/` is a smaller Worker package for a built-in chat gateway.
It is not a full replacement for every `/api/...` route.

```bash
cd workers/polaris-api
npm ci
npm run typecheck
```

Create the KV namespace used for rate limits, put the namespace id in
`workers/polaris-api/wrangler.toml`, and set provider secrets:

```bash
npx wrangler kv namespace create RATE_LIMIT
npx wrangler secret put MIMO_API_KEY
npx wrangler secret put SILICONFLOW_API_KEY
npm run deploy
```

Then build the frontend with:

```bash
VITE_POLARIS_API_ORIGIN=https://your-worker.example.com npm run build
```

The Worker currently exposes a compact chat-completions shape. Provider relay,
embeddings, image relay, search, diagnostics, and shared-material routes remain
separate backend responsibilities.

## Android Build

Build and sync the web assets into the Android wrapper:

```bash
npm i
npm run android:sync
```

Build a debug APK for local testing:

```bash
npm run android:build-debug
```

The debug APK is generated under:

```text
android/app/build/outputs/apk/debug/
```

For a release build:

```bash
npm run android:build-release
```

Public distribution uses a package identity, versioning, and signing setup owned
by the distributor. Fork distributors normally use their own Android
`applicationId`, Capacitor `appId`, app name, and versioning so their releases do
not collide with another channel.

For native builds that need internal `/api` routes, set
`VITE_POLARIS_API_ORIGIN` to a deployer-owned backend during the build.

## iOS Build

Sync the web assets into the iOS wrapper:

```bash
npm i
npm run ios:sync
```

Build for simulator without code signing:

```bash
npm run ios:build-sim
```

Build for device without App Store signing:

```bash
npm run ios:build-device
```

TestFlight or App Store distribution requires an Apple Developer account,
signing identities, provisioning profiles, and capability review for the
distributor's own bundle identifier.

For native builds that need internal `/api` routes, set
`VITE_POLARIS_API_ORIGIN` to a deployer-owned backend during the build.

## Verification

Run source checks before deploying:

```bash
npm run typecheck
npm run test:data-boundary
npm test
npm run build
```

For a broader source gate:

```bash
npm run verify
```

For publication hygiene:

```bash
npm run publication:hygiene
```

## Troubleshooting

`Failed to fetch` usually means the frontend is calling an API route that is not
available from the current origin. Deploy same-origin `/api` routes or rebuild
with `VITE_POLARIS_API_ORIGIN` set to a reachable backend.

`404` on `/api/...` during `npm run dev` means Vite has no proxy target. Set
`VITE_POLARIS_API_ORIGIN` in `.env.local` or run a host that serves the handlers.

CORS errors mean the backend has not allowed the frontend origin. Add the exact
frontend origin to the backend allowlist instead of opening credentialed routes
to every origin.

Android installation blocks are controlled by the device. Enable installation
from the browser or file manager used to open the APK.

Native builds that show API failures need a real backend origin. A Capacitor app
shell is not a backend server.

## User Data

Polaris is local-first. Browser data, Android data, iOS data, imported backups,
and exported archives remain user-controlled local data unless a user explicitly
exports, imports, or connects a backend.

A self-hosted backend is not automatically a private data vault. The operator of
that backend can access the requests routed through it.

Public issues are safest with symptoms, versions, devices, and reproduction
steps instead of private backups, full databases, API keys, or chat exports.
