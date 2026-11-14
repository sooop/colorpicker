<script>
  export let name;
  export let size = 16;

  // 고정된 내부 상수만 {@html} 로 넣는다 (사용자 입력 아님)
  const paths = {
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 3h9a1.5 1.5 0 0 1 1.5 1.5V5"/>',
    check: '<path d="M4.5 12.5l5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M14.5 7.5l3 3"/>',
    download: '<path d="M12 3.5v12M7 11l5 5 5-5M4.5 20h15"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4.5 20h15"/>',
    transfer: '<path d="M7 4L3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13"/>',
    eyedrop: '<path d="M14.5 6.5l3 3M16 3.5a2.1 2.1 0 0 1 3 3l-2.6 2.6-3-3zM13.4 8.6L5 17v2h2l8.4-8.4"/><path d="M5 19l-1.5 1.5"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4.5 4"/>',
    layers: '<path d="M12 3.5L3 8.5l9 5 9-5z"/><path d="M3 12.5l9 5 9-5M3 16.5l9 5 9-5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    swatch: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    file: '<path d="M6.5 3.5h7L18.5 8.5v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19.5v-14.5A1.5 1.5 0 0 1 6.5 3.5z"/><path d="M13.5 3.5v5h5"/>'
  };
</script>

<svg class="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{@html paths[name] || ''}</svg>
