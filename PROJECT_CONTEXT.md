# OKLCH Color Palette - Project Context

## 프로젝트 개요

OKLCH 색상 공간을 사용한 색상 팔레트 관리 웹 애플리케이션입니다. 사용자가 색상을 선택하고, 팔레트를 만들어 관리하며, variation을 생성할 수 있는 도구입니다.

- **기술 스택**: Svelte 5, Vite, Tailwind CSS 3, Culori
- **배포**: Vercel (또는 단일 HTML 파일로 로컬 사용 가능)
- **디자인**: Dieter Rams 미니멀리즘, Noto Sans KR 폰트

## 주요 기능

### 1. 색상 선택 (ColorPicker)
- **Canvas 기반 OKLCH 그라데이션**: HSB가 아닌 정확한 OKLCH 색상 공간 렌더링
- **비선형 분포**: 밝기(L) 0~1, 강도(C) 0~0.4 범위를 픽셀 단위로 계산
- **인터랙션**:
  - 마우스 드래그 / 터치 드래그
  - 키보드 화살표: 기본 5%, Shift+화살표 10%, Ctrl+화살표 1%
  - 우클릭 / Long Press (500ms): Variation 생성 메뉴

### 2. 색상 정보 (ColorInfo)
- **다중 색상 형식 지원**: OKLCH, HEX, RGB, HSL, HSV
- **L/C/H 슬라이더**: 숫자 입력 + 범위 슬라이더
- **색상 복사**: SVG 아이콘 버튼, 클립보드 복사
- **Color Well**:
  - 우측하단에 HEX/RGB 표시 (대비 색상 자동 계산)
  - 클릭하여 개별 복사
  - 우클릭 / Long Press: Variation 생성

### 3. 팔레트 관리 (Palette)
- **다중 팔레트**: 탭 방식으로 전환
- **팔레트 CRUD**:
  - 생성: "새 팔레트" 버튼 → 자동으로 새 팔레트로 전환
  - 이름 변경: 더블클릭
  - 삭제: 우클릭 / Long Press → ConfirmModal (최소 1개 유지)
- **색상 스와치**:
  - 클릭: 색상 선택
  - 드래그: 재정렬 (마우스 & 터치)
  - 우클릭 / Long Press: Variation 생성 / 삭제
  - 선택된 색상: 오렌지 테두리
- **Placeholder**: 팔레트 맨 뒤에 "+" 버튼으로 현재 색상 추가

### 4. Variation 생성 (VariationModal)
- **16개 variation**: 2줄 x 8개 그리드
- **비선형 분포**: √(i/15) 제곱근 함수로 어두운 영역 간격 크게, 밝은 영역 간격 작게
- **타입 선택**: 밝기(L) / 강도(C)
- **중복 색상 표시**:
  - 팔레트에 이미 있는 색상: 점선 테두리 + ✓ 마크
  - 클릭 시 추가 방지
- **호출 방법**: ColorPicker / ColorInfo / Palette 스와치에서 우클릭 / Long Press

### 5. 상태 관리 & 영속성
- **LocalStorage 저장**:
  - `oklch-palettes`: 모든 팔레트 데이터
  - `oklch-currentColor`: 현재 선택 색상
  - `oklch-activePaletteId`: 활성 팔레트 ID
  - `oklch-selectedColorIndex`: 선택된 색상 인덱스
- **자동 저장**: Svelte store의 subscribe를 통해 변경 시마다 자동 저장

### 6. 글로벌 기능
- **Ctrl+V 붙여넣기**: HEX/RGB/OKLCH 값을 감지하여 현재 색상으로 설정
- **Toast 알림**: 색상 복사, 에러 등의 피드백
- **ConfirmModal**:
  - 팔레트/색상 삭제 확인
  - Enter / Space: 확인, Esc: 취소
  - 백드롭 클릭: 취소

## 프로젝트 구조

