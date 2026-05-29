# Qonlab — 로또 번호 추첨기 & 정보 가이드

무작위 로또 번호(1~45 중 6개 + 보너스)를 생성하고, 로또 6/45의 확률·무작위성·책임 있는 이용법을
정확하게 설명하는 무료 정보형 정적 사이트입니다.

배포 주소: <https://visionbay.github.io/qonlab/>

## 핵심 특징

- **번호 생성기**: 브라우저 안에서만 동작하며, 생성한 번호를 수집·저장하지 않습니다.
- **정보형 콘텐츠**: 확률, 의사난수, 흔한 미신, 책임 있는 이용, 한국 복권 역사, 자동/수동 비교 등 직접 작성한 가이드 6편.
- **다크/화이트 테마**: 사용자 선호를 기억합니다.
- **반응형·접근성**: 모바일 내비게이션, 건너뛰기 링크, 시맨틱 마크업.
- **SEO**: 페이지별 메타·canonical·Open Graph, JSON-LD 구조화 데이터, `sitemap.xml`, `robots.txt`.

## 페이지 구조

```
/
├── index.html                 홈(생성기 + 기본 정보 + FAQ)
├── about.html                 사이트 소개·편집 원칙
├── contact.html               문의(폼 + 이메일)
├── privacy.html               개인정보처리방침
├── terms.html                 이용약관 및 면책조항
├── guide/
│   ├── index.html             가이드 허브
│   ├── lotto-probability.html         로또 확률
│   ├── random-number-generation.html  무작위성·의사난수
│   ├── lotto-myths.html               흔한 미신
│   ├── responsible-play.html          책임 있는 이용
│   ├── korea-lottery-history.html     한국 복권 역사
│   └── auto-vs-manual.html            자동 vs 수동
├── styles.css                 공통 스타일
├── script.js                  공통 스크립트(테마·내비·생성기·폼)
├── 404.html                   커스텀 404
├── robots.txt
└── sitemap.xml
```

## 로컬에서 보기

별도 빌드 과정이 없는 순수 정적 사이트입니다. 다음 중 하나로 실행할 수 있습니다.

```bash
# Python 내장 서버
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

또는 VS Code의 Live Server 확장으로 `index.html`을 열어도 됩니다.

## 책임 고지

이 사이트는 복권을 판매·중개하지 않으며, 당첨을 보장하지 않습니다. 모든 번호 조합의 당첨 확률은 동일합니다.
실제 회차 결과는 [동행복권 공식 사이트](https://www.dhlottery.co.kr/)에서 확인하세요. 복권 구매는 만 19세 이상만 가능합니다.
