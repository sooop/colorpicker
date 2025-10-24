import { oklch, rgb, formatHex, formatRgb, formatHsl, hsv } from 'culori';

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
  const color = oklch({ l, c, h });
  return hsv(color);
}

// 색상 문자열을 OKLCH로 파싱
export function parseColorToOklch(colorString) {
  try {
    const parsed = oklch(colorString);
    if (parsed && parsed.l !== undefined) {
      return {
        l: parsed.l || 0,
        c: parsed.c || 0,
        h: parsed.h || 0
      };
    }
  } catch (e) {
    console.error('Color parsing error:', e);
  }
  return null;
}

// OKLCH 값 검증 및 정규화
export function normalizeOklch({ l, c, h }) {
  return {
    l: Math.max(0, Math.min(1, l)),
    c: Math.max(0, Math.min(0.4, c)),
    h: ((h % 360) + 360) % 360
  };
}
