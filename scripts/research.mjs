// scripts/research.mjs
// 매일 GitHub Actions가 이 스크립트를 실행합니다 (.github/workflows/daily-research.yml).
// 실행 결과: public/data/{YYYY-MM-DD}.json 생성 + public/data/dates.json 갱신
// API 없이 RSS 피드만 사용 — 완전 무료
//
// 로컬 테스트:
//   npm run research
//   node scripts/research.mjs 2026-06-17   (날짜 수동 지정)

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const DATA_DIR = path.resolve('public/data')

function todayKST() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

const targetDate = process.argv[2] || todayKST()

// RSS 소스 목록 (카테고리별 여러 피드 → 합산 후 상위 3개 선택)
const SOURCES = {
  domestic: {
    design: [
      { url: 'https://magazine.contenta.co/feed/', name: 'Contenta M' },
      { url: 'https://feeds.feedburner.com/bloter', name: '블로터' },
    ],
    it: [
      { url: 'https://feeds.feedburner.com/bloter', name: '블로터' },
      { url: 'https://www.aitimes.com/rss/allArticle.xml', name: 'AI타임스' },
    ],
  },
  global: {
    design: [
      { url: 'https://www.smashingmagazine.com/feed/', name: 'Smashing Magazine' },
      { url: 'https://uxdesign.cc/feed', name: 'UX Collective' },
      { url: 'https://www.designboom.com/feed/', name: 'Designboom' },
    ],
    it: [
      { url: 'https://feeds.feedburner.com/TechCrunch/', name: 'TechCrunch' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge' },
    ],
  },
}

// XML에서 태그 값 추출 (CDATA 포함)
function extractTag(xml, tag) {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdata) return cdata[1].trim()
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'))
  if (plain) return plain[1].trim()
  // <link> 는 self-closing Atom 스타일도 있음
  if (tag === 'link') {
    const atom = xml.match(/<link[^>]+href=["']([^"']+)["']/i)
    if (atom) return atom[1].trim()
  }
  return ''
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen).trimEnd() + '…'
}

function parseRSS(xml, sourceName) {
  const items = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let m
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1]
    const title = stripHtml(extractTag(block, 'title'))
    const rawLink = extractTag(block, 'link') || extractTag(block, 'guid')
    const link = rawLink.startsWith('http') ? rawLink : ''
    const desc = truncate(stripHtml(extractTag(block, 'description')))
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || ''

    if (title && link) {
      items.push({ title, summary: desc || title, source: sourceName, link, pubDate })
    }
  }
  return items
}

async function fetchFeed(feedUrl, sourceName) {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'design-today-bot/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, sourceName)
  } catch {
    console.warn(`[design-today] 피드 스킵: ${feedUrl}`)
    return []
  }
}

// 여러 피드에서 아이템을 수집하고 최신 3개 반환
async function collectItems(feeds) {
  const all = (await Promise.all(feeds.map((f) => fetchFeed(f.url, f.name)))).flat()
  // pubDate 기준 정렬 (없으면 원래 순서 유지)
  all.sort((a, b) => {
    const da = a.pubDate ? new Date(a.pubDate).getTime() : 0
    const db = b.pubDate ? new Date(b.pubDate).getTime() : 0
    return db - da
  })
  // title 중복 제거 후 3개
  const seen = new Set()
  const result = []
  for (const item of all) {
    if (!seen.has(item.title)) {
      seen.add(item.title)
      result.push({ title: item.title, summary: item.summary, source: item.source, link: item.link })
      if (result.length === 3) break
    }
  }
  return result
}

async function updateDatesIndex(date) {
  const indexPath = path.join(DATA_DIR, 'dates.json')
  let dates = []
  try {
    dates = JSON.parse(await readFile(indexPath, 'utf-8'))
  } catch {
    dates = []
  }
  if (!dates.includes(date)) dates.push(date)
  dates.sort()
  await writeFile(indexPath, JSON.stringify(dates, null, 2) + '\n', 'utf-8')
}

async function main() {
  console.log(`[design-today] ${targetDate} 리서치 시작 (RSS 모드)...`)

  const [domDesign, domIT, glbDesign, glbIT] = await Promise.all([
    collectItems(SOURCES.domestic.design),
    collectItems(SOURCES.domestic.it),
    collectItems(SOURCES.global.design),
    collectItems(SOURCES.global.it),
  ])

  const output = {
    date: targetDate,
    captured_at_kst: '07:30',
    domestic: { design: domDesign, it: domIT },
    global: { design: glbDesign, it: glbIT },
  }

  await mkdir(DATA_DIR, { recursive: true })
  const outPath = path.join(DATA_DIR, `${targetDate}.json`)
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8')
  await updateDatesIndex(targetDate)

  const total = domDesign.length + domIT.length + glbDesign.length + glbIT.length
  console.log(`[design-today] 완료: ${outPath} (총 ${total}개 아이템)`)
}

main().catch((err) => {
  console.error('[design-today] 리서치 실패:', err.message)
  process.exit(1)
})
