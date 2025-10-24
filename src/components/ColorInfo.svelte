<script>
  import {
    oklchToCSS,
    oklchToHex,
    oklchToRgbString,
    oklchToHsl,
    oklchToHsv,
    parseColorToOklch
  } from '../utils/colorUtils.js';
  import { showToast } from './Toast.svelte';

  export let color;
  export let palettes;
  export let activePaletteId;
  export let selectedColorIndex;

  let colorMode = 'oklch';
  let colorInput = '';

  $: currentColor = $color;
  $: cssColor = oklchToCSS(currentColor);
  $: hexValue = oklchToHex(currentColor);
  $: rgbValue = oklchToRgbString(currentColor);

  $: {
    switch (colorMode) {
      case 'oklch':
        colorInput = oklchToCSS(currentColor);
        break;
      case 'hex':
        colorInput = oklchToHex(currentColor);
        break;
      case 'rgb':
        colorInput = oklchToRgbString(currentColor);
        break;
      case 'hsl':
        colorInput = oklchToHsl(currentColor);
        break;
      case 'hsv':
        const hsv = oklchToHsv(currentColor);
        colorInput = `hsv(${Math.round(hsv.h || 0)}, ${Math.round((hsv.s || 0) * 100)}%, ${Math.round((hsv.v || 0) * 100)}%)`;
        break;
    }
  }

  $: activePalette = $palettes.find(p => p.id === $activePaletteId);

  // 대비가 높은 텍스트 색상 자동 계산 (L 값 기준)
  $: textColor = currentColor.l > 0.5 ? '#000000' : '#ffffff';

  function copyColor() {
    navigator.clipboard.writeText(colorInput).then(() => {
      showToast('색상이 복사되었습니다');
    });
  }

  function copyHex() {
    navigator.clipboard.writeText(hexValue).then(() => {
      showToast('HEX 값이 복사되었습니다');
    });
  }

  function copyRgb() {
    navigator.clipboard.writeText(rgbValue).then(() => {
      showToast('RGB 값이 복사되었습니다');
    });
  }

  function handleColorInput() {
    const parsed = parseColorToOklch(colorInput);
    if (parsed) {
      color.set(parsed);
    }
  }

  function addToPalette() {
    if (!activePalette) return;

    palettes.update(pals => {
      return pals.map(p => {
        if (p.id === $activePaletteId) {
          return {
            ...p,
            colors: [...p.colors, currentColor]
          };
        }
        return p;
      });
    });
  }

  function updatePaletteColor() {
    if (!activePalette || $selectedColorIndex < 0) return;

    palettes.update(pals => {
      return pals.map(p => {
        if (p.id === $activePaletteId) {
          const newColors = [...p.colors];
          newColors[$selectedColorIndex] = currentColor;
          return { ...p, colors: newColors };
        }
        return p;
      });
    });
  }

  function handleLChange(e) {
    const value = parseFloat(e.target.value);
    color.set({ ...currentColor, l: value });
  }

  function handleCChange(e) {
    const value = parseFloat(e.target.value);
    color.set({ ...currentColor, c: value });
  }

  function handleHChange(e) {
    const value = parseFloat(e.target.value);
    color.set({ ...currentColor, h: value });
  }
</script>

<div class="flex flex-col gap-4 p-5 bg-white border border-neutral-200 rounded">
  <div class="w-full h-32 border border-neutral-300 relative cursor-pointer" style="background-color: {cssColor}">
    <div class="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
      <button
        on:click={copyHex}
        class="text-xs font-mono hover:opacity-70 transition-opacity"
        style="color: {textColor}"
      >
        {hexValue}
      </button>
      <button
        on:click={copyRgb}
        class="text-xs font-mono hover:opacity-70 transition-opacity"
        style="color: {textColor}"
      >
        {rgbValue}
      </button>
    </div>
  </div>

  <div class="flex gap-2">
    <select bind:value={colorMode} class="px-2 py-1.5 text-xs border border-neutral-300 bg-white">
      <option value="oklch">OKLCH</option>
      <option value="hex">HEX</option>
      <option value="rgb">RGB</option>
      <option value="hsl">HSL</option>
      <option value="hsv">HSV</option>
    </select>

    <input
      type="text"
      bind:value={colorInput}
      on:change={handleColorInput}
      placeholder="색상 코드"
      class="flex-1 px-2 py-1.5 text-xs border border-neutral-300 bg-white"
    />
    <button on:click={copyColor} class="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white transition-colors">
      복사
    </button>
  </div>

  <div class="flex flex-col gap-3">
    <!-- L (밝기) -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="font-light text-xs text-neutral-600">L (밝기)</label>
        <input
          type="number"
          value={currentColor.l.toFixed(3)}
          on:input={handleLChange}
          step="0.01"
          min="0"
          max="1"
          class="w-16 px-2 py-1 border border-neutral-300 text-center text-xs"
        />
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={currentColor.l}
        on:input={handleLChange}
        class="w-full slider"
      />
    </div>

    <!-- C (강도) -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="font-light text-xs text-neutral-600">C (강도)</label>
        <input
          type="number"
          value={currentColor.c.toFixed(3)}
          on:input={handleCChange}
          step="0.01"
          min="0"
          max="0.4"
          class="w-16 px-2 py-1 border border-neutral-300 text-center text-xs"
        />
      </div>
      <input
        type="range"
        min="0"
        max="0.4"
        step="0.01"
        value={currentColor.c}
        on:input={handleCChange}
        class="w-full slider"
      />
    </div>

    <!-- H (각도) -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <label class="font-light text-xs text-neutral-600">H (각도)</label>
        <input
          type="number"
          value={currentColor.h.toFixed(1)}
          on:input={handleHChange}
          step="1"
          min="0"
          max="360"
          class="w-16 px-2 py-1 border border-neutral-300 text-center text-xs"
        />
      </div>
      <input
        type="range"
        min="0"
        max="360"
        step="1"
        value={currentColor.h}
        on:input={handleHChange}
        class="w-full slider"
      />
    </div>
  </div>

  <div class="flex gap-2">
    <button on:click={addToPalette} class="flex-1 px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white transition-colors">
      추가
    </button>
    <button
      on:click={updatePaletteColor}
      disabled={$selectedColorIndex < 0}
      class="flex-1 px-3 py-2 text-xs bg-neutral-600 hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white transition-colors"
    >
      업데이트
    </button>
  </div>
</div>

<style>
  .slider {
    -webkit-appearance: none;
    appearance: none;
    height: 2px;
    background: #d4d4d4;
    outline: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    background: #171717;
    cursor: pointer;
    border-radius: 50%;
  }

  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: #171717;
    cursor: pointer;
    border-radius: 50%;
    border: none;
  }
</style>
