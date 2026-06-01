# docs/assets

This directory holds public assets referenced in the root `README.md` and documentation.

## Demo screenshot

**File:** `docs/assets/filterbridge-demo.png`

Referenced in `README.md` as:

```md
![FilterBridge demo](./docs/assets/filterbridge-demo.png)
```

### Generating the screenshot

1. Start the demo app in one terminal:

   ```bash
   pnpm demo
   ```

2. In another terminal, run the capture script:

   ```bash
   pnpm screenshot
   ```

The script (`scripts/capture-demo-screenshot.mjs`) launches a headless Chromium browser via Playwright, navigates to `http://localhost:5173`, clicks the "Fill example" button, and saves a 1440×900 screenshot.

If Playwright's Chromium browser is not installed, run:

```bash
pnpm screenshot:install
```

### Manual capture

If the script fails or you prefer manual capture:

1. Run `pnpm demo`
2. Open `http://localhost:5173`
3. Click **Fill example** to populate all filters
4. Take a screenshot at 1440×900 (or wider)
5. Save as `docs/assets/filterbridge-demo.png`

The screenshot should show the filter controls on the left and the live output panel on the right, with all filters populated.
