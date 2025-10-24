<script>
  import { oklchToCSS } from '../utils/colorUtils.js';

  export let show = false;
  export let baseColor = { l: 0.7, c: 0.15, h: 250 };
  export let palettes;
  export let activePaletteId;
  export let currentColor;

  let variationType = 'lightness'; // 'lightness' or 'chroma'

  $: variations = generateVariations(baseColor, variationType);
  $: activePalette = $palettes.find(p => p.id === $activePaletteId);

  function generateVariations(color, type) {
    const count = 8;
    const results = [];

    if (type === 'lightness') {
      // L variation: 0~1 범위를 8등분
      for (let i = 0; i < count; i++) {
        const l = (i + 1) / (count + 1); // 0.111, 0.222, ..., 0.888
        results.push({ l, c: color.c, h: color.h });
      }
    } else {
      // C variation: 0~0.4 범위를 8등분
      for (let i = 0; i < count; i++) {
        const c = ((i + 1) / (count + 1)) * 0.4; // 0.044, 0.089, ..., 0.356
        results.push({ l: color.l, c, h: color.h });
      }
    }

    return results;
  }

  function isColorInPalette(color) {
    if (!activePalette) return false;
    return activePalette.colors.some(c =>
      Math.abs(c.l - color.l) < 0.001 &&
      Math.abs(c.c - color.c) < 0.001 &&
      Math.abs(c.h - color.h) < 0.1
    );
  }

  function addToPalette(color) {
    if (isColorInPalette(color)) return;

    palettes.update(pals => {
      return pals.map(p => {
        if (p.id === $activePaletteId) {
          return { ...p, colors: [...p.colors, color] };
        }
        return p;
      });
    });
  }

  function close() {
    show = false;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }
</script>

{#if show}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    on:click={handleBackdropClick}
  >
    <div class="bg-white rounded p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-normal text-neutral-800">Color Variation</h2>
        <button
          on:click={close}
          class="text-neutral-500 hover:text-neutral-700 text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div class="mb-4">
        <label class="block text-xs text-neutral-600 mb-2">기본 색상</label>
        <div
          class="w-full h-16 border border-neutral-300 rounded"
          style="background-color: {oklchToCSS(baseColor)}"
        ></div>
      </div>

      <div class="mb-6">
        <label class="block text-xs text-neutral-600 mb-2">Variation 타입</label>
        <div class="flex gap-2">
          <button
            on:click={() => variationType = 'lightness'}
            class="flex-1 px-4 py-2 text-xs border transition-colors
              {variationType === 'lightness'
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-orange-400'}"
          >
            밝기 (L)
          </button>
          <button
            on:click={() => variationType = 'chroma'}
            class="flex-1 px-4 py-2 text-xs border transition-colors
              {variationType === 'chroma'
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-white text-neutral-700 border-neutral-300 hover:border-orange-400'}"
          >
            강도 (C)
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="block text-xs text-neutral-600 mb-2">생성된 Variations</label>
        <div class="grid grid-cols-8 gap-2">
          {#each variations as variation}
            <button
              on:click={() => addToPalette(variation)}
              class="relative aspect-square border cursor-pointer transition-all
                {isColorInPalette(variation)
                  ? 'border-neutral-400'
                  : 'border-neutral-300 hover:border-orange-400'}"
              style="background-color: {oklchToCSS(variation)}"
              title={oklchToCSS(variation)}
            >
              {#if isColorInPalette(variation)}
                <div class="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
                  ✓
                </div>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="text-xs text-neutral-500 text-center">
        클릭하여 팔레트에 추가
      </div>
    </div>
  </div>
{/if}

<style>
  .inset-0 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
</style>
