import React from 'react'

const TICK_COUNT = 24 // 하루 24시간을 룰러의 눈금으로 표현

function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00+09:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

export default function Masthead({ date, dates, onDateChange, capturedAt }) {
  // 07:30 캡처 시각을 24시간 룰러 위의 위치(%)로 환산
  const [h, m] = (capturedAt || '07:30').split(':').map(Number)
  const markPosition = ((h + m / 60) / TICK_COUNT) * 100

  return (
    <header className="masthead">
      <div className="ruler">
        <div
          className="ruler-mark"
          style={{ left: `${markPosition}%` }}
        >
          <span className="dot" />
          <span className="label">{capturedAt} KST 캡처</span>
        </div>
        <div className="ruler-ticks">
          {Array.from({ length: TICK_COUNT }).map((_, i) => (
            <span className="ruler-tick" key={i} />
          ))}
        </div>
      </div>

      <div className="masthead-row">
        <h1 className="wordmark">
          디자인 <span className="accent">투데이</span>
        </h1>

        <div className="date-control">
          <span>{formatDateLabel(date)}</span>
          {dates && dates.length > 1 && (
            <select
              className="date-select"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label="날짜 선택"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <p className="tagline">국내·해외 디자인과 IT 뉴스를 매일 아침 한 화면에서.</p>
    </header>
  )
}