```
color-palette/
├── src/
│   ├── components/
│   │   ├── ColorPicker.svelte      # Canvas 기반 OKLCH 색상 선택기
│   │   ├── ColorInfo.svelte        # 색상 정보 & 슬라이더
│   │   ├── Palette.svelte          # 팔레트 관리 & 스와치
│   │   ├── VariationModal.svelte   # Variation 생성 모달
│   │   ├── ConfirmModal.svelte     # 확인 대화상자
│   │   └── Toast.svelte            # 토스트 알림
│   ├── utils/
│   │   └── colorUtils.js           # 색상 변환 유틸리티 (Culori 기반)
│   ├── App.svelte                  # 메인 앱 컴포넌트
│   ├── main.js                     # Svelte 5 mount API
│   └── app.css                     # Tailwind + 글로벌 스타일
├── build-standalone.sh             # 단일 HTML 빌드 스크립트
├── index.html                      # 엔트리 포인트
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 기술적 결정사항

### 1. Svelte 5
- **mount API**: `new App()` 대신 `mount(App, { target })`
- **Reactive Statements**: `$:` 구문으로 반응형 로직
- **Stores**: writable stores로 전역 상태 관리

### 2. Canvas 렌더링
**문제**: CSS 그라데이션은 RGB 보간을 사용하여 OKLCH와 다름

**해결**:
```javascript
// 픽셀별 OKLCH → RGB 변환
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const lightness = 1 - (y / height);
    const chroma = (x / width) * 0.4;
    const rgbColor = rgb(oklch({ l: lightness, c: chroma, h }));
    // 픽셀에 RGB 값 설정
  }
}
```

### 3. 비선형 Variation
**문제**: 등간격 분포는 어두운 색상 구분 어려움

**해결**: 제곱근 함수 사용
```javascript
for (let i = 0; i < 16; i++) {
  const normalized = i / 15;
  const l = Math.sqrt(normalized); // 0, 0.258, 0.365, ..., 1.000
}
```

### 4. 모바일 지원
- **확대/축소 방지**: `viewport` meta 태그
- **좌우 스크롤 방지**: `overflow-x: hidden`, `touch-action: pan-y`
- **터치 드래그**: `touchstart/touchmove/touchend` 이벤트
- **Long Press**: 500ms 타이머로 우클릭 대체
- **레이아웃**: `shrink-0`, `min-w-0` 으로 overflow 방지

### 5. 색상 변환 (Culori)
```javascript
import { rgb, oklch } from 'culori';

// OKLCH → RGB
const rgbColor = rgb(oklch({ l: 0.7, c: 0.15, h: 250 }));

// 다양한 형식으로 변환
oklchToHex({ l, c, h })     // #xxxxxx
oklchToRgbString({ l, c, h }) // rgb(r, g, b)
oklchToHsl({ l, c, h })     // hsl(h, s%, l%)
oklchToHsv({ l, c, h })     // hsv(h, s%, v%)
```

### 6. Context Menu 처리
- **마우스**: `contextmenu` 이벤트
- **터치**: Long Press (500ms) 타이머
- **중복 방지**: `contextMenu.paletteId`, `contextMenu.colorIndex`를 클로저로 캡처

## 빌드 & 배포

### 개발 모드
```bash
npm run dev
# → http://localhost:5174
```

### 프로덕션 빌드
```bash
# 일반 빌드
npm run build

