import React from 'react'

export default function NewsCard({ item, category }) {
  return (
    <article className="news-card">
      <a
        className="news-card-title"
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item.title}
      </a>
      {item.summary && <p className="news-card-summary">{item.summary}</p>}
      <div className="news-card-meta">
        <span className={`tag ${category}`}>{category === 'design' ? '디자인' : 'IT'}</span>
        {item.source && <span>{item.source}</span>}
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            원문 보기 →
          </a>
        )}
      </div>
    </article>
  )
}
