# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Start Vite dev server with HMR
npm run build         # Production build to dist/
npm run build:standalone  # Single-file HTML output to dist/standalone.html
npm run preview       # Preview production build locally
```

No test framework is configured.

## Architecture

**Stack:** Svelte 5 + Vite + Tailwind CSS + Culori (color library)

**Primary color space:** OKLCH (perceptually uniform). All internal state is OKLCH; `src/utils/colorUtils.js` wraps Culori for conversions to/from RGB, HEX, HSL, HSV.

**State management:** Svelte writable stores in `App.svelte` — `currentColor`, `palettes`, `activePaletteId`, `selectedColorIndex`. These sync to localStorage (`oklch-*` keys) for persistence.

**Component flow:**
- `App.svelte` — root, owns all global state, passes down via props/bindings
- `Palette.svelte` — multi-palette manager (add/rename/delete palettes, manage saved colors)
- `ColorPicker.svelte` — OKLCH canvas picker (square gradient + hue slider)
- `ColorInfo.svelte` — multi-format display and text input (OKLCH/RGB/HEX/HSL/HSV)
- `VariationModal.svelte` — generates color variations from a base color
- `ConfirmModal.svelte`, `Toast.svelte` — utility UI

**Standalone build:** `build-standalone.sh` inlines all CSS/JS into a single `dist/standalone.html` using Node.js post-processing after `vite build`.
