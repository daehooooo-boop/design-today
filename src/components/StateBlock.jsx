import React from 'react'

export default function StateBlock({ title, sub }) {
  return (
    <div className="state-block">
      <p className="state-title">{title}</p>
      {sub && <p className="state-sub">{sub}</p>}
    </div>
  )
}
