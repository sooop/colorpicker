<script>
  import { currentColor, palettes, activePaletteId } from '../state.js';
  import {
    contrastRatio, contrastLevels, oklchToHex, WHITE, BLACK, sameColor
  } from '../utils/colorUtils.js';
  import Icon from './Icon.svelte';

  let comparing = false;
  let compare = null; // 비교할 색 (팔레트에서 고른 색)

  $: palette = $palettes.find((p) => p.id === $activePaletteId);
  $: swatches = palette ? palette.colors.map((col) => ({ col, hex: oklchToHex(col) })) : [];

  $: rows = [
    { key: 'white', label: '흰색', bg: WHITE, hex: '#ffffff' },
    { key: 'black', label: '검정', bg: BLACK, hex: '#000000' },
    ...(compare ? [{ key: 'compare', label: '비교 색', bg: compare, hex: oklchToHex(compare) }] : [])
  ].map((r) => {
    const ratio = contrastRatio($currentColor, r.bg);
    return { ...r, ratio, ...contrastLevels(ratio) };
  });

  $: myHex = oklchToHex($currentColor);

  function pick(col) {
    compare = compare && sameColor(compare, col) ? null : { ...col };
  }

  function toggle() {
    comparing = !comparing;
  }
</script>

<div class="contrast">
  <div class="section-head">
    <h3>대비 비율</h3>
    <button
      type="button"
      class="btn btn-ghost btn-sm"
      aria-expanded={comparing}
      aria-controls="contrast-compare"
      on:click={toggle}
    >팔레트 색과 비교</button>
  </div>

  {#if comparing}
    <div class="compare-strip" id="contrast-compare" role="group" aria-label="비교할 팔레트 색">
      {#each swatches as s, i}
        <button
          type="button"
          class="mini-swatch"
          class:selected={compare && sameColor(compare, s.col)}
          style="background-color: {s.hex}"
          aria-label="색상 {i + 1} {s.hex} 와 비교"
          aria-pressed={!!compare && sameColor(compare, s.col)}
          title={s.hex}
          on:click={() => pick(s.col)}
        ></button>
      {:else}
        <span class="muted">팔레트에 색이 없습니다</span>
      {/each}
    </div>
  {/if}

  <ul class="contrast-list">
    {#each rows as r (r.key)}
      <li class="contrast-row">
        <span class="contrast-sample" style="background-color: {r.hex}; color: {myHex}" aria-hidden="true">Aa</span>
        <span class="contrast-label">
          {r.label}
          {#if r.key === 'compare'}
            <button type="button" class="icon-btn sm" aria-label="비교 해제" title="비교 해제" on:click={() => (compare = null)}>
              <Icon name="x" size={13} />
            </button>
          {/if}
        </span>
        <span class="contrast-ratio">{r.ratio.toFixed(2)}:1</span>
        <span class="contrast-badges">
          <span class="badge" class:pass={r.aa} class:fail={!r.aa} title="일반 글자 4.5:1 이상">
            <Icon name={r.aa ? 'check' : 'x'} size={11} />AA<span class="visually-hidden">{r.aa ? " 통과" : " 미달"}</span>
          </span>
          <span class="badge" class:pass={r.aaa} class:fail={!r.aaa} title="일반 글자 7:1 이상">
            <Icon name={r.aaa ? 'check' : 'x'} size={11} />AAA<span class="visually-hidden">{r.aaa ? " 통과" : " 미달"}</span>
          </span>
          <span class="badge" class:pass={r.aaLarge} class:fail={!r.aaLarge} title="큰 글자 AA 3:1 이상">
            <Icon name={r.aaLarge ? 'check' : 'x'} size={11} />큰 글자<span class="visually-hidden">{r.aaLarge ? " 통과" : " 미달"}</span>
          </span>
        </span>
      </li>
    {/each}
  </ul>
</div>
