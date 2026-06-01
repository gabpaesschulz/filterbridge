# Deploying the Demo App

The FilterBridge demo is a Vite + React app located in `apps/demo`. It is not published to npm, but it can be deployed to any static hosting platform.

---

## Local build

From the repository root:

```bash
pnpm install
pnpm demo:build
```

The built output is in `apps/demo/dist/`.

To preview the built output locally:

```bash
pnpm --filter @filterbridge/demo preview
```

---

## Deploying to Vercel

A `vercel.json` file is included in `apps/demo/` with the correct build settings for the monorepo.

### Option A — Vercel dashboard (recommended)

1. Import the GitHub repository at https://vercel.com/new
2. Set **Root Directory** to `apps/demo`
3. Vercel will detect the `vercel.json` and use these settings automatically:

| Setting | Value |
|---------|-------|
| **Build Command** | `cd ../.. && pnpm install --frozen-lockfile && pnpm demo:build` |
| **Output Directory** | `dist` |
| **Framework** | Vite |

4. Deploy.
5. After deploying, update the live demo URL in `README.md` and this file.

### Option B — Vercel CLI

```bash
vercel --cwd apps/demo
```

This uses `apps/demo/vercel.json` automatically.

### The `vercel.json` file

`apps/demo/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm install --frozen-lockfile && pnpm demo:build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

The build command navigates to the monorepo root so that workspace packages are resolved correctly before building the demo.

---

## Deploying to Netlify

### Netlify dashboard

1. Connect the GitHub repository at https://app.netlify.com
2. Set build settings:

| Setting | Value |
|---------|-------|
| **Base directory** | _(leave empty or set to repo root)_ |
| **Build command** | `pnpm demo:build` |
| **Publish directory** | `apps/demo/dist` |

3. Deploy.

### `netlify.toml` (optional)

Create `netlify.toml` at the repo root if you prefer config-as-code:

```toml
[build]
  command = "pnpm demo:build"
  publish = "apps/demo/dist"
```

---

## Monorepo notes

- The demo depends on workspace packages (`@filterbridge/core`, `@filterbridge/react`, etc.) via `workspace:*`. These are resolved at build time from the monorepo — the full repository must be available during the build.
- The demo app does not require a server. It is a fully static single-page app.
- There are no environment variables required.
- pnpm 8+ must be available in the build environment. Both Vercel and Netlify support pnpm via `packageManager` field or explicit configuration.

---

## Live demo URL

**Live:** https://filterbridge-demo.vercel.app

Deployed on Vercel from the `main` branch. Updates automatically on push.

---

## What the demo shows

The demo renders an invoice admin screen with all six filter types:

- text search
- single select (status)
- multi-select (tags)
- boolean toggle (archived)
- date range (issued date)
- number range (amount)

A live output panel on the right shows the React state, backend DTO, and URL search params updating in real time as filters change. A TanStack Table below shows filtered invoice rows.

The "Fill example" button populates all filters with sample values. The "Reset" button clears all filters.

URL synchronization is active: changing filters updates `window.location.search`, and reloading the page restores the current filter state.

---

## Screenshot

To generate a screenshot of the running demo:

```bash
pnpm demo          # terminal 1
pnpm screenshot    # terminal 2
```

Output: `docs/assets/filterbridge-demo.png`

See [`docs/assets/README.md`](../assets/README.md) for full instructions.
