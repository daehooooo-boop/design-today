// scripts/research.mjs
// 매일 GitHub Actions가 이 스크립트를 실행합니다 (.github/workflows/daily-research.yml).
// 실행 결과: public/data/{YYYY-MM-DD}.json 생성 + public/data/dates.json 갱신
//
// 로컬 테스트:
//   GEMINI_API_KEY=AIza... npm run research
//   GEMINI_API_KEY=AIza... node scripts/research.mjs 2026-06-17   (날짜 수동 지정)

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const DATA_DIR = path.resolve('public/data')
const MODEL = 'gemini-2.0-flash'

function todayKST() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

const targetDate = process.argv[2] || todayKST()

const SYSTEM_PROMPT = `너는 디자인·IT 전문 뉴스클리퍼다. 오늘(${targetDate}, 한국시간 기준) 발행되거나 갱신된
디자인 뉴스와 IT 뉴스를 웹 검색으로 조사한다.

반드시 다음 4개 카테고리를 모두 채운다:
1. 국내 디자인 (한국어권 디자인/UX/UI/브랜딩 소식)
2. 국내 IT (한국 IT/테크 기업·산업 소식)
3. 해외 디자인 (영어권 등 해외 디자인/UX/UI 소식)
4. 해외 IT (해외 빅테크/스타트업/기술 산업 소식)

각 카테고리마다 오늘 기준으로 가장 의미 있는 항목 3개를 고른다.
각 항목은 다음 필드를 가진 JSON 객체로 작성한다:
- title: 헤드라인 (한국어로, 30자 내외)
- summary: 핵심 내용 1~2문장 요약 (한국어, 출처 원문을 그대로 베끼지 말고 직접 풀어서 서술)
- source: 매체/사이트명
- link: 실제 원문 URL (검색으로 확인한 정확한 URL만 사용. 추측 금지)

출력 형식 규칙 (매우 중요):
- 오직 아래 스키마의 JSON 객체 하나만 출력한다.
- 마크다운 코드펜스(\`\`\`)나 설명 문장을 절대 포함하지 않는다.
- 확인되지 않는 URL은 만들어내지 말고, 검색 결과에서 실제로 확인된 링크만 사용한다.

스키마:
{
  "date": "${targetDate}",
  "captured_at_kst": "07:30",
  "domestic": { "design": [ {title, summary, source, link} x3 ], "it": [ ... x3 ] },
  "global":   { "design": [ {title, summary, source, link} x3 ], "it": [ ... x3 ] }
}`

async function callGemini() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: `${targetDate} 기준 오늘의 디자인·IT 뉴스를 조사해서 스키마대로 JSON만 응답해줘.` }],
        },
      ],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.2 },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API 오류 (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((p) => p.text)
    ?.map((p) => p.text)
    ?.join('\n')
    ?.trim()

  if (!text) {
    throw new Error('응답에서 텍스트를 찾지 못했습니다.')
  }

  return text
}

function parseModelOutput(raw) {
  const cleaned = raw.replace(/^```json\s*|^```\s*|```$/gm, '').trim()
  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    throw new Error(`JSON 파싱 실패: ${err.message}\n--- 원본 응답 ---\n${cleaned}`)
  }

  for (const region of ['domestic', 'global']) {
    if (!parsed[region]) throw new Error(`'${region}' 키가 없습니다.`)
    for (const cat of ['design', 'it']) {
      if (!Array.isArray(parsed[region][cat])) {
        throw new Error(`'${region}.${cat}' 가 배열이 아닙니다.`)
      }
    }
  }

  return parsed
}

async function updateDatesIndex(date) {
  const indexPath = path.join(DATA_DIR, 'dates.json')
  let dates = []
  try {
    const raw = await readFile(indexPath, 'utf-8')
    dates = JSON.parse(raw)
  } catch {
    dates = []
  }
  if (!dates.includes(date)) dates.push(date)
  dates.sort()
  await writeFile(indexPath, JSON.stringify(dates, null, 2) + '\n', 'utf-8')
}

async function main() {
  console.log(`[design-today] ${targetDate} 리서치 시작...`)
  const raw = await callGemini()
  const parsed = parseModelOutput(raw)

  await mkdir(DATA_DIR, { recursive: true })
  const outPath = path.join(DATA_DIR, `${targetDate}.json`)
  await writeFile(outPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8')
  await updateDatesIndex(targetDate)

  console.log(`[design-today] 완료: ${outPath}`)
}

main().catch((err) => {
  console.error('[design-today] 리서치 실패:', err.message)
  process.exit(1)
})
