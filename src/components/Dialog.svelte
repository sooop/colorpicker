<script>
  import { createEventDispatcher, tick } from 'svelte';

  // <dialog> 로 포커스 트랩·배경 inert·Esc 를 처리한다. 닫을 때 직전 포커스로 돌아간다.
  export let open = false;
  export let title = '';
  export let variant = 'modal'; // 'modal' | 'drawer'
  export let focusSelector = '';
  export let wide = false;

  const dispatch = createEventDispatcher();
  const uid = 'dlg-' + Math.random().toString(36).slice(2, 8);

  let dlg;
  let closing = false;
  let downOnBackdrop = false;
  $: rendered = open || closing;
  $: sync(open);

  async function sync(o) {
    await tick();
    if (!dlg) return;
    if (o && !dlg.open) {
      closing = false;
      dlg.classList.remove('closing');
      dlg.showModal();
      await tick();
      const target = (focusSelector && dlg.querySelector(focusSelector)) || null;
      if (target) target.focus();
      dispatch('open');
    } else if (!o && dlg.open && !closing) {
      closing = true;
      dlg.classList.add('closing');
      const done = () => {
        if (!dlg) return;
        dlg.classList.remove('closing');
        if (dlg.open) dlg.close();
        closing = false;
        dispatch('closed');
      };
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(done, reduce ? 0 : 170);
    }
  }

  function requestClose() {
    open = false;
    dispatch('close');
  }

  function onCancel(e) {
    e.preventDefault();
    requestClose();
  }

  function onPointerDown(e) {
    downOnBackdrop = e.target === dlg;
  }

  function onClick(e) {
    if (e.target === dlg && downOnBackdrop) requestClose();
    downOnBackdrop = false;
  }
</script>

<dialog
  bind:this={dlg}
  class={variant === 'drawer' ? 'drawer' : 'modal'}
  class:wide
  aria-labelledby="{uid}-title"
  on:cancel={onCancel}
  on:pointerdown={onPointerDown}
  on:click={onClick}
>
  {#if rendered}
    <div class="dialog-inner">
      <div class="modal-head">
        <h2 id="{uid}-title">{title}</h2>
        <button type="button" class="icon-btn" aria-label="닫기" title="닫기" on:click={requestClose}>
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <slot {requestClose} />
    </div>
  {/if}
</dialog>
