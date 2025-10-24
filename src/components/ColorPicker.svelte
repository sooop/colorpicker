<script>
  import { onMount } from 'svelte';
  import { rgb, oklch } from 'culori';

  export let color;

  let canvas;
  let pickerBox;
  let isDragging = false;

  $: ({ l, c, h } = $color);

  // 피커 위치 계산 (c: 가로, l: 세로)
  $: pickerX = (c / 0.4) * 100; // chroma 최대값 0.4
  $: pickerY = (1 - l) * 100; // lightness 반전

  // h 값이 변경되면 Canvas 다시 그리기
  $: if (canvas && h !== undefined) {
    drawGradient();
  }

  onMount(() => {
    drawGradient();
  });

  function drawGradient() {
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const lightness = 1 - (y / height); // 위쪽이 밝음
        const chroma = (x / width) * 0.4; // 오른쪽으로 갈수록 강도 증가

        // OKLCH를 RGB로 변환
        const rgbColor = rgb(oklch({ l: lightness, c: chroma, h }));

        const index = (y * width + x) * 4;
        if (rgbColor) {
          data[index] = Math.round((rgbColor.r ?? 0) * 255);     // R
          data[index + 1] = Math.round((rgbColor.g ?? 0) * 255); // G
          data[index + 2] = Math.round((rgbColor.b ?? 0) * 255); // B
          data[index + 3] = 255;                                  // A
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function handlePickerMove(event) {
    if (!pickerBox) return;

    const rect = pickerBox.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

    const newC = (x / rect.width) * 0.4;
    const newL = 1 - (y / rect.height);

    color.set({ l: newL, c: newC, h });
  }

  function handleMouseDown(event) {
    isDragging = true;
    handlePickerMove(event);
  }

  function handleMouseMove(event) {
    if (isDragging) {
      handlePickerMove(event);
    }
  }

  function handleMouseUp() {
    isDragging = false;
  }

  function handleKeyDown(event) {
    const step = event.shiftKey ? 0.01 : 0.005;
    let newC = c;
    let newL = l;

    switch (event.key) {
      case 'ArrowLeft':
        newC = Math.max(0, c - step);
        break;
      case 'ArrowRight':
        newC = Math.min(0.4, c + step);
        break;
      case 'ArrowUp':
        newL = Math.min(1, l + step);
        break;
      case 'ArrowDown':
        newL = Math.max(0, l - step);
        break;
      default:
        return;
    }

    event.preventDefault();
    color.set({ l: newL, c: newC, h });
  }

  function handleHueChange(event) {
    const newH = parseFloat(event.target.value);
    color.set({ l, c, h: newH });
  }
</script>

<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div class="flex flex-col gap-3">
  <div
    class="relative w-full aspect-square cursor-crosshair border border-neutral-300 focus:border-neutral-900 outline-none overflow-hidden"
    bind:this={pickerBox}
    on:mousedown={handleMouseDown}
    on:keydown={handleKeyDown}
    tabindex="0"
    role="slider"
    aria-label="색상 선택"
  >
    <canvas
      bind:this={canvas}
      width="300"
      height="300"
      class="w-full h-full"
    ></canvas>
    <div
      class="absolute w-3 h-3 border border-neutral-900 rounded-full pointer-events-none bg-white opacity-50"
      style="left: {pickerX}%; top: {pickerY}%; transform: translate(-50%, -50%);"
    ></div>
  </div>

  <div class="w-full">
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      value={h}
      on:input={handleHueChange}
      aria-label="색상 각도"
      class="hue-slider w-full h-6 cursor-pointer"
    />
  </div>
</div>

<style>
  .hue-slider {
    -webkit-appearance: none;
    appearance: none;
    background: linear-gradient(
      to right,
      oklch(70% 0.15 0),
      oklch(70% 0.15 60),
      oklch(70% 0.15 120),
      oklch(70% 0.15 180),
      oklch(70% 0.15 240),
      oklch(70% 0.15 300),
      oklch(70% 0.15 360)
    );
    outline: none;
    border: 1px solid #d4d4d4;
  }

  .hue-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 2px;
    height: 24px;
    background: #171717;
    cursor: pointer;
  }

  .hue-slider::-moz-range-thumb {
    width: 2px;
    height: 24px;
    background: #171717;
    cursor: pointer;
    border: none;
  }
</style>
