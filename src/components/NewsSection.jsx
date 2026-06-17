import React from 'react'
import NewsCard from './NewsCard.jsx'

export default function NewsSection({ title, category, items }) {
  if (!items || items.length === 0) return null

  return (
    <section className={`news-section ${category}-section`}>
      <div className="section-head">
        <span className={`section-dot ${category}`} />
        <span className="section-title">{title}</span>
      </div>
      <div className="news-list">
        {items.map((item, i) => (
          <NewsCard key={i} item={item} category={category} />
        ))}
      </div>
    </section>
  )
}
