import React from 'react'

export default function RegionTabs({ region, onChange, counts }) {
  const tabs = [
    { key: 'domestic', label: '국내' },
    { key: 'global', label: '해외' },
  ]

  return (
    <nav className="region-tabs" role="tablist" aria-label="지역 선택">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={region === tab.key}
          className={`region-tab ${region === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {typeof counts?.[tab.key] === 'number' && (
            <span className="count">{counts[tab.key]}</span>
          )}
        </button>
      ))}
    </nav>
  )
}