# 단일 HTML 파일 빌드
npm run build:standalone
# → dist/standalone.html (116KB)
```

### 단일 HTML 빌드 스크립트
`build-standalone.sh`는 자동으로:
1. `npm run build` 실행
2. CSS/JS 파일 탐지
3. 인라인으로 병합하여 `dist/standalone.html` 생성

## 컴포넌트 상세

### ColorPicker.svelte
**Props**:
- `color`: writable store
- `showVariationModal`, `variationBaseColor`: variation 모달 제어

**주요 기능**:
- Canvas 기반 OKLCH 그라데이션
- 마우스/터치 드래그
- 키보드 화살표 (%, Shift, Ctrl)
- 우클릭/Long Press 컨텍스트 메뉴

**Canvas 크기**: 300x300px (스타일로 반응형)

### ColorInfo.svelte
**Props**:
- `color`: writable store
- `palettes`, `activePaletteId`, `selectedColorIndex`
- `showVariationModal`, `variationBaseColor`

**주요 기능**:
- L/C/H 슬라이더 (range + number input)
- 색상 형식 전환 (OKLCH/HEX/RGB/HSL/HSV)
- Color Well (대비 색상 자동 계산)
- 추가/업데이트 버튼

### Palette.svelte
**Props**:
- `palettes`: writable store
- `activePaletteId`, `currentColor`, `selectedColorIndex`
- `showVariationModal`, `variationBaseColor`

**주요 기능**:
- 탭 방식 팔레트 전환
- 더블클릭으로 이름 변경
- 드래그 앤 드롭 재정렬
- 우클릭/Long Press 메뉴

**Grid**: `grid-cols-8 sm:grid-cols-12 md:grid-cols-16`

### VariationModal.svelte
**Props**:
- `show`: boolean
- `baseColor`: { l, c, h }
- `palettes`, `activePaletteId`, `currentColor`

**주요 기능**:
- 16개 variation 생성
- 밝기/강도 타입 선택
- 중복 색상 표시 및 추가 방지

### ConfirmModal.svelte
**Props**:
- `show`: boolean
- `message`: string
- `onConfirm`, `onCancel`: 콜백 함수

**키보드**:
- Enter / Space: 확인
- Esc: 취소

### Toast.svelte
**Module exports**:
- `showToast(message, duration = 2000)`
- `toast`: writable store

**사용**:
```javascript
import { showToast } from './Toast.svelte';
showToast('색상이 복사되었습니다');
```

## 스타일링

### Tailwind 구성
- **버전**: v3.4.18
- **폰트**: Noto Sans KR (300, 400, 500)
- **색상 팔레트**: neutral + orange accent
- **최대 너비**: max-w-3xl (768px)

### 디자인 원칙
- **미니멀리즘**: Dieter Rams 스타일
- **볼드 제거**: font-light, font-normal만 사용
- **오렌지 액센트**: 주요 액션 버튼 (새 팔레트, 추가, 복사)
- **회색 액센트**: 보조 액션 (업데이트)

## 알려진 이슈 & 개선점

### 접근성 경고 (빌드 시)
Svelte에서 접근성 관련 경고가 발생하나 기능상 문제 없음:
- `a11y_role_has_required_aria_props`
- `a11y_label_has_associated_control`
- `a11y_click_events_have_key_events`

### 개선 가능 영역
1. **팔레트 내보내기/가져오기**: JSON 파일로 export/import
2. **색상 히스토리**: 최근 사용 색상 기록
3. **색상 이름**: 자동 색상 이름 생성
4. **그라데이션 생성**: 두 색상 간 그라데이션
5. **접근성 점수**: WCAG 대비 비율 표시
6. **테마**: 다크 모드 지원

## 트러블슈팅

### Svelte 5 마운팅 오류
**증상**: 화면에 아무것도 나오지 않음

**해결**:
```javascript
// ❌ Svelte 4 방식
new App({ target: document.getElementById('app') })

// ✅ Svelte 5 방식
import { mount } from 'svelte';
mount(App, { target: document.getElementById('app') })
```

### Canvas가 검은색/흰색으로 표시
**증상**: OKLCH → RGB 변환 실패

**해결**:
```javascript
// ✅ 올바른 방법
import { rgb, oklch } from 'culori';
const rgbColor = rgb(oklch({ l, c, h }));
```

### Tailwind CSS 미적용
**증상**: 스타일이 전혀 적용되지 않음

**해결**: Tailwind v4가 설치된 경우 v3로 다운그레이드
```bash
npm uninstall tailwindcss
npm install -D tailwindcss@^3
```

### 색상/팔레트 삭제 안됨
**증상**: ConfirmModal 확인해도 삭제되지 않음

**원인**: `closeContextMenu()` 호출 시 contextMenu 값 초기화

**해결**: 클로저로 값 캡처
```javascript
function deleteColor() {
  const paletteId = contextMenu.paletteId;
  const colorIndex = contextMenu.colorIndex;

  confirmAction = () => {
    // paletteId, colorIndex 사용
  };
  closeContextMenu(); // 이제 안전
}
```

## 개발자 노트

### LocalStorage 키
- `oklch-palettes`: 전체 팔레트 배열
- `oklch-currentColor`: { l, c, h }
- `oklch-activePaletteId`: number
- `oklch-selectedColorIndex`: number

### 색상 범위
- **L (Lightness)**: 0~1
- **C (Chroma)**: 0~0.4 (실제로는 더 높을 수 있으나 일반 용도로 0.4 제한)
- **H (Hue)**: 0~360

### 키보드 단축키
- **ColorPicker 화살표**:
  - 기본: 5% 이동
  - Shift: 10% 이동
  - Ctrl: 1% 이동
- **Palette 이름 편집**:
  - Enter: 저장
  - Esc: 취소
- **ConfirmModal**:
  - Enter / Space: 확인
  - Esc: 취소

### 터치 이벤트 타이머
- **Long Press**: 500ms
- **Toast**: 2000ms (기본값, 커스터마이징 가능)

---

**마지막 업데이트**: 2025-10-24
**작성자**: soooprmx
**라이선스**: ISC
