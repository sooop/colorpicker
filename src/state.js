import { writable, get } from 'svelte/store';
import {
  DEFAULT_COLOR, MAX_C, snapColor, snapToGamutC, isValidOklch, sameColor, normalizeOklch
} from './utils/colorUtils.js';

// 저장 키는 기존 형식을 그대로 쓴다 (oklch-* 4개). 입력 모드와 이동 단계만 새 키.
const KEYS = {
  palettes: 'oklch-palettes',
  color: 'oklch-currentColor',
  active: 'oklch-activePaletteId',
  selected: 'oklch-selectedColorIndex',
  settings: 'colorpicker.settings',
  theme: 'colorpicker.theme'
};

export const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }
};
export { KEYS };

function readJSON(key) {
  const raw = storage.get(key);
  if (raw === null || raw === undefined) return undefined;
  try { return JSON.parse(raw); } catch (e) { return undefined; }
}

export const defaultPalettes = () => [{ id: 1, name: '기본 팔레트', colors: [] }];

// 팔레트 배열의 구조를 검증하고 정리한다. 잘못된 항목은 버리고 개수를 센다.
export function sanitizePalettes(raw) {
  let dropped = 0;
  if (!Array.isArray(raw)) return { palettes: [], dropped: raw === undefined ? 0 : 1 };
  const palettes = [];
  const usedIds = new Set();
  for (const p of raw) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.colors)) { dropped++; continue; }
    const colors = [];
    for (const c of p.colors) {
      if (!isValidOklch(c)) { dropped++; continue; }
      colors.push(normalizeOklch(c));
    }
    let id = Number.isInteger(p.id) ? p.id : NaN;
    if (!Number.isFinite(id) || usedIds.has(id)) {
      id = (palettes.reduce((m, q) => Math.max(m, q.id), 0) || 0) + 1;
      while (usedIds.has(id)) id++;
    }
    usedIds.add(id);
    const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 60) : `팔레트 ${id}`;
    palettes.push({ id, name, colors });
  }
  return { palettes, dropped };
}

function loadPalettes() {
  const { palettes } = sanitizePalettes(readJSON(KEYS.palettes));
  return palettes.length ? palettes : defaultPalettes();
}

function loadColor() {
  const raw = readJSON(KEYS.color);
  return isValidOklch(raw) ? snapColor(raw) : { ...DEFAULT_COLOR };
}

const initialPalettes = loadPalettes();

function loadActiveId() {
  const n = parseInt(storage.get(KEYS.active), 10);
  return initialPalettes.some((p) => p.id === n) ? n : initialPalettes[0].id;
}

const initialActive = loadActiveId();

function loadSelected() {
  const n = parseInt(storage.get(KEYS.selected), 10);
  const pal = initialPalettes.find((p) => p.id === initialActive);
  return Number.isInteger(n) && pal && n >= 0 && n < pal.colors.length ? n : -1;
}

const MODES = ['oklch', 'hex', 'rgb', 'hsl', 'hsv'];
const STEPS = ['fine', 'medium', 'coarse'];

function loadSettings() {
  const raw = readJSON(KEYS.settings);
  const s = { colorMode: 'oklch', keyStep: 'medium' };
  if (raw && typeof raw === 'object') {
    if (MODES.includes(raw.colorMode)) s.colorMode = raw.colorMode;
    if (STEPS.includes(raw.keyStep)) s.keyStep = raw.keyStep;
  }
  return s;
}

export const currentColor = writable(loadColor());
export const palettes = writable(initialPalettes);
export const activePaletteId = writable(initialActive);
export const selectedColorIndex = writable(loadSelected());
export const settings = writable(loadSettings());

// 변형·스케일 모달
export const variationModal = writable({ open: false, base: { ...DEFAULT_COLOR } });
export function openVariation(base) {
  variationModal.set({ open: true, base: { ...base } });
}

// ---- 저장 (디바운스, 페이지를 떠날 때 즉시 기록) ----
const flushers = [];
function persist(store, key, serialize, delay) {
  let timer = 0;
  let pending = false;
  let first = true;
  const flush = () => {
    clearTimeout(timer);
    if (!pending) return;
    pending = false;
    storage.set(key, serialize(get(store)));
  };
  store.subscribe(() => {
    if (first) { first = false; return; }
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  });
  flushers.push(flush);
}

persist(palettes, KEYS.palettes, (v) => JSON.stringify(v), 200);
persist(currentColor, KEYS.color, (v) => JSON.stringify(v), 400);
persist(activePaletteId, KEYS.active, (v) => String(v), 100);
persist(selectedColorIndex, KEYS.selected, (v) => String(v), 100);
persist(settings, KEYS.settings, (v) => JSON.stringify(v), 100);

if (typeof window !== 'undefined') {
  const flushAll = () => flushers.forEach((f) => f());
  window.addEventListener('pagehide', flushAll);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
}

// ---- 현재 색 ----
// 색상각을 움직여도 사용자가 정한 채도가 색역 때문에 영구히 줄지 않도록 의도한 채도를 따로 기억한다.
let intentC = get(currentColor).c;

// 범위 제한과 색역 스냅을 거쳐 현재 색을 정한다. 모든 입력 경로가 이 함수를 쓴다.
export function setColor(next) {
  const snapped = snapColor(next);
  intentC = snapped.c;
  currentColor.set(snapped);
  return snapped;
}

export function setHue(h) {
  const cur = get(currentColor);
  const n = normalizeOklch({ l: cur.l, c: intentC, h });
  const c = snapToGamutC(n.l, Math.min(n.c, MAX_C), n.h);
  currentColor.set({ l: n.l, c, h: n.h });
}

// ---- 팔레트 ----
export function switchPalette(id) {
  if (id === get(activePaletteId)) return;
  activePaletteId.set(id);
  selectedColorIndex.set(-1);
}

export function activePalette() {
  const id = get(activePaletteId);
  return get(palettes).find((p) => p.id === id);
}

// 팔레트에 색을 더한다. 이미 있는 색은 건너뛴다(dedupe).
export function addColors(paletteId, colors, { dedupe = true } = {}) {
  let added = 0;
  let dup = 0;
  palettes.update((pals) => pals.map((p) => {
    if (p.id !== paletteId) return p;
    const next = [...p.colors];
    for (const col of colors) {
      if (dedupe && next.some((x) => sameColor(x, col))) { dup++; continue; }
      next.push({ l: col.l, c: col.c, h: col.h });
      added++;
    }
    return added ? { ...p, colors: next } : p;
  }));
  return { added, dup };
}

export function nextPaletteId(pals) {
  return pals.reduce((m, p) => Math.max(m, p.id), 0) + 1;
}

export function loadTheme() {
  const t = storage.get(KEYS.theme);
  return t === 'light' || t === 'dark' ? t : null;
}

// 이미지에서 색을 가져올 파일 (드롭·붙여넣기·파일 열기가 같은 경로를 쓴다)
export const imageRequest = writable(null);
