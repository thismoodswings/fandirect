import React from 'react'

export default function FanDirectLogo({ className = 'h-9 w-9', showWordmark = false, wordmarkClassName = 'font-heading font-bold text-xl text-foreground' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src="/logo-mark.png"
        alt="FanDirect"
        className={`${className} rounded-full object-contain`}
        loading="eager"
        decoding="async"
      />
      {showWordmark && (
        <span className={wordmarkClassName}>
          Fan<span className="text-primary">Direct</span>
        </span>
      )}
    </span>
  )
}
