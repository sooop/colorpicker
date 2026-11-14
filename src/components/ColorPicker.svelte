<script>
  import { onMount, onDestroy } from 'svelte';
  import { currentColor as color, settings, setColor, setHue, openVariation } from '../state.js';
  import { renderGradient, MAX_CHROMA } from '../utils/pickerRender.js';
  import ContextMenu from './ContextMenu.svelte';

  const STEP_OPTIONS = [
    { id: 'fine', label: '세밀', value: 0.005 },
    { id: 'medium', label: '보통', value: 0.02 },
    { id: 'coarse', label: '크게', value: 0.1 }
  ];
  const LOW_RES = 110;
  const MAX_RES = 640;

  let menu = null; // { x, y }
  let longPressTimer = null;

  let canvas;
  let pickerBox;
  let hueInput;
  let mounted = false;
  let isDragging = false;

  // 축 고정 (Alt)
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartL = 0;
  let dragStartC = 0;
  let axisLock = null; // null | 'L' | 'C'

  $: ({ l, c, h } = $color);
  $: stepIndex = Math.max(0, STEP_OPTIONS.findIndex((s) => s.id === $settings.keyStep));
  $: stepSize = STEP_OPTIONS[stepIndex].value;

  // 피커 위치 (c: 가로, l: 세로)
  $: pickerX = (c / MAX_CHROMA) * 100;
  $: pickerY = (1 - l) * 100;

  // ---- 캔버스 그리기 ----
  // 색조가 바뀔 때마다 rAF 로 묶어 낮은 해상도로 먼저 그리고, 멈추면 화면 해상도(DPR)로 다시 그린다.
  let rafId = 0;
  let settleTimer = 0;
  let drawnKey = '';

  function fullResolution() {
    const cssW = canvas.clientWidth || 300;
    return Math.min(MAX_RES, Math.max(150, Math.round(cssW * (window.devicePixelRatio || 1))));
  }

  function draw(size, hue) {
    if (!canvas) return;
    const key = `${size}|${hue.toFixed(2)}`;
    if (key === drawnKey) return;
    drawnKey = key;
    const ctx = canvas.getContext('2d');
    const { img, boundary } = renderGradient(ctx, size, size, hue);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    ctx.putImageData(img, 0, 0);

    // 색역 경계선
    ctx.beginPath();
    let started = false;
    for (let y = 0; y < size; y++) {
      if (boundary[y] >= 0) {
        if (!started) { ctx.moveTo(boundary[y], y); started = true; }
        else ctx.lineTo(boundary[y], y);
      }
    }
    if (started) {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = Math.max(1, size / 200);
      ctx.stroke();
    }
  }

  function requestDraw(immediate = false) {
    if (!canvas) return;
    clearTimeout(settleTimer);
    if (immediate) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      draw(fullResolution(), h);
      return;
    }
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        draw(Math.min(LOW_RES, fullResolution()), h);
      });
    }
    settleTimer = setTimeout(() => draw(fullResolution(), h), 140);
  }

  let lastHue = null;
  $: if (mounted && h !== lastHue) {
    const first = lastHue === null;
    lastHue = h;
    requestDraw(first);
  }

  let resizeObserver;
  onMount(() => {
    mounted = true;
    resizeObserver = new ResizeObserver(() => {
      drawnKey = '';
      requestDraw(true);
    });
    resizeObserver.observe(pickerBox);
    pickerBox.addEventListener('wheel', handlePickerWheel, { passive: false });
    hueInput.addEventListener('wheel', handleHueWheel, { passive: false });
  });

  onDestroy(() => {
    cancelAnimationFrame(rafId);
    clearTimeout(settleTimer);
    clearTimeout(longPressTimer);
    if (resizeObserver) resizeObserver.disconnect();
    if (pickerBox) pickerBox.removeEventListener('wheel', handlePickerWheel);
    if (hueInput) hueInput.removeEventListener('wheel', handleHueWheel);
  });

  // ---- 포인터 조작 ----
  function moveTo(clientX, clientY, altKey) {
    if (!pickerBox) return;
    const rect = pickerBox.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    let newC = (x / rect.width) * MAX_CHROMA;
    let newL = 1 - y / rect.height;

    // Alt: 축 고정
    if (altKey && isDragging) {
      if (axisLock === null) {
        const dx = Math.abs(x - dragStartX);
        const dy = Math.abs(y - dragStartY);
        if (dx > 5 || dy > 5) axisLock = dx > dy ? 'C' : 'L';
      }
      if (axisLock === 'C') newL = dragStartL;
      if (axisLock === 'L') newC = dragStartC;
    } else if (!altKey) {
      axisLock = null;
    }

    setColor({ l: newL, c: newC, h });
  }

  function cancelLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pickerBox.focus({ preventScroll: true });
    try { pickerBox.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    isDragging = true;
    const rect = pickerBox.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;
    dragStartL = l;
    dragStartC = c;
    axisLock = null;
    if (e.pointerType !== 'mouse') {
      const px = e.clientX;
      const py = e.clientY;
      cancelLongPress();
      longPressTimer = setTimeout(() => {
        longPressTimer = null;
        isDragging = false;
        menu = { x: px, y: py };
      }, 500);
    }
    moveTo(e.clientX, e.clientY, e.altKey);
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    if (longPressTimer) {
      const rect = pickerBox.getBoundingClientRect();
      const moved = Math.hypot(e.clientX - rect.left - dragStartX, e.clientY - rect.top - dragStartY);
      if (moved > 6) cancelLongPress();
    }
    moveTo(e.clientX, e.clientY, e.altKey);
  }

  function handlePointerUp() {
    isDragging = false;
    axisLock = null;
    cancelLongPress();
  }

  function handleContextMenu(e) {
    e.preventDefault();
    menu = { x: e.clientX, y: e.clientY };
  }

  // ---- 키보드 / 휠 ----
  function handleKeyDown(e) {
    let step = stepSize;
    if (e.ctrlKey) step = 0.005; // 세밀 고정
    else if (e.shiftKey) step = 0.1; // 크게 고정

    let newC = c;
    let newL = l;
    switch (e.key) {
      case 'ArrowLeft': newC = c - step * MAX_CHROMA; break;
      case 'ArrowRight': newC = c + step * MAX_CHROMA; break;
      case 'ArrowUp': newL = l + step; break;
      case 'ArrowDown': newL = l - step; break;
      default: return;
    }
    e.preventDefault();
    setColor({ l: newL, c: newC, h });
  }

  function handlePickerWheel(e) {
    e.preventDefault();
    const mult = e.shiftKey ? 10 : e.ctrlKey ? 0.1 : 1;
    let newL = l;
    let newC = c;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      newC = c + (e.deltaX > 0 ? 1 : -1) * 0.004 * mult;
    } else {
      newL = l + (e.deltaY > 0 ? -1 : 1) * 0.01 * mult;
    }
    setColor({ l: newL, c: newC, h });
  }

  function handleHueWheel(e) {
    e.preventDefault();
    setHue(h + (e.deltaY > 0 ? -1 : 1));
  }

  function handleHueInput(e) {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) setHue(v);
  }

  function handleHueNumber(e) {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) setHue(Math.max(0, Math.min(360, v)));
    e.target.value = (Number.isFinite(v) ? Math.max(0, Math.min(360, v)) : h).toFixed(1);
  }

  function setStep(id) {
    settings.update((s) => ({ ...s, keyStep: id }));
  }

  $: valueText = `명도 ${(l * 100).toFixed(1)}%, 채도 ${c.toFixed(3)}, 색상각 ${h.toFixed(1)}도`;
