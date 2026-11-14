<script>
  import { onDestroy } from 'svelte';
  import {
    currentColor, palettes, activePaletteId, selectedColorIndex, settings,
    setColor, setHue, addColors, openVariation, imageRequest
  } from '../state.js';
  import {
    oklchToCSS, oklchToHex, oklchToRgbString, oklchToHsl, oklchToHsvString,
    parseColorToOklch, bestTextColor, MAX_C
  } from '../utils/colorUtils.js';
  import { copyWithToast } from '../utils/clipboard.js';
  import { showToast } from './Toast.svelte';
  import { IMAGE_ACCEPT, matchesFile } from '../utils/files.js';
  import ContextMenu from './ContextMenu.svelte';
  import Contrast from './Contrast.svelte';
  import Icon from './Icon.svelte';

  const MODES = [
    { id: 'oklch', label: 'OKLCH' },
    { id: 'hex', label: 'HEX' },
    { id: 'rgb', label: 'RGB' },
    { id: 'hsl', label: 'HSL' },
    { id: 'hsv', label: 'HSV' }
  ];
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  let menu = null;
  let longPressTimer = null;
  let fileInput;

  $: colorMode = $settings.colorMode;
  $: cur = $currentColor;
  $: hexValue = oklchToHex(cur);
  $: rgbValue = oklchToRgbString(cur);
  $: textColor = bestTextColor(cur);
  $: activePalette = $palettes.find((p) => p.id === $activePaletteId);

  function format(mode, c) {
    switch (mode) {
      case 'hex': return oklchToHex(c);
      case 'rgb': return oklchToRgbString(c);
      case 'hsl': return oklchToHsl(c);
      case 'hsv': return oklchToHsvString(c);
      default: return oklchToCSS(c);
    }
  }

  // ---- 텍스트 입력 ----
  let editing = false;
  let text = '';
  let invalid = false;
  let shake = false;
  $: formatted = format(colorMode, cur);
  $: if (!editing) text = formatted;

  function onTextInput() {
    editing = true;
    invalid = false;
  }

  function commitText() {
    const parsed = parseColorToOklch(text);
    if (!parsed) {
      if (text.trim()) fail();
      return;
    }
    invalid = false;
    editing = false;
    const snapped = setColor(parsed);
    if (Math.abs(snapped.c - parsed.c) > 0.002) {
      showToast('sRGB 색역 밖의 색이라 가장 가까운 색으로 조정했습니다', { type: 'info' });
    }
  }

  function fail() {
    invalid = true;
    shake = false;
    requestAnimationFrame(() => (shake = true));
    setTimeout(() => (shake = false), 360);
  }

  function onTextBlur() {
    editing = false;
    if (!invalid) text = formatted;
  }

  function onTextKey(e) {
    if (e.key === 'Escape') {
      invalid = false;
      editing = false;
      text = formatted;
    }
  }

  function setMode(e) {
    const mode = e.target.value;
    settings.update((s) => ({ ...s, colorMode: mode }));
    invalid = false;
    editing = false;
  }

  // ---- 복사 ----
  let copied = false;
  let copiedTimer;
  async function copyColor() {
    const ok = await copyWithToast(formatted, '색상을 복사했습니다');
    if (ok) {
      copied = true;
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => (copied = false), 1300);
    }
  }
  onDestroy(() => { clearTimeout(copiedTimer); clearTimeout(longPressTimer); });

  // ---- 숫자 입력 (타이핑 중에는 값을 다시 포맷하지 않는다) ----
  let draft = { l: null, c: null, h: null };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function applyField(key, v) {
    if (key === 'l') setColor({ ...cur, l: clamp(v, 0, 1) });
    else if (key === 'c') setColor({ ...cur, c: clamp(v, 0, MAX_C) });
    else setHue(clamp(v, 0, 360));
  }

  function onNumberInput(key, e) {
    draft[key] = e.target.value;
    draft = draft;
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) applyField(key, v);
  }

  function onNumberBlur(key) {
    draft[key] = null;
    draft = draft;
  }

  function onRange(key, e) {
    draft[key] = null;
    applyField(key, parseFloat(e.target.value));
  }

  $: fields = [
    { key: 'l', label: 'L (밝기)', value: cur.l, text: cur.l.toFixed(3), min: 0, max: 1, step: 0.01 },
    { key: 'c', label: 'C (강도)', value: cur.c, text: cur.c.toFixed(3), min: 0, max: MAX_C, step: 0.01 },
    { key: 'h', label: 'H (각도)', value: cur.h, text: cur.h.toFixed(1), min: 0, max: 360, step: 1 }
  ];

  // ---- 팔레트 ----
  function addToPalette() {
    if (!activePalette) return;
    const { added } = addColors(activePalette.id, [cur], { dedupe: false });
    if (added) showToast('팔레트에 추가했습니다');
  }

  function updatePaletteColor() {
    const idx = $selectedColorIndex;
    if (!activePalette || idx < 0 || idx >= activePalette.colors.length) return;
    palettes.update((pals) => pals.map((p) => {
      if (p.id !== activePalette.id) return p;
      const next = [...p.colors];
      next[idx] = { ...cur };
      return { ...p, colors: next };
    }));
    showToast('선택한 색을 업데이트했습니다');
  }

  // ---- 스포이트 / 이미지 ----
  async function eyedrop() {
    try {
      const result = await new window.EyeDropper().open();
      const parsed = parseColorToOklch(result.sRGBHex);
      if (parsed) setColor(parsed);
    } catch (e) {
      if (e && e.name !== 'AbortError') showToast('화면에서 색을 추출하지 못했습니다', { type: 'error' });
    }
  }

  function onImageFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!matchesFile(file, IMAGE_ACCEPT)) {
      showToast('이미지 파일(PNG, JPG, GIF, WebP 등)만 열 수 있습니다', { type: 'error' });
      return;
    }
    imageRequest.set(file);
  }

  // ---- 컨텍스트 메뉴 / 길게 누르기 ----
  function openMenu(x, y) {
    menu = { x, y };
  }

  function onContextMenu(e) {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  }

  function onWellDown(e) {
    if (e.pointerType === 'mouse') return;
    const x = e.clientX;
    const y = e.clientY;
    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => { longPressTimer = null; openMenu(x, y); }, 500);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
