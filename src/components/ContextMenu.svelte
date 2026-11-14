<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // items: [{ label, icon?, danger?, onSelect }]
  export let x = 0;
  export let y = 0;
  export let items = [];
  export let label = '메뉴';

  const dispatch = createEventDispatcher();

  let el;
  let left = x;
  let top = y;
  let ready = false;
  let prevFocus = null;

  onMount(() => {
    prevFocus = document.activeElement;
    // 화면 가장자리에서 잘리지 않게 위치를 보정한다
    const r = el.getBoundingClientRect();
    const margin = 8;
    left = Math.max(margin, Math.min(x, window.innerWidth - r.width - margin));
    top = y + r.height + margin > window.innerHeight ? Math.max(margin, y - r.height) : y;
    ready = true;
    const first = el.querySelector('button');
    if (first) first.focus({ preventScroll: true });
  });

  onDestroy(() => {
    if (prevFocus && document.contains(prevFocus) && prevFocus.focus) prevFocus.focus({ preventScroll: true });
  });

  function close() {
    dispatch('close');
  }

  function onKey(e) {
    const buttons = Array.from(el.querySelectorAll('button'));
    const i = buttons.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length].focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); close(); }
  }

  function onWindowPointer(e) {
    if (el && !el.contains(e.target)) close();
  }

  function select(item) {
    close();
    item.onSelect();
  }
</script>

<svelte:window on:pointerdown={onWindowPointer} on:resize={close} on:scroll|capture={close} on:blur={close} />

<div
  class="context-menu"
  class:ready
  role="menu"
  aria-label={label}
  tabindex="-1"
  bind:this={el}
  style="left: {left}px; top: {top}px"
  on:keydown={onKey}
>
  {#each items as item}
    <button type="button" role="menuitem" class:danger={item.danger} on:click={() => select(item)}>
      {#if item.icon}<span class="menu-icon">{@html item.icon}</span>{/if}
      <span>{item.label}</span>
    </button>
  {/each}
</div>