</script>

<section class="card picker-card" aria-label="색상 선택기">
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div
    class="picker-box"
    bind:this={pickerBox}
    on:pointerdown={handlePointerDown}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:pointercancel={handlePointerUp}
    on:contextmenu={handleContextMenu}
    on:keydown={handleKeyDown}
    tabindex="0"
    role="slider"
    aria-label="명도와 채도 선택"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={Math.round(l * 100)}
    aria-valuetext={valueText}
  >
    <canvas bind:this={canvas} width="300" height="300" aria-hidden="true"></canvas>
    <div class="picker-handle" style="left: {pickerX}%; top: {pickerY}%"></div>
  </div>

  <div class="hue-row">
    <input
      bind:this={hueInput}
      type="range"
      min="0"
      max="360"
      step="0.1"
      value={h}
      on:input={handleHueInput}
      aria-label="색상각"
      class="hue-slider"
    />
    <input
      type="number"
      min="0"
      max="360"
      step="0.1"
      value={h.toFixed(1)}
      on:change={handleHueNumber}
      aria-label="색상각 숫자 입력"
      class="num-input"
    />
  </div>

  <div class="step-row">
    <span class="field-label" title="키보드 방향키로 한 번에 움직이는 크기 (Shift: 크게, Ctrl: 세밀)">이동 단계</span>
    <div class="segmented" style="--n: 3; --i: {stepIndex}" role="radiogroup" aria-label="이동 단계">
      <span class="segmented-thumb" aria-hidden="true"></span>
      {#each STEP_OPTIONS as s}
        <button
          type="button"
          role="radio"
          aria-checked={s.id === $settings.keyStep}
          class="seg-btn"
          class:active={s.id === $settings.keyStep}
          on:click={() => setStep(s.id)}
        >{s.label}</button>
      {/each}
    </div>
    <span class="hint"><kbd>Alt</kbd> 축 고정</span>
  </div>
</section>

{#if menu}
  <ContextMenu
    x={menu.x}
    y={menu.y}
    label="색상 선택기 메뉴"
    items={[{ label: '변형·스케일 만들기', onSelect: () => openVariation($color) }]}
    on:close={() => (menu = null)}
  />
{/if}
