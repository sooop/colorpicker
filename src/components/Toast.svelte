<script context="module">
  import { writable } from 'svelte/store';

  export const toasts = writable([]);

  let seq = 0;
  const timers = new Map();

  function remove(id) {
    toasts.update((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => toasts.update((list) => list.filter((t) => t.id !== id)), 220);
  }

  export function dismissToast(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    remove(id);
  }

  // options: { type: 'success' | 'error' | 'info', duration, action: { label, onClick } }
  export function showToast(message, options = {}) {
    const { type = 'success', duration = 2200, action = null } = options;
    const id = ++seq;
    toasts.update((list) => {
      // 같은 문구가 이미 떠 있으면 교체
      const kept = list.filter((t) => {
        if (t.message === message && !t.action) { clearTimeout(timers.get(t.id)); return false; }
        return true;
      });
      return [...kept, { id, message, type, action, leaving: false }].slice(-4);
    });
    timers.set(id, setTimeout(() => dismissToast(id), action ? Math.max(duration, 6000) : duration));
    return id;
  }
</script>

<script>
  import { tick } from 'svelte';

  let container;

  // 모달(dialog)이 열려 있어도 토스트가 보이도록 최상위 레이어로 올린다
  async function promote() {
    await tick();
    if (!container || !container.showPopover) return;
    try {
      if (container.matches(':popover-open')) container.hidePopover();
      container.showPopover();
    } catch (e) {
      // popover 미지원 환경에서는 일반 레이어로 둔다
    }
  }

  $: if ($toasts.length && container) promote();

  function runAction(t) {
    dismissToast(t.id);
    t.action.onClick();
  }
</script>

<div class="toast-container" popover="manual" bind:this={container} role="status" aria-live="polite" aria-relevant="additions">
  {#each $toasts as t (t.id)}
    <div class="toast toast-{t.type}" class:leaving={t.leaving}>
      <span class="toast-text">{t.message}</span>
      {#if t.action}
        <button type="button" class="toast-action" on:click={() => runAction(t)}>{t.action.label}</button>
      {/if}
    </div>
  {/each}
</div>
