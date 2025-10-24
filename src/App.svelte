<script>
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import ColorPicker from './components/ColorPicker.svelte';
  import ColorInfo from './components/ColorInfo.svelte';
  import Palette from './components/Palette.svelte';
  import Toast from './components/Toast.svelte';
  import VariationModal from './components/VariationModal.svelte';
  import { parseColorToOklch } from './utils/colorUtils.js';

  // 로컬 스토리지에서 팔레트 불러오기
  const loadPalettes = () => {
    if (typeof window === 'undefined') return [{ id: 1, name: 'Default', colors: [] }];
    const saved = localStorage.getItem('oklch-palettes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [{ id: 1, name: 'Default', colors: [] }];
      }
    }
    return [{ id: 1, name: 'Default', colors: [] }];
  };

  const loadCurrentColor = () => {
    if (typeof window === 'undefined') return { l: 0.7, c: 0.15, h: 250 };
    const saved = localStorage.getItem('oklch-currentColor');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { l: 0.7, c: 0.15, h: 250 };
      }
    }
    return { l: 0.7, c: 0.15, h: 250 };
  };

  const loadActivePaletteId = () => {
    if (typeof window === 'undefined') return 1;
    const saved = localStorage.getItem('oklch-activePaletteId');
    return saved ? parseInt(saved) : 1;
  };

  const loadSelectedColorIndex = () => {
    if (typeof window === 'undefined') return -1;
    const saved = localStorage.getItem('oklch-selectedColorIndex');
    return saved ? parseInt(saved) : -1;
  };

  // 현재 선택된 색상 (OKLCH 형식)
  const currentColor = writable(loadCurrentColor());

  // 팔레트 배열
  const palettes = writable(loadPalettes());

  const activePaletteId = writable(loadActivePaletteId());
  const selectedColorIndex = writable(loadSelectedColorIndex());

  // Variation 모달 상태
  const showVariationModal = writable(false);
  const variationBaseColor = writable({ l: 0.7, c: 0.15, h: 250 });

  // 팔레트 변경 시 로컬 스토리지에 저장
  palettes.subscribe(value => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch-palettes', JSON.stringify(value));
    }
  });

  currentColor.subscribe(value => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch-currentColor', JSON.stringify(value));
    }
  });

  activePaletteId.subscribe(value => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch-activePaletteId', value.toString());
    }
  });

  selectedColorIndex.subscribe(value => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oklch-selectedColorIndex', value.toString());
    }
  });

  function handleGlobalPaste(event) {
    // input, textarea 등에서는 작동하지 않도록
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    const pastedText = event.clipboardData?.getData('text');
    if (pastedText) {
      const parsed = parseColorToOklch(pastedText.trim());
      if (parsed) {
        currentColor.set(parsed);
      }
    }
  }
</script>

<svelte:window on:paste={handleGlobalPaste} />

<main class="max-w-7xl mx-auto p-6 min-h-screen flex flex-col">
  <h1 class="text-lg font-normal text-neutral-800 mb-6">OKLCH Color Palette</h1>

  <div class="flex flex-col gap-6 flex-1">
    <!-- 팔레트 영역 (상단) -->
    <Palette {palettes} {activePaletteId} {currentColor} {selectedColorIndex} {showVariationModal} {variationBaseColor} />

    <!-- 색상 선택기 + 정보 영역 (하단) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ColorPicker color={currentColor} {showVariationModal} {variationBaseColor} />
      <ColorInfo color={currentColor} {palettes} {activePaletteId} {selectedColorIndex} {showVariationModal} {variationBaseColor} />
    </div>
  </div>

  <footer class="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500">
    soooprmx &copy; 2025
  </footer>
</main>

<VariationModal
  bind:show={$showVariationModal}
  baseColor={$variationBaseColor}
  {palettes}
  {activePaletteId}
  {currentColor}
/>

<Toast />
