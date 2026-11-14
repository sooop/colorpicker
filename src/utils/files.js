// 확장자 또는 MIME 중 하나만 맞아도 통과. 판별 불가(확장자 없고 type 빈 값)는 통과시키고 파싱에서 거른다.
export function matchesFile(file, { exts = [], mimes = [] } = {}) {
  if (!exts.length && !mimes.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (exts.some((e) => name.endsWith(e))) return true;
  if (type && mimes.some((m) => (m.endsWith('/*') ? type.startsWith(m.slice(0, -1)) : type === m))) return true;
  return !type && !/\.[^./\\]+$/.test(name);
}

export const IMAGE_ACCEPT = { exts: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif', '.svg'], mimes: ['image/*'] };
export const JSON_ACCEPT = { exts: ['.json', '.txt', '.css'], mimes: ['application/json', 'text/*'] };
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function isImageFile(file) {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return type.startsWith('image/') || IMAGE_ACCEPT.exts.some((e) => name.endsWith(e));
}

export const hasFiles = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

// Svelte 액션: 요소를 파일 드롭 영역으로 만든다. 드래그 중에만 data-dragover 가 붙는다.
export function dropzone(node, options) {
  let opts = options;
  let depth = 0;
  const mark = (on) => node.toggleAttribute('data-dragover', on);
  const enter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); depth++; mark(true); };
  const over = (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; };
  const leave = (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) mark(false); };
  const drop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); e.stopPropagation();
    depth = 0; mark(false);
    const all = Array.from(e.dataTransfer.files);
    const ok = all.filter((f) => matchesFile(f, opts.accept));
    const use = opts.multiple ? ok : ok.slice(0, 1);
    if (ok.length < all.length || use.length < ok.length) {
      opts.onReject && opts.onReject({ rejected: all.filter((f) => !ok.includes(f)), ignored: ok.length - use.length });
    }
    if (use.length) opts.onFiles(use);
  };
  node.addEventListener('dragenter', enter);
  node.addEventListener('dragover', over);
  node.addEventListener('dragleave', leave);
  node.addEventListener('drop', drop);
  return {
    update(o) { opts = o; },
    destroy() {
      node.removeEventListener('dragenter', enter);
      node.removeEventListener('dragover', over);
      node.removeEventListener('dragleave', leave);
      node.removeEventListener('drop', drop);
    }
  };
}

// 텍스트 파일을 내려받는다. objectURL 은 몇 초 뒤 해제한다.
export function saveTextFile(name, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
