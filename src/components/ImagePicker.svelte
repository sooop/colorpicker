<script>
  import { onDestroy } from 'svelte';
  import { imageRequest, setColor, activePaletteId, addColors, currentColor } from '../state.js';
  import { parseColorToOklch, oklchToHex } from '../utils/colorUtils.js';
  import { IMAGE_ACCEPT, matchesFile, dropzone } from '../utils/files.js';
  import { showToast } from './Toast.svelte';
  import Dialog from './Dialog.svelte';
  import Icon from './Icon.svelte';

  const MAX_SIDE = 1800;

  let open = false;
  let canvas;
  let bitmap = null; // ImageBitmap | HTMLImageElement
  let objectUrl = '';
  let loading = false;
  let error = '';
  let marker = null; // { x, y } 0~100 (%)
  let pickedHex = '';
  let pressing = false;
  let fileInput;
  let loadSeq = 0;

  $: if ($imageRequest) load($imageRequest);
  $: if (canvas && bitmap) paint();

  function release() {
    if (bitmap && bitmap.close) bitmap.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    bitmap = null;
    objectUrl = '';
  }

  async function decode(file) {
    try {
      return await createImageBitmap(file);
    } catch (e) {
      // SVG 등은 <img> 로 읽는다
      objectUrl = URL.createObjectURL(file);
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('decode'));
        img.src = objectUrl;
      });
    }
  }

  async function load(file) {
    const seq = ++loadSeq;
    imageRequest.set(null);
    release();
    error = '';
    marker = null;
    pickedHex = '';
    open = true;
    loading = true;
    try {
      const img = await decode(file);
      if (seq !== loadSeq) { if (img.close) img.close(); return; }
      bitmap = img;
    } catch (e) {
      error = '이미지를 읽을 수 없습니다. PNG, JPG, GIF, WebP 같은 이미지 파일인지 확인하세요.';
    }
    loading = false;
  }

  function paint() {
    const w0 = bitmap.width || bitmap.naturalWidth || 300;
    const h0 = bitmap.height || bitmap.naturalHeight || 150;
    const s = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    canvas.width = Math.max(1, Math.round(w0 * s));
    canvas.height = Math.max(1, Math.round(h0 * s));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

  function pickAt(clientX, clientY) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    pickFraction(fx, fy);
  }

  function pickFraction(fx, fy) {
    const x = Math.min(canvas.width - 1, Math.floor(fx * canvas.width));
    const y = Math.min(canvas.height - 1, Math.floor(fy * canvas.height));
    let data;
    try {
      data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
    } catch (e) {
      error = '이 이미지의 픽셀을 읽을 수 없습니다.';
      return;
    }
    marker = { x: fx * 100, y: fy * 100 };
    if (data[3] === 0) {
      error = '투명한 픽셀입니다. 다른 위치를 선택하세요.';
      return;
    }
    error = '';
    const hex = '#' + [data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    const parsed = parseColorToOklch(hex);
    if (parsed) {
      setColor(parsed);
      pickedHex = hex;
    }
  }

  function onDown(e) {
    pressing = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    canvas.focus({ preventScroll: true });
    pickAt(e.clientX, e.clientY);
  }

  function onMove(e) {
    if (pressing) pickAt(e.clientX, e.clientY);
  }

  function onUp() {
    pressing = false;
  }

  function onKey(e) {
    const step = e.shiftKey ? 10 : 1;
    const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
    const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    const cx = marker ? marker.x / 100 : 0.5;
    const cy = marker ? marker.y / 100 : 0.5;
    pickFraction(
      Math.max(0, Math.min(1, cx + dx / canvas.width)),
      Math.max(0, Math.min(1, cy + dy / canvas.height))
    );
  }

  function openFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) handleFiles([file]);
  }

  function handleFiles(files) {
    const file = files[0];
    if (!matchesFile(file, IMAGE_ACCEPT)) {
      error = '이미지 파일(PNG, JPG, GIF, WebP 등)만 열 수 있습니다.';
      return;
    }
    imageRequest.set(file);
  }

  function addPicked() {
    if (!pickedHex) return;
    const { added } = addColors($activePaletteId, [$currentColor]);
    showToast(added ? '팔레트에 추가했습니다' : '이미 팔레트에 있는 색입니다', { type: added ? 'success' : 'info' });
  }

  function onClose() {
    open = false;
    release();
  }

  onDestroy(release);
</script>

<Dialog {open} title="이미지에서 색 추출" wide on:close={onClose} focusSelector="canvas">
  <div class="modal-body">
    <div
      class="image-stage"
      use:dropzone={{ accept: IMAGE_ACCEPT, onFiles: handleFiles, onReject: () => (error = '이미지 파일만 열 수 있습니다.') }}
    >
      {#if loading}
        <p class="muted center">불러오는 중</p>
      {/if}
      {#if bitmap}
        <div class="image-wrap">
          <canvas
            bind:this={canvas}
            class="image-canvas"
            tabindex="0"
            aria-label="이미지. 클릭하거나 방향키로 색을 고릅니다"
            on:pointerdown={onDown}
            on:pointermove={onMove}
            on:pointerup={onUp}
            on:pointercancel={onUp}
            on:keydown={onKey}
          ></canvas>
          {#if marker}
            <span class="image-marker" style="left: {marker.x}%; top: {marker.y}%" aria-hidden="true"></span>
          {/if}
        </div>
      {/if}
      <div class="drop-hint" aria-hidden="true">놓아서 열기</div>
    </div>

    {#if error}
      <p class="field-error" role="alert">{error}</p>
    {/if}

    <div class="modal-foot">
      <span class="picked">
        <span class="base-swatch sm" style="background-color: {pickedHex || oklchToHex($currentColor)}" aria-hidden="true"></span>
        <span class="mono" aria-live="polite">{pickedHex || '색을 클릭하세요'}</span>
      </span>
      <span class="spacer"></span>
      <button type="button" class="btn" on:click={() => fileInput.click()}>
        <Icon name="image" />다른 이미지
      </button>
      <input type="file" accept="image/*" class="visually-hidden" tabindex="-1" bind:this={fileInput} on:change={openFile} />
      <button type="button" class="btn btn-primary" disabled={!pickedHex} on:click={addPicked}>
        <Icon name="plus" />팔레트에 추가
      </button>
    </div>
  </div>
</Dialog>
