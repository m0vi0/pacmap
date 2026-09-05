# PacMap E2E Tests

Run Playwright E2E tests against the PacMap application.

## Prerequisites

```bash
# Install Playwright browsers (once)
cd client
npx playwright install chromium

# Or install all browsers
npx playwright install
```

## Run Tests

```bash
# Headless (CI mode)
cd client
npx playwright test e2e/pacmap.spec.js

# Headed (see the browser)
cd client
npx playwright test e2e/pacmap.spec.js --headed

# With UI mode (interactive)
cd client
npx playwright test e2e/pacmap.spec.js --ui
```

## Screenshots

Screenshots are saved to `e2e/artifacts/`:
- `page-load.png` — Initial page load
- `capture-controls.png` — Dock with Live/PCAP buttons
- `protocols-before.png` — Protocol filter chips
- `protocols-after.png` — After toggling a protocol
- `right-panel.png` — Right panel with tabs
- `filter-input.png` — Traffic filter input
- `checkpoint-button.png` — Checkpoint save button
- `viewport.png` — 3D canvas
- `filter-bar.png` — Filter bar area
- `panel-toggle.png` — After toggling panel

## Test Coverage

Current tests verify:
1. Page loads without errors
2. Capture controls (dock) are visible
3. Protocol filter chips work
4. Right panel tabs exist
5. Filter input is present
6. Checkpoint button exists
7. 3D canvas renders
8. Panel toggle functionality

## Start the App

Tests expect the app running at `http://127.0.0.1:5176`:

```bash
# Terminal 1: Start the backend
cd /Users/m0vi0/Dev/pacmap
./run-pacmap.sh

# Terminal 2: Start the frontend
cd /Users/m0vi0/Dev/pacmap/client
npm run dev

# Terminal 3: Run tests
cd /Users/m0vi0/Dev/pacmap/client
npx playwright test e2e/pacmap.spec.js --headed
```