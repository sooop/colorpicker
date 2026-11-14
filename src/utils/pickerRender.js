// OKLCH → sRGB 를 culori 없이 직접 계산해 캔버스를 빠르게 채운다 (객체 할당 없음).
const GAMMA_N = 8192;
const GAMMA = new Uint8ClampedArray(GAMMA_N + 1);
for (let i = 0; i <= GAMMA_N; i++) {
  const v = i / GAMMA_N;
  GAMMA[i] = Math.round((v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
}
const enc = (v) => GAMMA[Math.round((v < 0 ? 0 : v > 1 ? 1 : v) * GAMMA_N)];

export const MAX_CHROMA = 0.4;

// width×height 픽셀의 ImageData 와 행별 색역 경계 x 좌표를 만든다.
export function renderGradient(ctx, width, height, hue) {
  const img = ctx.createImageData(width, height);
  const data = img.data;
  const boundary = new Int32Array(height).fill(-1);
  const hr = (hue * Math.PI) / 180;
  const cosH = Math.cos(hr);
  const sinH = Math.sin(hr);
  const eps = 1e-6;

  for (let y = 0; y < height; y++) {
    const L = 1 - y / height;
    let hit = false;
    let idx = y * width * 4;
    for (let x = 0; x < width; x++, idx += 4) {
      const C = (x / width) * MAX_CHROMA;
      const a = C * cosH;
      const b = C * sinH;
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.291485548 * b;
      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;
      const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;
      if (!hit && (r < -eps || r > 1 + eps || g < -eps || g > 1 + eps || bl < -eps || bl > 1 + eps)) {
        hit = true;
        boundary[y] = x;
      }
      data[idx] = enc(r);
      data[idx + 1] = enc(g);
      data[idx + 2] = enc(bl);
      data[idx + 3] = 255;
    }
  }
  return { img, boundary };
}
