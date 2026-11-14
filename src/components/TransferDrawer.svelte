<script>
  import { palettes, activePaletteId } from '../state.js';
  import {
    buildExport, exportFileName, formatCssVars, formatTailwind, formatHexList,
    importFromText, importFromFiles, importResult
  } from '../utils/paletteIO.js';
  import { copyWithToast } from '../utils/clipboard.js';
  import { saveTextFile, dropzone, JSON_ACCEPT } from '../utils/files.js';
  import { showToast } from './Toast.svelte';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  export let open = false;
  export let onClose = () => {};

  let fileInput;
  let pasteText = '';

  $: active = $palettes.find((p) => p.id === $activePaletteId);
  $: hasColors = !!active && active.colors.length > 0;
  $: totalColors = $palettes.reduce((n, p) => n + p.colors.length, 0);

  function saveJson() {
    saveTextFile(exportFileName(), buildExport($palettes));
    showToast('팔레트를 JSON 파일로 저장했습니다');
  }

  function copyJson() {
    copyWithToast(buildExport($palettes), '전체 팔레트 JSON 을 복사했습니다');
  }

  function copyFormat(kind) {
    if (!active || !hasColors) return;
    const fn = { css: formatCssVars, tailwind: formatTailwind, hex: formatHexList }[kind];
    const label = { css: 'CSS 변수', tailwind: 'Tailwind 설정', hex: 'HEX 목록' }[kind];
    copyWithToast(fn(active), `${label}를 복사했습니다`);
  }

  async function onFiles(files) {
    await importFromFiles(files);
  }

  function onFileInput(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) onFiles(files);
  }

  function onPaste() {
    // 붙여넣은 내용이 textarea 에 반영된 뒤 읽는다
    setTimeout(() => {
      if (pasteText.trim() && importFromText(pasteText)) pasteText = '';
    }, 0);
  }

  function importPasted() {
    if (!pasteText.trim()) return;
    if (importFromText(pasteText)) pasteText = '';
  }

  function onReject() {
    importResult.set({ type: 'error', text: 'JSON 또는 텍스트 파일만 가져올 수 있습니다.' });
  }
</script>

<Dialog {open} variant="drawer" title="팔레트 가져오기·내보내기" on:close={onClose} focusSelector=".import-text">
  <div class="drawer-body">
    <section class="drawer-section">
      <h3>내보내기</h3>
      <p class="section-meta">팔레트 {$palettes.length}개 · 색 {totalColors}개</p>
      <div class="btn-row">
        <button type="button" class="btn" on:click={saveJson}><Icon name="download" />JSON 저장</button>
        <button type="button" class="btn" on:click={copyJson}><Icon name="copy" />JSON 복사</button>
      </div>
    </section>

    <section class="drawer-section">
      <h3>현재 팔레트 복사 <span class="muted">{active ? active.name : ''}</span></h3>
      <div class="btn-row">
        <button type="button" class="btn" disabled={!hasColors} on:click={() => copyFormat('css')}>CSS 변수</button>
        <button type="button" class="btn" disabled={!hasColors} on:click={() => copyFormat('tailwind')}>Tailwind 설정</button>
        <button type="button" class="btn" disabled={!hasColors} on:click={() => copyFormat('hex')}>HEX 목록</button>
      </div>
    </section>

    <section class="drawer-section grow">
      <h3>가져오기</h3>
      <div
        class="import-zone"
        use:dropzone={{ accept: JSON_ACCEPT, onFiles, onReject }}
      >
        <textarea
          class="import-text"
          bind:value={pasteText}
          on:paste={onPaste}
          placeholder="JSON 이나 색 코드 목록을 붙여넣으세요"
          aria-label="가져올 팔레트 JSON 또는 색 코드"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        ></textarea>
        <div class="drop-hint" aria-hidden="true">놓아서 가져오기</div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn" on:click={() => fileInput.click()}><Icon name="file" />파일 열기</button>
        <input type="file" accept=".json,.txt,.css,application/json,text/plain" class="visually-hidden" tabindex="-1" bind:this={fileInput} on:change={onFileInput} />
        <button type="button" class="btn btn-primary" disabled={!pasteText.trim()} on:click={importPasted}><Icon name="upload" />가져오기</button>
      </div>
      <div class="import-status" role="status" aria-live="polite">
        {#if $importResult}
          <p class="status-line {$importResult.type}" class:shake={$importResult.type === 'error'}>
            <Icon name={$importResult.type === 'ok' ? 'check' : 'x'} size={14} />{$importResult.text}
          </p>
        {/if}
      </div>
    </section>
  </div>
</Dialog>
