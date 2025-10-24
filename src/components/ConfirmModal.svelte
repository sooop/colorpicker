<script>
  export let show = false;
  export let message = '';
  export let onConfirm = () => {};
  export let onCancel = () => {};

  function handleConfirm() {
    onConfirm();
    show = false;
  }

  function handleCancel() {
    onCancel();
    show = false;
  }

  function handleKeyDown(event) {
    if (!show) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if show}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    on:click={handleBackdropClick}
  >
    <div class="bg-white rounded p-6 max-w-sm w-full mx-4">
      <p class="text-sm text-neutral-800 mb-6">{message}</p>

      <div class="flex gap-2 justify-end">
        <button
          on:click={handleCancel}
          class="px-4 py-2 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          취소
        </button>
        <button
          on:click={handleConfirm}
          class="px-4 py-2 text-xs bg-orange-600 hover:bg-orange-700 text-white transition-colors"
        >
          확인
        </button>
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
