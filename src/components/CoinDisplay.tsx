'use client'

import { useEffect, useRef, useState } from 'react'

interface CoinDisplayProps {
  amount: number
  animate?: boolean
  size?: 'sm' | 'md' | 'lg'
  showDelta?: boolean
}

export default function CoinDisplay({
  amount,
  animate = true,
  size = 'md',
  showDelta = true,
}: CoinDisplayProps) {
  const prevAmount = useRef(amount)
  const [delta, setDelta] = useState<number | null>(null)
  const [displayed, setDisplayed] = useState(amount)
  const deltaTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!animate) {
      setDisplayed(amount)
      prevAmount.current = amount
      return
    }

    const diff = amount - prevAmount.current
    if (diff !== 0) {
      if (showDelta) {
        setDelta(diff)
        if (deltaTimeout.current) clearTimeout(deltaTimeout.current)
        deltaTimeout.current = setTimeout(() => setDelta(null), 2000)
      }

      // Compteur animé
      const steps = 20
      const stepValue = diff / steps
      let step = 0
      const interval = setInterval(() => {
        step++
        setDisplayed((prev) => {
          const next = prev + stepValue
          if (step >= steps) {
            clearInterval(interval)
            return amount
          }
          return next
        })
      }, 30)
      prevAmount.current = amount
      return () => clearInterval(interval)
    }
  }, [amount, animate, showDelta])

  const sizes = {
    sm: { coin: 14, font: '13px', gap: '5px', padding: '4px 10px', radius: '20px' },
    md: { coin: 18, font: '15px', gap: '6px', padding: '6px 14px', radius: '24px' },
    lg: { coin: 22, font: '19px', gap: '8px', padding: '8px 18px', radius: '28px' },
  }

  const s = sizes[size]

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <style>{`
        @keyframes coinBounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.25) rotate(-8deg); }
          70% { transform: scale(0.92) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes deltaFloat {
          0% { opacity: 0; transform: translateY(0px); }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-28px); }
        }
        .coin-display {
          display: inline-flex;
          align-items: center;
          gap: ${s.gap};
          background: linear-gradient(135deg, rgba(196,160,80,0.12) 0%, rgba(196,160,80,0.06) 100%);
          border: 1px solid rgba(196,160,80,0.35);
          border-radius: ${s.radius};
          padding: ${s.padding};
          font-family: 'Rajdhani', sans-serif;
          font-size: ${s.font};
          font-weight: 700;
          color: #e8c97a;
          letter-spacing: 0.05em;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 12px rgba(196,160,80,0.1), inset 0 1px 0 rgba(255,255,255,0.05);
          transition: box-shadow 0.2s ease;
          white-space: nowrap;
        }
        .coin-display:hover {
          box-shadow: 0 4px 20px rgba(196,160,80,0.2), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .coin-icon {
          width: ${s.coin}px;
          height: ${s.coin}px;
          flex-shrink: 0;
        }
        .coin-delta {
          position: absolute;
          top: -8px;
          right: -4px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 800;
          pointer-events: none;
          animation: deltaFloat 2s ease forwards;
          white-space: nowrap;
        }
        .coin-delta.positive { color: #4ade80; }
        .coin-delta.negative { color: #f87171; }
      `}</style>

      <div className="coin-display">
        {/* PSG Coin SVG icon */}
        <svg className="coin-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="url(#coinGrad)" stroke="rgba(196,160,80,0.6)" strokeWidth="0.5"/>
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
          <text x="12" y="16" textAnchor="middle" fill="#0a0e1a" fontSize="10" fontWeight="900" fontFamily="serif">₱</text>
          <defs>
            <linearGradient id="coinGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f0d070"/>
              <stop offset="50%" stopColor="#c4a050"/>
              <stop offset="100%" stopColor="#9a7a30"/>
            </linearGradient>
          </defs>
        </svg>
        <span>{Math.round(displayed).toLocaleString('fr-FR')}</span>
      </div>

      {delta !== null && showDelta && (
        <span className={`coin-delta ${delta > 0 ? 'positive' : 'negative'}`}>
          {delta > 0 ? `+${delta}` : delta} ₱
        </span>
      )}
    </div>
  )
}