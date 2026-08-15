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
2. Set **Root Directory** to `apps/demo` — this is required, not cosmetic. See below.
3. Vercel reads `apps/demo/vercel.json` and uses these settings automatically:

| Setting              | Value                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| **Build Command**    | `cd ../.. && pnpm install --frozen-lockfile && pnpm build && pnpm demo:build` |
| **Output Directory** | `dist`                                                                        |
| **Framework**        | Vite                                                                          |

4. Deploy.
5. After deploying, update the live demo URL in `README.md` and this file.

### Root Directory must be `apps/demo`

**Vercel only reads `vercel.json` from the configured Root Directory.** Leave it at the repository
root and `apps/demo/vercel.json` is ignored completely — every setting in the table above included.

What that looks like when it happens, because the failure does not name its cause:

```
Running "pnpm run build"
> filterbridge-monorepo@ build
> pnpm --filter @filterbridge/core --filter @filterbridge/react ... build
packages/core build: Done
...
Error: No Output Directory named "public" found after the Build completed.
```

Vercel fell back to the repository root's `build` script, which builds the five **library** packages
and produces no web output at all, then looked for Vercel's default output directory for the "Other"
framework preset. The demo was never built. This is what broke the first preview deployment on this
repository, and nothing in the log points at the root directory.

If you see that error, the fix is the project setting, not a new config file.

### Why `vercel.json` lives in `apps/demo` and not at the root

Because the deployable artifact is the demo, not the monorepo. Root Directory tells Vercel which
workspace it is deploying; the config next to that workspace describes how to build it. Putting a
second `vercel.json` at the repository root to satisfy a root-directory misconfiguration would leave
two config files where only one is ever read — and the dead one drifts silently, which is worse than
the original bug.

The build command starts with `cd ../..` for the same reason it exists at all: the demo resolves
`@filterbridge/*` through each package's `dist/` output, so the packages have to be built from the
monorepo root before Vite runs. That is also why `pnpm build` precedes `pnpm demo:build`.

### Option B — Vercel CLI

```bash
vercel --cwd apps/demo
```

This uses `apps/demo/vercel.json` automatically.

### The `vercel.json` file

`apps/demo/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm install --frozen-lockfile && pnpm build && pnpm demo:build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

`pnpm build` compiles the five library packages; `pnpm demo:build` then builds the demo against
their `dist/` output. `outputDirectory` is relative to the Root Directory, so `dist` here means
`apps/demo/dist`.

The same sequence runs in CI as the `demo build` job, so a break is caught on the pull request
rather than by the deployment.

---

## Deploying to Netlify

### Netlify dashboard

1. Connect the GitHub repository at https://app.netlify.com
2. Set build settings:

| Setting               | Value                               |
| --------------------- | ----------------------------------- |
| **Base directory**    | _(leave empty or set to repo root)_ |
| **Build command**     | `pnpm demo:build`                   |
| **Publish directory** | `apps/demo/dist`                    |

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
- The pnpm version is pinned by `packageManager` in the root `package.json`, and Vercel and Netlify both honour it. That keeps the deploy on the same pnpm as CI and local development instead of whatever the platform picks by heuristic.

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

URL synchronization is active: changing filters pushes a history entry, reloading restores the
current filter state, and the browser's Back and Forward buttons move through the filter history
without a page load.

The Archived control is a three-option select rather than a checkbox, because a `boolean()` filter
has three states — `true`, `false`, and not filtering at all — and a checkbox can only express two.

---

## Screenshot

To generate a screenshot of the running demo:

```bash
pnpm demo          # terminal 1
pnpm screenshot    # terminal 2
```

Output: `docs/assets/filterbridge-demo.png`

See [`docs/assets/README.md`](../assets/README.md) for full instructions.
