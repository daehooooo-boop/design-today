import React, { useEffect, useState } from 'react'
import Masthead from './components/Masthead.jsx'
import RegionTabs from './components/RegionTabs.jsx'
import NewsSection from './components/NewsSection.jsx'
import StateBlock from './components/StateBlock.jsx'

function todayKST() {
  // KST = UTC+9, 날짜 비교 시 시간대 차이로 어긋나지 않도록 직접 계산
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export default function App() {
  const [dates, setDates] = useState([])
  const [date, setDate] = useState(todayKST())
  const [data, setData] = useState(null)
  const [region, setRegion] = useState('domestic')
  const [status, setStatus] = useState('loading') // loading | ready | empty | error

  // 1) 사용 가능한 날짜 목록 로드 (없으면 오늘 날짜만 시도)
  useEffect(() => {
    fetch('/data/dates.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          const sorted = [...list].sort().reverse()
          setDates(sorted)
          setDate(sorted[0])
        }
      })
      .catch(() => {})
  }, [])

  // 2) 선택된 날짜의 뉴스 데이터 로드
  useEffect(() => {
    if (!date) return
    setStatus('loading')
    fetch(`/data/${date}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('not found')
        return res.json()
      })
      .then((json) => {
        setData(json)
        setStatus('ready')
      })
      .catch(() => {
        setData(null)
        setStatus('empty')
      })
  }, [date])

  const regionData = data?.[region] || { design: [], it: [] }
  const counts = data
    ? {
        domestic: (data.domestic?.design?.length || 0) + (data.domestic?.it?.length || 0),
        global: (data.global?.design?.length || 0) + (data.global?.it?.length || 0),
      }
    : null

  return (
    <div className="app">
      <Masthead
        date={date}
        dates={dates}
        onDateChange={setDate}
        capturedAt={data?.captured_at_kst || '07:30'}
      />

      <RegionTabs region={region} onChange={setRegion} counts={counts} />

      {status === 'loading' && (
        <StateBlock title="불러오는 중" sub="오늘의 뉴스클리핑을 가져오고 있습니다." />
      )}

      {status === 'error' && (
        <StateBlock
          title="데이터를 불러오지 못했습니다"
          sub="잠시 후 다시 시도해주세요."
        />
      )}

      {status === 'empty' && (
        <StateBlock
          title="아직 리서치 결과가 없습니다"
          sub="다음 업데이트는 매일 07:30 KST입니다."
        />
      )}

      {status === 'ready' && (
        <>
          <NewsSection title="디자인" category="design" items={regionData.design} />
          <NewsSection title="IT" category="it" items={regionData.it} />
          {(!regionData.design || regionData.design.length === 0) &&
            (!regionData.it || regionData.it.length === 0) && (
              <StateBlock
                title="오늘은 해당 지역 소식이 없습니다"
                sub="다른 지역 탭을 확인해보세요."
              />
            )}
        </>
      )}

      <footer className="site-footer">
        <span>매일 07:30 KST 자동 리서치 · Claude 기반</span>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
          소스 보기
        </a>
      </footer>
    </div>
  )
}
