<script>
  import { onMount, afterUpdate, onDestroy, tick } from 'svelte';
  import {
    palettes, activePaletteId, selectedColorIndex,
    setColor, switchPalette, addColors, nextPaletteId, openVariation, currentColor
  } from '../state.js';
  import { oklchToHex, oklchToCSS } from '../utils/colorUtils.js';
  import { showToast } from './Toast.svelte';
  import ContextMenu from './ContextMenu.svelte';
  import Icon from './Icon.svelte';

  let menu = null; // { x, y, type: 'color' | 'palette', paletteId, index }
  let editingId = null;
  let editingName = '';
  let tablist;
  let thumbEl;
  let gridEl;
  let thumbReady = false;
  let longPressTimer = null;

  $: activePalette = $palettes.find((p) => p.id === $activePaletteId);
  $: swatches = activePalette
    ? activePalette.colors.map((col, i) => ({ col, hex: oklchToHex(col), css: oklchToCSS(col), i }))
    : [];

  // ---- 탭 표시 막대 위치 ----
  function updateThumb() {
    if (!tablist || !thumbEl) return;
    const active = tablist.querySelector('.pal-tab.active');
    if (!active) { thumbEl.style.opacity = '0'; return; }
    thumbEl.style.opacity = '1';
    thumbEl.style.width = active.offsetWidth + 'px';
    thumbEl.style.height = active.offsetHeight + 'px';
    thumbEl.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    if (!thumbReady) requestAnimationFrame(() => (thumbReady = true));
  }

  let ro;
  onMount(() => {
    updateThumb();
    ro = new ResizeObserver(updateThumb);
    ro.observe(tablist);
  });
  afterUpdate(updateThumb);
  onDestroy(() => { if (ro) ro.disconnect(); clearTimeout(longPressTimer); });

  // ---- 탭 ----
  function onTabKey(e, id) {
    const ids = $palettes.map((p) => p.id);
    const i = ids.indexOf(id);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + ids.length) % ids.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ids.length - 1;
    else if (e.key === 'F2') { e.preventDefault(); startRename(id); return; }
    else return;
    e.preventDefault();
    switchPalette(ids[next]);
    tick().then(() => tablist.querySelector('.pal-tab.active button')?.focus());
  }

  function addNewPalette() {
    const id = nextPaletteId($palettes);
    palettes.update((pals) => [...pals, { id, name: `팔레트 ${id}`, colors: [] }]);
    switchPalette(id);
  }

  // ---- 이름 변경 ----
  function startRename(id) {
    const p = $palettes.find((x) => x.id === id);
    if (!p) return;
    editingId = id;
    editingName = p.name;
  }

  function focusSelect(node) {
    node.focus();
    node.select();
  }

  function commitRename() {
    if (editingId === null) return;
    const name = editingName.trim().slice(0, 40);
    const id = editingId;
    editingId = null;
    if (!name) return;
    palettes.update((pals) => pals.map((p) => (p.id === id ? { ...p, name } : p)));
    tick().then(() => tablist.querySelector('.pal-tab.active button')?.focus());
  }

  function onRenameKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
    else if (e.key === 'Escape') { e.preventDefault(); editingId = null; tick().then(() => tablist.querySelector('.pal-tab.active button')?.focus()); }
  }

  // ---- 메뉴 / 길게 누르기 ----
  function openMenu(x, y, type, paletteId, index = null) {
    menu = { x, y, type, paletteId, index };
  }

  function startLongPress(e, type, paletteId, index) {
    if (e.pointerType === 'mouse') return;
    const x = e.clientX;
    const y = e.clientY;
    cancelLongPress();
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      drag = null;
      openMenu(x, y, type, paletteId, index);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  }

  function menuItems(m) {
    if (!m) return [];
    if (m.type === 'color') {
      return [
        { label: '변형·스케일 만들기', onSelect: () => { const c = currentPalette(m.paletteId)?.colors[m.index]; if (c) openVariation(c); } },
        { label: '삭제', danger: true, onSelect: () => removeColor(m.paletteId, m.index) }
      ];
    }
    return [
      { label: '이름 변경', onSelect: () => { switchPalette(m.paletteId); startRename(m.paletteId); } },
      { label: '팔레트 삭제', danger: true, onSelect: () => removePalette(m.paletteId) }
    ];
  }

  const currentPalette = (id) => $palettes.find((p) => p.id === id);

  // ---- 삭제 (되돌리기 제공) ----
  function removeColor(paletteId, index) {
    const pal = currentPalette(paletteId);
    if (!pal || !pal.colors[index]) return;
    const color = pal.colors[index];
    const prevSel = $selectedColorIndex;
    const wasActive = $activePaletteId === paletteId;
    palettes.update((pals) => pals.map((p) => (p.id === paletteId ? { ...p, colors: p.colors.filter((_, i) => i !== index) } : p)));
    if (wasActive) {
      if (prevSel === index) selectedColorIndex.set(-1);
      else if (prevSel > index) selectedColorIndex.set(prevSel - 1);
    }
    showToast('색을 삭제했습니다', {
      type: 'info',
      action: {
        label: '되돌리기',
        onClick: () => {
          palettes.update((pals) => pals.map((p) => {
            if (p.id !== paletteId) return p;
            const next = [...p.colors];
            next.splice(Math.min(index, next.length), 0, color);
            return { ...p, colors: next };
          }));
          if (wasActive && $activePaletteId === paletteId) selectedColorIndex.set(prevSel);
        }
      }
    });
  }

  function removePalette(paletteId) {
    if ($palettes.length <= 1) {
      showToast('마지막 팔레트는 삭제할 수 없습니다', { type: 'error' });
      return;
    }
    const index = $palettes.findIndex((p) => p.id === paletteId);
    const pal = $palettes[index];
    if (!pal) return;
    const wasActive = $activePaletteId === paletteId;
    const prevSel = $selectedColorIndex;
    const remaining = $palettes.filter((p) => p.id !== paletteId);
    palettes.set(remaining);
    if (wasActive) {
      activePaletteId.set(remaining[Math.min(index, remaining.length - 1)].id);
      selectedColorIndex.set(-1);
    }
    showToast(`'${pal.name}' 팔레트를 삭제했습니다`, {
      type: 'info',
      action: {
        label: '되돌리기',
        onClick: () => {
          palettes.update((pals) => {
            const next = [...pals];
            next.splice(Math.min(index, next.length), 0, pal);
            return next;
          });
          if (wasActive) {
            activePaletteId.set(pal.id);
            selectedColorIndex.set(prevSel);
          }
        }
      }
    });
  }

  // ---- 색 선택 ----
  function selectColor(col, index) {
    setColor(col);
    selectedColorIndex.set(index);
  }

  // ---- 재정렬 (포인터 이벤트: 마우스·터치 공통) ----
  let drag = null; // { index, startX, startY, active, dx, dy, over, rects }
  let suppressClick = false;

  function onSwatchDown(e, index) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag = { index, startX: e.clientX, startY: e.clientY, active: false, dx: 0, dy: 0, over: index, rects: null };
    startLongPress(e, 'color', activePalette.id, index);
  }

  function onSwatchMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < 7) return;
      cancelLongPress();
      drag.active = true;
      drag.rects = Array.from(gridEl.querySelectorAll('[data-i]')).map((el) => {
        const r = el.getBoundingClientRect();
        return { i: +el.dataset.i, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
    }
    let best = drag.index;
    let bestD = Infinity;
    for (const r of drag.rects) {
      const d = Math.hypot(e.clientX - r.cx, e.clientY - r.cy);
      if (d < bestD) { bestD = d; best = r.i; }
    }
    drag.dx = dx;
    drag.dy = dy;
    drag.over = best;
    drag = drag;
  }

  function onSwatchUp() {
    cancelLongPress();
    if (!drag) return;
    const { active, index, over } = drag;
    drag = null;
    if (active) {
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      if (over !== index) moveColor(index, over);
    }
  }

  function moveColor(from, to) {
    const id = $activePaletteId;
    const sel = $selectedColorIndex;
    palettes.update((pals) => pals.map((p) => {
      if (p.id !== id) return p;
      const next = [...p.colors];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...p, colors: next };
    }));
    if (sel === from) selectedColorIndex.set(to);
    else if (sel >= 0) {
      if (from < sel && to >= sel) selectedColorIndex.set(sel - 1);
      else if (from > sel && to <= sel) selectedColorIndex.set(sel + 1);
    }
  }

  function onSwatchClick(col, index) {
    if (suppressClick) return;
    selectColor(col, index);
  }

  async function onSwatchKey(e, index) {
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const to = index + (e.key === 'ArrowRight' ? 1 : -1);
      if (to < 0 || to >= activePalette.colors.length) return;
      moveColor(index, to);
      await tick();
      gridEl.querySelector(`[data-i="${to}"]`)?.focus();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeColor(activePalette.id, index);
    }
  }

  function addCurrent() {
    if (!activePalette) return;
    addColors(activePalette.id, [$currentColor], { dedupe: false });
  }
