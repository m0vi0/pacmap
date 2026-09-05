# PacMap UX & Performance Audit

**Generated:** 2026-09-05
**Project:** PacMap — live network-traffic visualizer
**Sources:** Agent briefings, UX hypotheses, performance findings, E2E test suite

---

## Executive Summary

PacMap is a capable single-user network analysis tool with a distinctive 3D visualization and checkpoint/diff system. However, it suffers from discoverability gaps (diff mode buried), performance issues (no code-splitting, unmemoized components), and accessibility gaps (keyboard navigation incomplete).

**Key findings:**
- Bundle size warning (803 KB vs 500 KB threshold) — Three.js dominates
- Diff mode requires 4 clicks to reach; most users never discover it
- No React.memo; full tree re-renders on every state change
- Unused dependencies (framer-motion, radix-ui, lucide) inflating install time
- Keyboard navigation exists for replay but not for panels/checkpoints

---

## Top 10 UX Improvements (Ranked by Impact)

| # | Item | Effort | Impact | File:Line |
|---|------|--------|--------|-----------|
| 1 | **Surface diff in checkpoints tab** — show "Compare" button inline when 2+ checkpoints exist | Low | 8 | App.jsx:~3300 |
| 2 | **Persistent filter feedback** — show active filter as chip, keep error visible | Low | 7 | App.jsx:~3108-3171 |
| 3 | **Status-bar change strip** — always-visible protocol byte share + top changes | Medium | 6 | App.jsx:~2949 |
| 4 | **Panel tab restoration** — restore right-panel tab after closing drawer | Medium | 5 | App.jsx:~3228-3298 |
| 5 | **Keyboard a11y** — roving tabIndex on checkpoint cards, aria labels on toggles | Medium | 5 | App.jsx: throughout |
| 6 | **Protocol count badge** — show disabled protocol count on collapsed dock | Low | 4 | App.jsx:~2961 |
| 7 | **Smoother panel transitions** — CSS transitions on drawer/panel open/close | Low | 4 | App.css: Dock, drawer sections |
| 8 | **Checkpoint auto-label** — suggest label based on trigger ("New host discovered") | Low | 3 | App.jsx:~2822-2833 |
| 9 | **PCAP progress bar** — show replay progress with `<progress>` element | Low | 3 | App.jsx:~3053-3060 |
| 10 | **Host search** — quick-search dropdown for selecting IPs by name | Medium | 3 | App.jsx: filter suggestions |

---

## Top 10 Performance Improvements (Ranked by Effort/Impact)

| # | Item | Effort | Impact | File:Line |
|---|------|--------|--------|-----------|
| 1 | **Lazy-load Three.js** — dynamic import for three + OrbitControls | Low | 8 | App.jsx:2-3 |
| 2 | **Remove unused deps** — uninstall framer-motion, radix-ui, lucide | Very Low | 6 | package.json:13-26 |
| 3 | **Vite manual chunks** — code-split three/vendor/ui | Low | 5 | vite.config.js:8-21 |
| 4 | **React.memo expensive components** — memoize PacketInspector, filter tray | Medium | 5 | App.jsx:~2949-3415 |
| 5 | **Throttle memoized filters** — skip filter rebuilds if <16ms since last | Medium | 4 | App.jsx:1052-1060 |
| 6 | **Three.js unmount cleanup** — dispose scene/renderer on component unmount | Low | 4 | App.jsx:~800 |
| 7 | **useMemo deps audit** — fix incomplete dependency arrays | Medium | 3 | App.jsx: throughout |
| 8 | **Debounce timeline updates** — reduce trafficAnalysis rebuilds | Low | 3 | App.jsx:~1115 |
| 9 | **CSS purge** — remove unused Tailwind classes | Low | 2 | App.css:2840 lines |
| 10 | **Web Workers for pcap parsing** — offload packet processing to worker | High | 2 | New file |

---

## E2E Test Coverage

**Test file:** `client/e2e/pacmap.spec.js`
**Run:** `cd client && npx playwright test e2e/pacmap.spec.js --headed`

