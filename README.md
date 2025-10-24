# OKLCH Color Palette

OKLCH 색상 체계를 기반으로 한 웹 색상 팔레트 관리 애플리케이션

## 기능

- **색상 조절기**: OKLCH 색상 공간에서 직관적으로 색상 선택
  - 정사각형 색상 박스 (강도 × 밝기)
  - 색상 각도 슬라이더
  - 마우스/키보드 조작 지원

- **색상 정보**: 다양한 형식으로 색상 표현
  - OKLCH, RGB, HEX, HSL, HSV 형식 지원
  - 색상 코드 복사 및 입력
  - 정밀 값 조절

- **팔레트 관리**
  - 멀티 팔레트 지원
  - 색상 추가/업데이트/삭제
  - 16개 이상의 색상 저장

## 개발

```bash
# 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰
npm run preview
```

## 기술 스택

- Svelte 5
- Vite
- Culori (색상 변환)

## 배포

Vercel에 배포 가능:

```bash
vercel
```
