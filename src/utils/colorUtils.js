import { oklch, rgb, formatHex, formatRgb, formatHsl, hsv, parse } from 'culori';

export const DEFAULT_COLOR = { l: 0.7, c: 0.15, h: 250 };
export const MAX_C = 0.4;

// culori rgb 객체가 sRGB 색역 안에 있는지 (미세 오차 허용)
export function isInGamut(rawRgb) {
  if (!rawRgb) return false;
  const e = 1e-6;
  return rawRgb.r >= -e && rawRgb.r <= 1 + e &&
         rawRgb.g >= -e && rawRgb.g <= 1 + e &&
         rawRgb.b >= -e && rawRgb.b <= 1 + e;
}

// 주어진 L, H 에서 색역 안에 있는 최대 C 를 이분 탐색으로 찾는다
export function snapToGamutC(l, c, h) {
  const raw = rgb(oklch({ l, c, h }));
  if (isInGamut(raw)) return c;

  let lo = 0, hi = c;
  for (let i = 0; i < 15; i++) {
    const mid = (lo + hi) / 2;
    const r = rgb(oklch({ l, c: mid, h }));
    if (isInGamut(r)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// OKLCH 값 검증 및 정규화 (범위 제한)
export function normalizeOklch({ l, c, h }) {
  return {
    l: Math.max(0, Math.min(1, l)),
    c: Math.max(0, Math.min(MAX_C, c)),
    h: ((h % 360) + 360) % 360
  };
}

// 범위 제한 + 색역 스냅. 화면 스와치와 HEX 복사값이 어긋나지 않게 모든 입력 경로가 쓴다.
export function snapColor(color) {
  const n = normalizeOklch(color);
  return { l: n.l, c: snapToGamutC(n.l, n.c, n.h), h: n.h };
}

export function isValidOklch(o) {
  return !!o && typeof o === 'object' &&
    Number.isFinite(o.l) && Number.isFinite(o.c) && Number.isFinite(o.h);
}

export function sameColor(a, b) {
  return Math.abs(a.l - b.l) < 0.001 &&
    Math.abs(a.c - b.c) < 0.001 &&
    Math.abs(((a.h - b.h + 540) % 360) - 180) < 0.1;
}

// OKLCH를 CSS 문자열로 변환
export function oklchToCSS({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}

// OKLCH를 RGB 객체로 변환
export function oklchToRgb({ l, c, h }) {
  return rgb(oklch({ l, c, h }));
}

// OKLCH를 HEX로 변환
export function oklchToHex({ l, c, h }) {
  return formatHex(oklch({ l, c, h }));
}

// OKLCH를 RGB 문자열로 변환
export function oklchToRgbString({ l, c, h }) {
  return formatRgb(oklch({ l, c, h }));
}

// OKLCH를 HSL 문자열로 변환
export function oklchToHsl({ l, c, h }) {
  return formatHsl(oklch({ l, c, h }));
}

// OKLCH를 HSV로 변환
export function oklchToHsv({ l, c, h }) {
  return hsv(oklch({ l, c, h }));
}

export function oklchToHsvString(color) {
  const v = oklchToHsv(color);
  return `hsv(${Math.round(v.h || 0)}, ${Math.round((v.s || 0) * 100)}%, ${Math.round((v.v || 0) * 100)}%)`;
}

// 색상 문자열을 OKLCH로 파싱. 실패하면 null
export function parseColorToOklch(input) {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;
  if (/^[0-9a-f]+$/i.test(s) && [3, 4, 6, 8].includes(s.length)) s = '#' + s;

  // 이 앱이 내보내는 hsv(h, s%, v%) 형식은 culori 가 읽지 못하므로 직접 해석한다
  const m = /^hsv\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*\)$/i.exec(s);
  try {
    const parsed = m
      ? oklch({ mode: 'hsv', h: parseFloat(m[1]), s: parseFloat(m[2]) / 100, v: parseFloat(m[3]) / 100 })
      : (parse(s) ? oklch(s) : null);
    if (parsed && Number.isFinite(parsed.l)) {
      return {
        l: parsed.l || 0,
        c: parsed.c || 0,
        h: parsed.h || 0
      };
    }
  } catch (e) {
    // 파싱 불가
  }
  return null;
}

// ---- WCAG 대비 ----

function channelLum(v) {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// 화면에 실제로 표시되는(HEX 로 복사되는) sRGB 값 기준 상대 휘도
export function relativeLuminance(color) {
  const r = oklchToRgb(color);
  const cl = (v) => Math.max(0, Math.min(1, v || 0));
  return 0.2126 * channelLum(cl(r.r)) + 0.7152 * channelLum(cl(r.g)) + 0.0722 * channelLum(cl(r.b));
}

export const WHITE = { l: 1, c: 0, h: 0 };
export const BLACK = { l: 0, c: 0, h: 0 };

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function contrastLevels(ratio) {
  return { aa: ratio >= 4.5, aaa: ratio >= 7, aaLarge: ratio >= 3 };
}

// 바탕색 위에 얹을 글자색(흑/백) — 대비가 더 높은 쪽
export function bestTextColor(color) {
  return contrastRatio(color, WHITE) >= contrastRatio(color, BLACK) ? '#ffffff' : '#000000';
}

// ---- 변형 / 스케일 ----

export function generateVariations(base, type, count = 16) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    let color;
    if (type === 'lightness') {
      color = { l: Math.sqrt(t), c: base.c, h: base.h };
    } else if (type === 'chroma') {
      color = { l: base.l, c: Math.sqrt(t) * MAX_C, h: base.h };
    } else {
      // 색상각: 기준 색상각에서 한 바퀴를 count 등분
      color = { l: base.l, c: base.c, h: base.h + (360 / count) * i };
    }
    out.push(snapColor(color));
  }
  return out;
}

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SCALE_L = [0.975, 0.945, 0.895, 0.825, 0.73, 0.635, 0.55, 0.47, 0.39, 0.315, 0.235];
const SCALE_C = [0.14, 0.3, 0.52, 0.76, 0.93, 1, 0.97, 0.88, 0.76, 0.62, 0.46];

// 현재 색을 기준으로 50~950 11단계. anchor 가 true 면 L 이 가장 가까운 단계에 기준 색을 그대로 둔다.
export function generateScale(base, anchor = true) {
  const snappedBase = snapColor(base);
  let anchorIdx = -1;
  if (anchor) {
    let best = Infinity;
    SCALE_L.forEach((l, i) => {
      const d = Math.abs(l - snappedBase.l);
      if (d < best) { best = d; anchorIdx = i; }
    });
  }
  const baseC = Math.max(snappedBase.c, 0.02);
  return SCALE_STEPS.map((step, i) => {
    const color = i === anchorIdx
      ? snappedBase
      : snapColor({ l: SCALE_L[i], c: baseC * SCALE_C[i], h: snappedBase.h });
    return { step, color, anchor: i === anchorIdx };
  });
}
