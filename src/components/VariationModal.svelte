<script>
  import { variationModal, palettes, activePaletteId, addColors } from '../state.js';
  import {
    oklchToCSS, oklchToHex, sameColor, generateVariations, generateScale
  } from '../utils/colorUtils.js';
  import { showToast } from './Toast.svelte';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  const MODES = [
    { id: 'lightness', label: '밝기 (L)' },
    { id: 'chroma', label: '강도 (C)' },
    { id: 'hue', label: '색상각 (H)' },
    { id: 'scale', label: '스케일' }
  ];

  let mode = 'lightness';
  let anchor = true;

  $: open = $variationModal.open;
  $: base = $variationModal.base;
  $: modeIndex = MODES.findIndex((m) => m.id === mode);
  $: activePalette = $palettes.find((p) => p.id === $activePaletteId);

  // 모달이 열려 있는 동안만 계산한다
  $: items = !open
    ? []
    : mode === 'scale'
      ? generateScale(base, anchor).map((s) => ({ ...s, label: String(s.step) }))
      : generateVariations(base, mode).map((color, i) => ({ color, label: String(i + 1) }));
  $: tiles = items.map((it) => ({ ...it, hex: oklchToHex(it.color), css: oklchToCSS(it.color) }));
  $: baseHex = oklchToHex(base);

  function inPalette(color) {
    return !!activePalette && activePalette.colors.some((c) => sameColor(c, color));
  }

  // palettes 가 바뀌면 중복 표시를 다시 계산한다
  $: marks = tiles.map((t) => !!activePalette && activePalette.colors.some((c) => sameColor(c, t.color)));
  $: newCount = marks.filter((m) => !m).length;

  function addOne(tile, i) {
    if (marks[i]) {
      showToast('이미 팔레트에 있는 색입니다', { type: 'info' });
      return;
    }
    addColors($activePaletteId, [tile.color]);
    showToast('팔레트에 추가했습니다');
  }

  function addAll() {
    const { added, dup } = addColors($activePaletteId, tiles.map((t) => t.color));
    showToast(dup ? `${added}개 추가, ${dup}개는 이미 있어 건너뜀` : `${added}개를 팔레트에 추가했습니다`);
  }

  function onClose() {
    variationModal.update((v) => ({ ...v, open: false }));
  }

  function onModeKey(e) {
    let next = modeIndex;
    if (e.key === 'ArrowRight') next = (modeIndex + 1) % MODES.length;
    else if (e.key === 'ArrowLeft') next = (modeIndex - 1 + MODES.length) % MODES.length;
    else return;
    e.preventDefault();
    mode = MODES[next].id;
    e.currentTarget.parentElement.querySelectorAll('button')[next].focus();
  }
</script>

<Dialog {open} title="변형·스케일" wide on:close={onClose} focusSelector=".seg-btn.active">
  <div class="modal-body">
    <div class="variation-base">
      <span class="base-swatch" style="background-color: {baseHex}" aria-hidden="true"></span>
      <div class="base-meta">
        <span class="field-label">기준 색상</span>
        <span class="mono">{oklchToCSS(base)}</span>
      </div>
    </div>

    <div class="segmented seg-wide" style="--n: 4; --i: {modeIndex}" role="tablist" aria-label="생성 방식">
      <span class="segmented-thumb" aria-hidden="true"></span>
      {#each MODES as m}
        <button
          type="button"
          role="tab"
          aria-selected={m.id === mode}
          tabindex={m.id === mode ? 0 : -1}
          class="seg-btn"
          class:active={m.id === mode}
          on:click={() => (mode = m.id)}
          on:keydown={onModeKey}
        >{m.label}</button>
      {/each}
    </div>

    {#key mode}
      <div class="variation-grid" class:scale={mode === 'scale'} role="group" aria-label="생성된 색">
        {#each tiles as t, i (i)}
          <button
            type="button"
            class="variation-item"
            class:exists={marks[i]}
            style="--i: {i}"
            aria-label="{mode === 'scale' ? t.label + ' ' : ''}{t.hex}, {marks[i] ? '이미 팔레트에 있음' : '팔레트에 추가'}"
            title="{t.css} · {t.hex}"
            on:click={() => addOne(t, i)}
          >
            <span class="variation-swatch" style="background-color: {t.hex}">
              {#if marks[i]}<span class="exists-mark"><Icon name="check" size={16} /></span>{/if}
            </span>
            {#if mode === 'scale'}
              <span class="scale-label">{t.label}{t.anchor ? ' · 현재' : ''}</span>
              <span class="scale-hex">{t.hex}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/key}

    <div class="modal-foot">
      {#if mode === 'scale'}
        <label class="switch">
          <input type="checkbox" bind:checked={anchor} />
          <span class="switch-track"></span>
          <span class="switch-label">현재 색을 단계에 포함</span>
        </label>
      {/if}
      <span class="spacer"></span>
      <span class="foot-meta">{activePalette ? '추가 대상 ' + activePalette.name : ''}</span>
      {#if mode === 'scale'}
        <button type="button" class="btn btn-primary" disabled={newCount === 0} on:click={addAll}>
          <Icon name="plus" />팔레트에 모두 추가
        </button>
      {/if}
    </div>
  </div>
</Dialog>