| Test | Status | Screenshot |
|------|--------|------------|
| Page loads without errors | ✅ | `artifacts/page-load.png` |
| Capture controls visible | ✅ | `artifacts/capture-controls.png` |
| Protocol filters toggle | ✅ | `artifacts/protocols-*.png` |
| Right panel tabs exist | ✅ | `artifacts/right-panel.png` |
| Filter input present | ✅ | `artifacts/filter-input.png` |
| Checkpoint button exists | ✅ | `artifacts/checkpoint-button.png` |
| 3D canvas renders | ✅ | `artifacts/viewport.png` |
| Panel toggle works | ✅ | `artifacts/panel-toggle.png` |

**Note:** Tests require the app running at `http://127.0.0.1:5176`. Start with `./run-pacmap.sh` + `npm run dev`.

---

## Implementation Checklist

Run these commands to verify:

```bash
# Lint (should pass)
cd client && npx eslint .

# Build (should succeed with no new warnings)
cd client && npm run build

# E2E (requires app running)
cd client && npx playwright test e2e/pacmap.spec.js --headed
```

### Bundle Architecture (Post-Fix)

| Chunk | Size | Gzip |
|-------|------|------|
| `three-DifdSBzV.js` | 539 KB | 134 KB |
| `vendor-zDAGiQyy.js` | 190 KB | 60 KB |
| `index-Dr_PzGUp.js` | 75 KB | 23 KB |
| `index-DO42ciWb.css` | 68 KB | 13 KB |
| **Total** | **~872 KB** | **~230 KB** |

vs. original single 803 KB bundle. The three.js chunk is now cacheable independently.

### Quick Wins (Completed)

```bash
# 1. Removed unused deps (26 packages removed)
cd client && npm uninstall @radix-ui/react-navigation-menu @radix-ui/react-slider framer-motion lucide-react

# 2. Manual chunks added to vite.config.js
# (edit vite.config.js, add build.rollupOptions.output.manualChunks)

# 3. Surfaced diff button in checkpoints tab
# (edit App.jsx:~3420, inline compare button when checkpoints.length >= 2)
```

### Medium Effort (Completed)

```bash
# 4. Persistent filter feedback
# (edit App.jsx:~3130-3170, render activeFilter as chip)

# 5. Diff shortcut CSS
# (edit App.css:~2646-2654, .diffShortcut + hover styles)

# 6. Active filter chip CSS
# (edit App.css:~2658-2679, .activeFilterChip + dismiss button)
```

### Remaining Items

```bash
# 7. Lazy-load Three.js — requires async import pattern refactor
# 8. Add React.memo to expensive components — requires component extraction
# 9. Throttle memoized filters — requires testing filter edge cases
# 10. Three.js unmount cleanup — requires finding all scene/renderer refs
```

---

## Risks & Tradeoffs

- **Bundle split may break Three.js imports** — test thoroughly after adding manualChunks; some Three.js addons expect static imports.
- **Removing radix-ui may break future UI components** — only safe because `components/ui/*` is unused today.
- **Memoization can cause stale state** — always test keyboard navigation and filter apply after wrapping components.
- **E2E tests are fragile to DOM changes** — selectors are CSS-class based; refactor to use data-testid if frequent breakages occur.

---

## Open Questions

1. **Feature scope:** Should the status-bar change strip (H5) show ALL network events or only anomalies? Default: anomalies only (bytesDelta > 10%).
2. **PCAP upload:** Should we support drag-and-drop or only button upload? Current: button only.
3. **Mobile:** Is responsive design a goal? Current: desktop-only (3D canvas, complex panels).

---

## Files Created

| File | Purpose |
|------|---------|
| `.hermes/plans/2026-09-05_170510-debate-ux-ai_agent-briefs.md` | Feature inventory (42 useState, 52 useRef, 137 CSS classes) |
| `.hermes/plans/2026-09-05_170510-debate-ux-ai_product-hypotheses.md` | 5 UX hypotheses |
| `.hermes/plans/2026-09-05_170510-debate-ux-ai_perf-findings.md` | 6 performance recommendations |
| `client/e2e/pacmap.spec.js` | Playwright E2E test suite (8 tests) |
| `client/e2e/README.md` | How to run E2E tests |
| `AUDIT-UX.md` | This file — final deliverable |