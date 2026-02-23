<script>
  import { onMount } from 'svelte';
  import { rgb, oklch } from 'culori';
  import { isInGamut, snapToGamutC } from '../utils/colorUtils.js';

  export let color;
  export let showVariationModal;
  export let variationBaseColor;

  let contextMenu = { show: false, x: 0, y: 0 };
  let longPressTimer = null;

  let canvas;
  let pickerBox;
  let isDragging = false;

  // Axis lock state
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartL = 0;
  let dragStartC = 0;
  let axisLock = null; // null | 'L' | 'C'

  // Keyboard step size: fine=0.5%, medium=2%, coarse=10%
  let keyStep = 'medium';
  const stepSizes = { fine: 0.005, medium: 0.02, coarse: 0.1 };

  $: ({ l, c, h } = $color);

  // 피커 위치 계산 (c: 가로, l: 세로)
  $: pickerX = (c / 0.4) * 100;
  $: pickerY = (1 - l) * 100;

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

    // Track first out-of-gamut x per row for boundary line
    const boundaryX = new Float32Array(height).fill(-1);

    for (let y = 0; y < height; y++) {
      const lightness = 1 - (y / height);
      let hitBoundary = false;

      for (let x = 0; x < width; x++) {
        const chroma = (x / width) * 0.4;
        const raw = rgb(oklch({ l: lightness, c: chroma, h }));
        const index = (y * width + x) * 4;

        if (raw) {
          if (!hitBoundary && isInGamut(raw)) {
            data[index]     = Math.round(raw.r * 255);
            data[index + 1] = Math.round(raw.g * 255);
            data[index + 2] = Math.round(raw.b * 255);
            data[index + 3] = 255;
          } else {
            if (!hitBoundary) {
              hitBoundary = true;
              boundaryX[y] = x;
            }
            // Out-of-gamut: clamp for display
            data[index]     = Math.round(Math.max(0, Math.min(1, raw.r)) * 255);
            data[index + 1] = Math.round(Math.max(0, Math.min(1, raw.g)) * 255);
            data[index + 2] = Math.round(Math.max(0, Math.min(1, raw.b)) * 255);
            data[index + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw gamut boundary line
    ctx.beginPath();
    let started = false;
    for (let y = 0; y < height; y++) {
      if (boundaryX[y] >= 0) {
        if (!started) {
          ctx.moveTo(boundaryX[y], y);
          started = true;
        } else {
          ctx.lineTo(boundaryX[y], y);
        }
      }
    }
    if (started) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function handlePickerMove(event) {
    if (!pickerBox) return;

    const rect = pickerBox.getBoundingClientRect();
    const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

    let newC = (x / rect.width) * 0.4;
    let newL = 1 - (y / rect.height);

    // Alt key: axis lock
    if (event.altKey && isDragging) {
      if (axisLock === null) {
        const dx = Math.abs(x - dragStartX);
        const dy = Math.abs(y - dragStartY);
        if (dx > 5 || dy > 5) {
          axisLock = dx > dy ? 'C' : 'L';
        }
      }
      if (axisLock === 'C') newL = dragStartL;
      if (axisLock === 'L') newC = dragStartC;
    } else if (!event.altKey) {
      axisLock = null;
    }

    // Snap to gamut boundary
    const raw = rgb(oklch({ l: newL, c: newC, h }));
    if (!raw || !isInGamut(raw)) {
      newC = snapToGamutC(newL, newC, h);
    }

    color.set({ l: newL, c: newC, h });
  }

  function handleMouseDown(event) {
    isDragging = true;
    const rect = pickerBox.getBoundingClientRect();
    dragStartX = event.clientX - rect.left;
    dragStartY = event.clientY - rect.top;
    dragStartL = l;
    dragStartC = c;
    axisLock = null;
    handlePickerMove(event);
  }

  function handleMouseMove(event) {
    if (isDragging) {
      handlePickerMove(event);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    axisLock = null;
  }

  function handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];

    handleLongPress(event);

    isDragging = true;
    const rect = pickerBox.getBoundingClientRect();
    dragStartX = touch.clientX - rect.left;
    dragStartY = touch.clientY - rect.top;
    dragStartL = l;
    dragStartC = c;
    axisLock = null;
    handlePickerMove({ clientX: touch.clientX, clientY: touch.clientY });
  }

  function handleTouchMove(event) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (isDragging) {
      event.preventDefault();
      const touch = event.touches[0];
      handlePickerMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
  }

  function handleTouchEnd() {
    isDragging = false;
    axisLock = null;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handleLongPress(event) {
    const touch = event.touches[0];
    longPressTimer = setTimeout(() => {
      contextMenu = {
        show: true,
        x: touch.clientX,
        y: touch.clientY
      };
      longPressTimer = null;
    }, 500);
  }

  function handleKeyDown(event) {
    let percentage;
    if (event.ctrlKey) {
      percentage = 0.005; // fine override
    } else if (event.shiftKey) {
      percentage = 0.1; // coarse override
    } else {
      percentage = stepSizes[keyStep];
    }

    const stepL = percentage;
    const stepC = percentage * 0.4;

    let newC = c;
    let newL = l;

    switch (event.key) {
      case 'ArrowLeft':
        newC = Math.max(0, c - stepC);
        break;
      case 'ArrowRight':
        newC = Math.min(0.4, c + stepC);
        break;
      case 'ArrowUp':
        newL = Math.min(1, l + stepL);
        break;
      case 'ArrowDown':
        newL = Math.max(0, l - stepL);
        break;
      default:
        return;
    }

    event.preventDefault();

    // Snap to gamut
    const raw = rgb(oklch({ l: newL, c: newC, h }));
    if (!raw || !isInGamut(raw)) {
      newC = snapToGamutC(newL, newC, h);
    }

    color.set({ l: newL, c: newC, h });
  }

  function handlePickerWheel(event) {
    event.preventDefault();
    const mult = event.shiftKey ? 10 : event.ctrlKey ? 0.1 : 1;
    const stepL = 0.01 * mult;
    const stepC = 0.004 * mult;

    let newL = l;
    let newC = c;

    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      // Horizontal scroll → C
      newC = Math.max(0, Math.min(0.4, c + (event.deltaX > 0 ? 1 : -1) * stepC));
    } else {
      // Vertical scroll → L
      newL = Math.max(0, Math.min(1, l + (event.deltaY > 0 ? -1 : 1) * stepL));
    }

    // Snap to gamut
    const raw = rgb(oklch({ l: newL, c: newC, h }));
    if (!raw || !isInGamut(raw)) {
      newC = snapToGamutC(newL, newC, h);
    }

    color.set({ l: newL, c: newC, h });
  }

  function handleHueChange(event) {
    const newH = parseFloat(event.target.value);
    color.set({ l, c, h: newH });
  }

  function handleHueWheel(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -1 : 1;
    const newH = ((h + delta) % 360 + 360) % 360;
    color.set({ l, c, h: newH });
  }

  function handleHueNumberInput(event) {
    const val = parseFloat(event.target.value);
    if (!isNaN(val)) {
      const newH = Math.max(0, Math.min(360, val));
      color.set({ l, c, h: newH });
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
    contextMenu = {
      show: true,
      x: event.clientX,
      y: event.clientY
    };
  }

  function closeContextMenu() {
    contextMenu = { show: false, x: 0, y: 0 };
  }

  function openVariationModal() {
    variationBaseColor.set($color);
    showVariationModal.set(true);
    closeContextMenu();
  }

  function handleClickOutside(event) {
    if (contextMenu.show && !event.target.closest('.context-menu')) {
      closeContextMenu();
    }
  }
</script>

<svelte:window
  on:mousemove={handleMouseMove}
  on:mouseup={handleMouseUp}
  on:touchmove={handleTouchMove}
  on:touchend={handleTouchEnd}
  on:click={handleClickOutside}
/>

<div class="flex flex-col gap-3">
  <div
    class="relative w-full aspect-square cursor-crosshair border border-neutral-300 focus:border-neutral-900 outline-none overflow-hidden"
    bind:this={pickerBox}
    on:mousedown={handleMouseDown}
    on:touchstart={handleTouchStart}
    on:contextmenu={handleContextMenu}
    on:keydown={handleKeyDown}
    on:wheel={handlePickerWheel}
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

  <!-- Hue slider + number input -->
  <div class="flex items-center gap-2 w-full">
    <input
      type="range"
      min="0"
      max="360"
      step="0.1"
      value={h}
      on:input={handleHueChange}
      on:wheel={handleHueWheel}
      aria-label="색상 각도"
      class="hue-slider flex-1 h-6 cursor-pointer"
    />
    <input
      type="number"
      min="0"
      max="360"
      step="0.1"
      value={h.toFixed(1)}
      on:change={handleHueNumberInput}
      aria-label="색상 각도 숫자 입력"
      class="w-16 text-xs text-center border border-neutral-300 outline-none px-1 py-1 focus:border-neutral-900"
    />
  </div>

  <!-- Keyboard step size -->
  <div class="flex items-center gap-2 text-xs text-neutral-500">
    <span>Step</span>
    <div class="flex gap-1">
      {#each ['fine', 'medium', 'coarse'] as s}
        <button
          class="px-2 py-0.5 border text-xs transition-colors {keyStep === s ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 hover:bg-neutral-100'}"
          on:click={() => keyStep = s}
        >{s}</button>
      {/each}
    </div>
    <span class="text-neutral-400">(Alt=axis lock)</span>
  </div>
</div>

{#if contextMenu.show}
  <div
    class="context-menu fixed bg-white border border-neutral-300 shadow-sm z-50 overflow-hidden"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
  >
    <button
      on:click={openVariationModal}
      class="block w-full px-4 py-2 text-xs text-left hover:bg-neutral-100 transition-colors"
    >
      Variation 생성
    </button>
  </div>
{/if}

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
