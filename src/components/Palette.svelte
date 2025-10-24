<script>
  import { oklchToCSS } from '../utils/colorUtils.js';
  import ConfirmModal from './ConfirmModal.svelte';

  export let palettes;
  export let activePaletteId;
  export let currentColor;
  export let selectedColorIndex;
  export let showVariationModal;
  export let variationBaseColor;

  let contextMenu = { show: false, x: 0, y: 0, paletteId: null, colorIndex: null, type: null };
  let editingPaletteId = null;
  let editingName = '';
  let draggedIndex = null;

  // Confirm 모달 상태
  let showConfirmModal = false;
  let confirmMessage = '';
  let confirmAction = null;

  // Long press 상태
  let longPressTimer = null;
  let longPressTarget = null;

  $: activePalette = $palettes.find(p => p.id === $activePaletteId);

  function selectColor(colorData, index) {
    currentColor.set(colorData);
    selectedColorIndex.set(index);
  }

  // 팔레트 전환 시 선택 해제
  $: if ($activePaletteId) {
    selectedColorIndex.set(-1);
  }

  function handleContextMenu(event, paletteId, colorIndex) {
    event.preventDefault();
    contextMenu = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      paletteId,
      colorIndex,
      type: 'color'
    };
  }

  function handlePaletteContextMenu(event, paletteId) {
    event.preventDefault();
    contextMenu = {
      show: true,
      x: event.clientX,
      y: event.clientY,
      paletteId,
      colorIndex: null,
      type: 'palette'
    };
  }

  function closeContextMenu() {
    contextMenu = { show: false, x: 0, y: 0, paletteId: null, colorIndex: null, type: null };
  }

  function deleteColor() {
    if (contextMenu.paletteId === null || contextMenu.colorIndex === null) return;

    // 클로저로 값을 캡처
    const paletteId = contextMenu.paletteId;
    const colorIndex = contextMenu.colorIndex;

    confirmMessage = '이 색상을 삭제하시겠습니까?';
    confirmAction = () => {
      palettes.update(pals => {
        return pals.map(p => {
          if (p.id === paletteId) {
            const newColors = p.colors.filter((_, i) => i !== colorIndex);
            return { ...p, colors: newColors };
          }
          return p;
        });
      });
    };
    showConfirmModal = true;
    closeContextMenu();
  }

  function addNewPalette() {
    let newId;
    palettes.update(pals => {
      newId = Math.max(...pals.map(p => p.id)) + 1;
      return [
        ...pals,
        {
          id: newId,
          name: `Palette ${newId}`,
          colors: []
        }
      ];
    });
    // 새로 만든 팔레트로 전환
    activePaletteId.set(newId);
  }

  function deletePalette(targetPaletteId) {
    if ($palettes.length <= 1) {
      confirmMessage = '최소 1개의 팔레트가 필요합니다.';
      confirmAction = null; // 확인만 하는 용도
      showConfirmModal = true;
      closeContextMenu();
      return;
    }

    confirmMessage = '이 팔레트를 삭제하시겠습니까?';
    confirmAction = () => {
      palettes.update(pals => pals.filter(p => p.id !== targetPaletteId));

      if ($activePaletteId === targetPaletteId) {
        activePaletteId.set($palettes[0].id);
      }
    };
    showConfirmModal = true;
    closeContextMenu();
  }

  function handleClickOutside(event) {
    if (contextMenu.show && !event.target.closest('.context-menu')) {
      closeContextMenu();
    }
  }

  function startEditingName(paletteId, currentName) {
    editingPaletteId = paletteId;
    editingName = currentName;
  }

  function savePaletteName() {
    if (editingPaletteId !== null && editingName.trim()) {
      palettes.update(pals => {
        return pals.map(p => {
          if (p.id === editingPaletteId) {
            return { ...p, name: editingName.trim() };
          }
          return p;
        });
      });
    }
    editingPaletteId = null;
    editingName = '';
  }

  function cancelEditingName() {
    editingPaletteId = null;
    editingName = '';
  }

  function handleNameKeyDown(event) {
    if (event.key === 'Enter') {
      savePaletteName();
    } else if (event.key === 'Escape') {
      cancelEditingName();
    }
  }

  function handleDragStart(event, index) {
    draggedIndex = index;
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event, dropIndex) {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    palettes.update(pals => {
      return pals.map(p => {
        if (p.id === $activePaletteId) {
          const newColors = [...p.colors];
          const [removed] = newColors.splice(draggedIndex, 1);
          newColors.splice(dropIndex, 0, removed);
          return { ...p, colors: newColors };
        }
        return p;
      });
    });

    draggedIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
  }

  function openVariationModal() {
    if (contextMenu.colorIndex !== null && activePalette) {
      const colorIndex = contextMenu.colorIndex;
      const color = activePalette.colors[colorIndex];
      variationBaseColor.set(color);
      showVariationModal.set(true);
      closeContextMenu();
    }
  }

  function handleLongPressStart(event, paletteId, colorIndex) {
    longPressTarget = { paletteId, colorIndex };
    const touch = event.touches ? event.touches[0] : event;

    longPressTimer = setTimeout(() => {
      // Long press 감지됨 - 컨텍스트 메뉴 열기
      contextMenu = {
        show: true,
        x: touch.clientX,
        y: touch.clientY,
        paletteId,
        colorIndex,
        type: 'color'
      };
      longPressTimer = null;
    }, 500); // 500ms long press
  }

  function handleLongPressEnd() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressTarget = null;
  }

  function handleLongPressMove() {
    // 터치가 움직이면 long press 취소
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function handlePaletteLongPressStart(event, paletteId) {
    const touch = event.touches ? event.touches[0] : event;

    longPressTimer = setTimeout(() => {
      // Long press 감지됨 - 팔레트 컨텍스트 메뉴 열기
      contextMenu = {
        show: true,
        x: touch.clientX,
        y: touch.clientY,
        paletteId,
        colorIndex: null,
        type: 'palette'
      };
      longPressTimer = null;
    }, 500);
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="p-5 bg-white border border-neutral-200 rounded">
  <div class="flex justify-between items-center mb-4">
    <h2 class="text-sm font-normal text-neutral-700">팔레트</h2>
    <button on:click={addNewPalette} class="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white transition-colors">
      새 팔레트
    </button>
  </div>

  <div class="flex gap-2 mb-4 flex-wrap">
    {#each $palettes as palette}
      <div
        class="px-3 py-1.5 border flex items-center gap-2 text-xs font-light transition-colors
          {palette.id === $activePaletteId
            ? 'bg-orange-600 text-white border-orange-600'
            : 'bg-white border-neutral-300 hover:border-orange-400'}"
      >
        {#if editingPaletteId === palette.id}
          <input
            type="text"
            bind:value={editingName}
            on:keydown={handleNameKeyDown}
            on:blur={savePaletteName}
            class="px-2 py-1 border border-neutral-300 text-neutral-900 text-xs"
            autofocus
          />
        {:else}
          <button
            on:click={() => activePaletteId.set(palette.id)}
            on:dblclick={() => startEditingName(palette.id, palette.name)}
            on:contextmenu={(e) => handlePaletteContextMenu(e, palette.id)}
            on:touchstart={(e) => handlePaletteLongPressStart(e, palette.id)}
            on:touchend={handleLongPressEnd}
            on:touchmove={handleLongPressMove}
            class="cursor-pointer"
          >
            {palette.name}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  {#if activePalette}
    <div class="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5">
      {#each activePalette.colors as colorData, index}
        <button
          draggable="true"
          on:dragstart={(e) => handleDragStart(e, index)}
          on:dragover={handleDragOver}
          on:drop={(e) => handleDrop(e, index)}
          on:dragend={handleDragEnd}
          on:touchstart={(e) => handleLongPressStart(e, activePalette.id, index)}
          on:touchend={handleLongPressEnd}
          on:touchmove={handleLongPressMove}
          class="aspect-square border cursor-move transition-all
            {index === $selectedColorIndex
              ? 'border-orange-600 border-2'
              : 'border-neutral-300 hover:border-neutral-500'}
            {draggedIndex === index ? 'opacity-50' : ''}"
          style="background-color: {oklchToCSS(colorData)}"
          on:click={() => selectColor(colorData, index)}
          on:contextmenu={(e) => handleContextMenu(e, activePalette.id, index)}
          title={oklchToCSS(colorData)}
        ></button>
      {/each}
      <button
        class="aspect-square border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs hover:border-neutral-500 cursor-pointer"
        on:click={() => {
          palettes.update(pals => {
            return pals.map(p => {
              if (p.id === $activePaletteId) {
                return { ...p, colors: [...p.colors, $currentColor] };
              }
              return p;
            });
          });
        }}
      >
        +
      </button>
    </div>
  {/if}
</div>

{#if contextMenu.show}
  <div
    class="context-menu fixed bg-white border border-neutral-300 shadow-sm z-50 overflow-hidden"
    style="left: {contextMenu.x}px; top: {contextMenu.y}px"
  >
    {#if contextMenu.type === 'color'}
      <button
        on:click={openVariationModal}
        class="block w-full px-4 py-2 text-xs text-left hover:bg-neutral-100 transition-colors border-b border-neutral-200"
      >
        Variation 생성
      </button>
      <button
        on:click={deleteColor}
        class="block w-full px-4 py-2 text-xs text-left hover:bg-neutral-100 transition-colors"
      >
        삭제
      </button>
    {:else if contextMenu.type === 'palette'}
      <button
        on:click={() => deletePalette(contextMenu.paletteId)}
        class="block w-full px-4 py-2 text-xs text-left hover:bg-neutral-100 transition-colors"
      >
        팔레트 삭제
      </button>
    {/if}
  </div>
{/if}

<ConfirmModal
  bind:show={showConfirmModal}
  message={confirmMessage}
  onConfirm={confirmAction || (() => {})}
  onCancel={() => {}}
/>
