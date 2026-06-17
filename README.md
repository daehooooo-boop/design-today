# 디자인 투데이 (Design Today)

매일 07:30 KST에 자동으로 디자인·IT 뉴스를 리서치해서, 국내/해외 · 디자인/IT 4분할로 보여주는
정적 뉴스클리핑 사이트입니다. 서버를 상시로 띄우지 않고도 무료로 운영할 수 있도록 설계했습니다.

## 동작 원리 (왜 서버가 필요 없는가)

```
[GitHub Actions, 매일 07:30 KST]
   └─ scripts/research.mjs 실행
        └─ Claude API(web_search 도구)로 오늘의 뉴스 4개 카테고리 조사
        └─ public/data/2026-06-16.json 같은 파일 생성
        └─ git commit & push
              └─ Vercel/Netlify가 push를 감지해 자동 재배포
                    └─ 브라우저는 정적 JSON 파일을 그냥 fetch해서 표시
```

리서치는 GitHub의 무료 크론(스케줄러)이 트리거하고, 결과는 평범한 JSON 파일로 저장됩니다.
프론트엔드는 그 JSON 파일을 읽어서 보여주기만 하는 정적 사이트(Vite + React)이기 때문에
백엔드 서버나 데이터베이스가 필요 없습니다.

## 폴더 구조

```
design-today/
  src/                     프론트엔드 (Vite + React)
  public/data/             날짜별 뉴스 JSON (YYYY-MM-DD.json) + dates.json 인덱스
  scripts/research.mjs     Claude API로 뉴스를 조사해 JSON을 생성하는 스크립트
  .github/workflows/       매일 07:30 KST에 research.mjs를 실행하는 GitHub Actions
```

## 로컬에서 실행해보기

```bash
npm install
npm run dev          # http://localhost:5173 에서 확인 (오늘 날짜 샘플 데이터로 동작)
```

지금 `public/data/2026-06-16.json`에는 실제 웹 검색으로 가져온 샘플 데이터가 들어 있어서,
바로 화면이 어떻게 보이는지 확인할 수 있습니다.

## 리서치 스크립트 직접 돌려보기

```bash
cp .env.example .env        # 발급받은 Anthropic API 키를 입력
export $(cat .env | xargs)
npm run research            # public/data/{오늘 날짜}.json 새로 생성
```

키는 https://console.anthropic.com 에서 발급합니다. `web_search` 도구를 사용하므로
API 사용량에 따라 비용이 발생합니다(하루 1회, 카테고리 4개 조사 기준으로는 소액입니다).

## 배포하기 (GitHub + Vercel, 둘 다 무료 플랜으로 충분)

1. **GitHub에 레포 생성 후 이 폴더 푸시**
   ```bash
   git init
   git add .
   git commit -m "init: design today"
   git remote add origin <당신의 레포 URL>
   git push -u origin main
   ```

2. **GitHub Secret 등록** (리서치 스크립트가 매일 자동으로 쓸 키)
   레포 → Settings → Secrets and variables → Actions → New repository secret
   - Name: `ANTHROPIC_API_KEY`
   - Value: 발급받은 키

3. **Vercel에 연결**
   https://vercel.com 에서 "Import Project" → 방금 만든 GitHub 레포 선택 →
   Framework Preset이 자동으로 Vite로 잡힙니다 → Deploy.
   이후 GitHub에 새 커밋이 푸시될 때마다(=매일 자동 리서치 후) 자동으로 재배포됩니다.

4. **확인**
   GitHub 레포 → Actions 탭에서 `Daily Design News Research` 워크플로우가
   매일 07:30 KST에 실행되는지 확인할 수 있고, "Run workflow" 버튼으로 수동 실행도 가능합니다.

## 리서치 범위/소스 커스터마이즈

`scripts/research.mjs`의 `SYSTEM_PROMPT`를 수정하면 됩니다. 예를 들어:
- 특정 매체를 우선 참고하도록 지정 (예: "디자인DB, 브런치 디자인 카테고리, 전자신문, ZDNet Korea 우선 참고")
- 카테고리당 항목 수 조정 (현재 3개)
- 보험/금융 도메인처럼 특정 산업 뉴스를 다섯 번째 카테고리로 추가

스키마(JSON 구조)를 바꾸는 경우 `src/App.jsx`와 `src/components/NewsSection.jsx`의
데이터 접근 부분도 함께 맞춰주면 됩니다.

## 알려진 제약

- GitHub Actions의 `schedule` 크론은 "정확히" 그 시각이 아니라 몇 분 정도 지연될 수 있습니다
  (GitHub 측 큐 상황에 따라 흔들림이 있습니다. 칼같은 정시성이 중요하면 외부 크론 서비스
  cron-job.org 등으로 Vercel의 API Route를 호출하는 방식으로 바꿀 수도 있습니다).
- `web_search` 도구가 실제로 확인한 URL만 쓰도록 프롬프트에 명시했지만, 모델이 가끔
  부정확한 링크를 낼 수 있어 운영 초반에는 결과를 한 번씩 검수하는 것을 권장합니다.
- 현재는 카테고리당 3개로 고정되어 있어 분량이 많지 않습니다. 운영하면서 늘리거나
  중요도 기반으로 가변 개수를 받도록 프롬프트를 조정할 수 있습니다.
