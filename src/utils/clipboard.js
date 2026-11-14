import { showToast } from '../components/Toast.svelte';

// clipboard API → 임시 textarea + execCommand 순으로 시도한다. 성공 여부를 돌려준다.
export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // 폴백으로 진행
  }
  const prev = document.activeElement;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (prev && prev.focus) prev.focus({ preventScroll: true });
    return ok;
  } catch (e) {
    return false;
  }
}

export async function copyWithToast(text, label = '복사했습니다') {
  const ok = await copyText(text);
  if (ok) showToast(label);
  else showToast('복사하지 못했습니다. 브라우저가 클립보드 접근을 막았습니다.', { type: 'error', duration: 3500 });
  return ok;
}
