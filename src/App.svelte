<script>
  import { onMount } from 'svelte';
  import ColorPicker from './components/ColorPicker.svelte';
  import ColorInfo from './components/ColorInfo.svelte';
  import Palette from './components/Palette.svelte';
  import Toast, { showToast } from './components/Toast.svelte';
  import VariationModal from './components/VariationModal.svelte';
  import ImagePicker from './components/ImagePicker.svelte';
  import TransferDrawer from './components/TransferDrawer.svelte';
  import Icon from './components/Icon.svelte';
  import { setColor, storage, KEYS, imageRequest } from './state.js';
  import { parseColorToOklch } from './utils/colorUtils.js';
  import { hasFiles, isImageFile, matchesFile, JSON_ACCEPT } from './utils/files.js';
  import { importFromFiles } from './utils/paletteIO.js';

  let transferOpen = false;
  let transferTrigger;
  let dragDepth = 0;
  let dragging = false;

  // ---- 테마 ----
  let media;
  const applyTheme = (t) => document.documentElement.setAttribute('data-theme', t);

  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storage.set(KEYS.theme, next);
  }

  onMount(() => {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const saved = storage.get(KEYS.theme);
      if (saved !== 'light' && saved !== 'dark') applyTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  });

  // ---- 붙여넣기 (색 코드 또는 이미지) ----
  function handleGlobalPaste(event) {
    const t = event.target;
    const inField = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

    const files = Array.from(event.clipboardData?.files || []);
    const image = files.find(isImageFile);
    if (image) {
      event.preventDefault();
      imageRequest.set(image);
      return;
    }
    if (inField || document.querySelector('dialog[open]')) return;

    const pastedText = event.clipboardData?.getData('text');
    if (pastedText && pastedText.trim()) {
      const parsed = parseColorToOklch(pastedText.trim());
      if (parsed) {
        const snapped = setColor(parsed);
        if (Math.abs(snapped.c - parsed.c) > 0.002) {
          showToast('sRGB 색역 밖의 색이라 가장 가까운 색으로 조정했습니다', { type: 'info' });
        }
      } else {
        showToast('붙여넣은 내용을 색으로 인식하지 못했습니다', { type: 'error' });
      }
    }
  }

  // ---- 파일 드롭: 영역 밖에 놓아도 페이지가 바뀌지 않게 하고, 종류에 따라 보낸다 ----
  function onDragEnter(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    dragging = true;
  }

  function onDragOver(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function onDragLeave(e) {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) dragging = false;
  }

  function onDrop(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dragging = false;
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    routeFiles(files);
  }

  function routeFiles(files) {
    const file = files[0];
    if (files.length > 1) showToast('첫 번째 파일만 사용합니다', { type: 'info' });
    if (isImageFile(file)) {
      imageRequest.set(file);
    } else if (matchesFile(file, JSON_ACCEPT)) {
      transferOpen = true;
      importFromFiles([file]);
    } else {
      showToast('이미지 또는 팔레트 JSON 파일만 열 수 있습니다', { type: 'error' });
    }
  }
</script>

<svelte:window
  on:paste={handleGlobalPaste}
  on:dragenter={onDragEnter}
  on:dragover={onDragOver}
  on:dragleave={onDragLeave}
  on:drop={onDrop}
/>

<div class="app">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v5.3M20.5 12h-5.3"/></svg>
      </span>
      <h1>OKLCH 팔레트</h1>
    </div>
    <div class="topbar-actions">
      <button
        type="button"
        class="btn btn-ghost"
        bind:this={transferTrigger}
        aria-haspopup="dialog"
        aria-expanded={transferOpen}
        on:click={() => (transferOpen = true)}
      >
        <Icon name="transfer" />
        <span class="btn-label-wide">가져오기·내보내기</span>
      </button>
      <button type="button" id="themeToggle" class="icon-btn" aria-label="테마 변경" title="테마 변경" on:click={toggleTheme}>
        <svg class="icon icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>
        <svg class="icon icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/></svg>
      </button>
    </div>
  </header>

  <main class="workspace">
    <Palette />
    <div class="work-grid">
      <ColorPicker />
      <ColorInfo />
    </div>
  </main>

  <div class="drop-hint window-drop" class:on={dragging} aria-hidden="true">
    놓아서 열기 · 이미지는 색 추출, JSON 은 팔레트 가져오기
  </div>
</div>

<VariationModal />
<ImagePicker />
<TransferDrawer open={transferOpen} onClose={() => (transferOpen = false)} />
<Toast />
