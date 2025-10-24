<script context="module">
  import { writable } from 'svelte/store';

  export const toast = writable({ show: false, message: '' });

  let timeoutId;

  export function showToast(message, duration = 2000) {
    if (timeoutId) clearTimeout(timeoutId);

    toast.set({ show: true, message });

    timeoutId = setTimeout(() => {
      toast.set({ show: false, message: '' });
    }, duration);
  }
</script>

<script>
</script>

{#if $toast.show}
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
    <div class="px-4 py-2 bg-neutral-900 text-white text-xs rounded shadow-lg">
      {$toast.message}
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
</style>
