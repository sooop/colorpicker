import { get, writable } from 'svelte/store';
import { sameColor, oklchToCSS, oklchToHex, parseColorToOklch, snapColor, isValidOklch, normalizeOklch } from './colorUtils.js';
import { sanitizePalettes, nextPaletteId, palettes } from '../state.js';
import { showToast } from '../components/Toast.svelte';
import { MAX_FILE_BYTES } from './files.js';

const FORMAT_ID = 'colorpicker-palettes';

// ---- 내보내기 ----
export function buildExport(list) {
  return JSON.stringify({
    format: FORMAT_ID,
    version: 1,
    exportedAt: new Date().toISOString(),
    palettes: list.map((p) => ({
      name: p.name,
      colors: p.colors.map((c) => ({
        l: +c.l.toFixed(4),
        c: +c.c.toFixed(4),
        h: +c.h.toFixed(2)
      }))
    }))
  }, null, 2);
}

export function exportFileName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `colorpicker-palettes-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}.json`;
}

// ---- 현재 팔레트를 개발용 코드로 ----
export function formatCssVars(palette) {
  const lines = palette.colors.map((c, i) => `  --color-${i + 1}: ${oklchToCSS(c)};`);
  return `:root {\n${lines.join('\n')}\n}`;
}

export function formatTailwind(palette) {
  const lines = palette.colors.map((c, i) => `        'color-${i + 1}': '${oklchToCSS(c)}',`);
  return `// tailwind.config.js\nexport default {\n  theme: {\n    extend: {\n      colors: {\n${lines.join('\n')}\n      },\n    },\n  },\n};`;
}

export function formatHexList(palette) {
  return palette.colors.map((c) => oklchToHex(c)).join('\n');
}

// ---- 가져오기 ----
// 텍스트에서 팔레트 후보를 뽑는다. 반환: { palettes: [{name, colors}], invalid }
export function parseImportText(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return { palettes: [], invalid: 0, ok: false };

  let data;
  try { data = JSON.parse(trimmed); } catch (e) { data = undefined; }

  if (data !== undefined) {
    let list = null;
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === 'object' && Array.isArray(data.palettes)) list = data.palettes;
    if (!list) return { palettes: [], invalid: 1, ok: false };
    const { palettes, dropped } = sanitizePalettes(list);
    return { palettes: palettes.map((p) => ({ name: p.name, colors: p.colors })), invalid: dropped, ok: true };
  }

  // JSON 이 아니면 HEX 목록·CSS 변수처럼 색 표기가 들어 있는 텍스트로 본다
  const tokens = trimmed.match(/#[0-9a-fA-F]{3,8}\b|(?:oklch|rgba?|hsla?)\([^)]*\)/g) || [];
  const colors = [];
  let invalid = 0;
  for (const t of tokens) {
    const parsed = parseColorToOklch(t);
    if (parsed) colors.push(snapColor(parsed));
    else invalid++;
  }
  if (!colors.length) return { palettes: [], invalid: invalid || 1, ok: false };
  return { palettes: [{ name: '가져온 팔레트', colors }], invalid, ok: true };
}

// 같은 이름의 팔레트는 색을 합치고 중복은 건너뛴다. 없으면 새 팔레트로 만든다.
export function mergePalettes(existing, incoming) {
  const result = existing.map((p) => ({ ...p, colors: [...p.colors] }));
  let added = 0;
  let dup = 0;
  let created = 0;
  for (const inc of incoming) {
    let target = result.find((p) => p.name === inc.name);
    if (!target) {
      target = { id: nextPaletteId(result), name: inc.name, colors: [] };
      result.push(target);
      created++;
    }
    for (const col of inc.colors) {
      if (!isValidOklch(col)) continue;
      const c = normalizeOklch(col);
      if (target.colors.some((x) => sameColor(x, c))) dup++;
      else { target.colors.push(c); added++; }
    }
  }
  return { palettes: result, added, dup, created };
}

// ---- 가져오기 실행 (파일 열기·드롭·붙여넣기가 모두 이 경로를 쓴다) ----
export const importResult = writable(null); // { type: 'ok' | 'error', text }

export function importFromText(text) {
  const parsed = parseImportText(text);
  if (!parsed.ok) {
    const msg = '가져올 팔레트나 색을 찾지 못했습니다. 이 앱에서 내보낸 JSON 이나 HEX·oklch() 색 목록이어야 합니다.';
    importResult.set({ type: 'error', text: msg });
    showToast('가져오지 못했습니다', { type: 'error' });
    return false;
  }
  const merged = mergePalettes(get(palettes), parsed.palettes);
  palettes.set(merged.palettes);
  let summary = `추가 ${merged.added}, 중복 ${merged.dup}, 제외 ${parsed.invalid}`;
  if (merged.created) summary += ` · 새 팔레트 ${merged.created}개`;
  importResult.set({ type: 'ok', text: summary });
  showToast(`가져왔습니다. ${summary}`, { type: merged.added ? 'success' : 'info', duration: 3500 });
  return true;
}

export async function importFromFiles(files) {
  const file = files[0];
  if (!file) return false;
  if (file.size > MAX_FILE_BYTES) {
    importResult.set({ type: 'error', text: '파일이 너무 큽니다. 5MB 이하의 JSON 파일을 사용하세요.' });
    return false;
  }
  let text;
  try {
    text = await file.text();
  } catch (e) {
    importResult.set({ type: 'error', text: '파일을 읽을 수 없습니다.' });
    return false;
  }
  return importFromText(text);
}