</script>

<section class="card info-card" aria-label="현재 색상">
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="color-well"
    style="background-color: {hexValue}"
    on:contextmenu={onContextMenu}
    on:pointerdown={onWellDown}
    on:pointerup={cancelLongPress}
    on:pointercancel={cancelLongPress}
    on:pointermove={cancelLongPress}
  >
    <div class="well-codes">
      <button type="button" class="well-code" style="color: {textColor}" title="HEX 복사" on:click={() => copyWithToast(hexValue, 'HEX 값을 복사했습니다')}>{hexValue}</button>
      <button type="button" class="well-code" style="color: {textColor}" title="RGB 복사" on:click={() => copyWithToast(rgbValue, 'RGB 값을 복사했습니다')}>{rgbValue}</button>
    </div>
  </div>

  <div class="input-row">
    <select class="select" value={colorMode} on:change={setMode} aria-label="표기 형식">
      {#each MODES as m}
        <option value={m.id}>{m.label}</option>
      {/each}
    </select>
    <div class="text-field" class:invalid class:shake>
      <input
        type="text"
        bind:value={text}
        on:input={onTextInput}
        on:change={commitText}
        on:blur={onTextBlur}
        on:keydown={onTextKey}
        placeholder="색상 코드"
        aria-label="색상 코드"
        aria-invalid={invalid}
        aria-describedby={invalid ? 'color-error' : undefined}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
      />
    </div>
    <button type="button" class="icon-btn copy-btn" class:copied aria-label="색상 복사" title="색상 복사" on:click={copyColor}>
      <span class="icon-copy"><Icon name="copy" /></span>
      <span class="icon-done"><Icon name="check" /></span>
    </button>
    {#if hasEyeDropper}
      <button type="button" class="icon-btn" aria-label="화면에서 색 추출" title="화면에서 색 추출" on:click={eyedrop}>
        <Icon name="eyedrop" />
      </button>
    {/if}
    <button type="button" class="icon-btn" aria-label="이미지에서 색 추출" title="이미지에서 색 추출 (파일을 놓거나 붙여넣어도 됩니다)" on:click={() => fileInput.click()}>
      <Icon name="image" />
    </button>
    <input type="file" accept="image/*" class="visually-hidden" tabindex="-1" bind:this={fileInput} on:change={onImageFile} />
  </div>
  {#if invalid}
    <p class="field-error" id="color-error" role="alert">인식할 수 없는 색상입니다. HEX, rgb(), hsl(), oklch() 형식으로 입력하세요.</p>
  {/if}

  <div class="channels">
    {#each fields as f (f.key)}
      <div class="channel">
        <div class="channel-head">
          <label for="num-{f.key}">{f.label}</label>
          <input
            id="num-{f.key}"
            type="number"
            class="num-input"
            value={draft[f.key] ?? f.text}
            on:input={(e) => onNumberInput(f.key, e)}
            on:blur={() => onNumberBlur(f.key)}
            step={f.key === 'h' ? 1 : 0.01}
            min={f.min}
            max={f.max}
            inputmode="decimal"
          />
        </div>
        <input
          type="range"
          class="slider"
          min={f.min}
          max={f.max}
          step={f.step}
          value={f.value}
          on:input={(e) => onRange(f.key, e)}
          aria-label={f.label}
        />
      </div>
    {/each}
  </div>

  <Contrast />

  <div class="action-row">
    <button type="button" class="btn btn-primary" on:click={addToPalette}>
      <Icon name="plus" />팔레트에 추가
    </button>
    <button type="button" class="btn" disabled={$selectedColorIndex < 0} on:click={updatePaletteColor}>업데이트</button>
    <button type="button" class="btn" on:click={() => openVariation(cur)}>
      <Icon name="layers" />변형·스케일
    </button>
  </div>
</section>

{#if menu}
  <ContextMenu
    x={menu.x}
    y={menu.y}
    label="현재 색상 메뉴"
    items={[
      { label: '변형·스케일 만들기', onSelect: () => openVariation(cur) },
      { label: 'HEX 복사', onSelect: () => copyWithToast(hexValue, 'HEX 값을 복사했습니다') }
    ]}
    on:close={() => (menu = null)}
  />
{/if}