</script>

<section class="card palette-card" aria-label="팔레트">
  <div class="palette-head">
    <div class="pal-tabs" role="tablist" aria-label="팔레트 목록" bind:this={tablist}>
      <span class="pal-thumb" class:ready={thumbReady} bind:this={thumbEl} aria-hidden="true"></span>
      {#each $palettes as palette (palette.id)}
        <div class="pal-tab" class:active={palette.id === $activePaletteId}>
          {#if editingId === palette.id}
            <input
              type="text"
              class="rename-input"
              bind:value={editingName}
              use:focusSelect
              on:keydown={onRenameKey}
              on:blur={commitRename}
              maxlength="40"
              aria-label="팔레트 이름"
            />
          {:else}
            <button
              type="button"
              role="tab"
              aria-selected={palette.id === $activePaletteId}
              tabindex={palette.id === $activePaletteId ? 0 : -1}
              on:click={() => switchPalette(palette.id)}
              on:dblclick={() => startRename(palette.id)}
              on:contextmenu|preventDefault={(e) => openMenu(e.clientX, e.clientY, 'palette', palette.id)}
              on:pointerdown={(e) => startLongPress(e, 'palette', palette.id, null)}
              on:pointerup={cancelLongPress}
              on:pointercancel={cancelLongPress}
              on:pointermove={cancelLongPress}
              on:keydown={(e) => onTabKey(e, palette.id)}
              title="더블클릭 또는 길게 눌러 이름 변경·삭제"
            >
              <span class="pal-name">{palette.name}</span>
              <span class="tab-badge">{palette.colors.length}</span>
            </button>
          {/if}
        </div>
      {/each}
    </div>
    <button type="button" class="btn btn-sm" on:click={addNewPalette}>
      <Icon name="plus" size={14} />새 팔레트
    </button>
  </div>

  {#if activePalette}
    <div class="swatch-grid" bind:this={gridEl} role="group" aria-label="{activePalette.name} 색상">
      {#each swatches as s (s.i)}
        <button
          type="button"
          data-i={s.i}
          class="swatch"
          class:selected={s.i === $selectedColorIndex}
          class:dragging={drag && drag.active && drag.index === s.i}
          class:drop-target={drag && drag.active && drag.over === s.i && drag.index !== s.i}
          style="background-color: {s.hex};{drag && drag.active && drag.index === s.i ? ` transform: translate(${drag.dx}px, ${drag.dy}px) scale(1.08);` : ''}"
          aria-label="색상 {s.i + 1}, {s.hex}{s.i === $selectedColorIndex ? ', 선택됨' : ''}"
          aria-current={s.i === $selectedColorIndex}
          title="{s.hex} · {s.css}"
          on:pointerdown={(e) => onSwatchDown(e, s.i)}
          on:pointermove={onSwatchMove}
          on:pointerup={onSwatchUp}
          on:pointercancel={onSwatchUp}
          on:click={() => onSwatchClick(s.col, s.i)}
          on:contextmenu|preventDefault={(e) => openMenu(e.clientX, e.clientY, 'color', activePalette.id, s.i)}
          on:keydown={(e) => onSwatchKey(e, s.i)}
        ></button>
      {/each}
      <button type="button" class="swatch swatch-add" aria-label="현재 색 추가" title="현재 색 추가" on:click={addCurrent}>
        <Icon name="plus" />
      </button>
    </div>
  {/if}
</section>

{#if menu}
  <ContextMenu
    x={menu.x}
    y={menu.y}
    label={menu.type === 'color' ? '색상 메뉴' : '팔레트 메뉴'}
    items={menuItems(menu)}
    on:close={() => (menu = null)}
  />
{/if}
