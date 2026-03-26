'use client'

import { useState, useRef } from 'react'
import type { OwnedCard } from '@/types/card'
import CardComponent from './Card'
import { RARITY_COLORS } from '@/lib/cardHelpers'

interface PackOpeningProps {
  packName: string
  packImage?: string
  cards: OwnedCard[]
  onClose: () => void
}

type Phase = 'idle' | 'shake' | 'burst' | 'reveal' | 'done'

export default function PackOpening({ packName, packImage, cards, onClose }: PackOpeningProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [revealedIndex, setRevealedIndex] = useState(-1)
  const [flipped, setFlipped] = useState<boolean[]>(new Array(cards.length).fill(false))
  const shakeTimeout = useRef<NodeJS.Timeout | null>(null)

  const handlePackTap = () => {
    if (phase !== 'idle') return
    setPhase('shake')
    shakeTimeout.current = setTimeout(() => {
      setPhase('burst')
      setTimeout(() => {
        setPhase('reveal')
        setRevealedIndex(0)
      }, 600)
    }, 1200)
  }

  const handleCardTap = (index: number) => {
    if (phase !== 'reveal') return
    if (!flipped[index]) {
      setFlipped((prev) => {
        const next = [...prev]
        next[index] = true
        return next
      })
      setTimeout(() => {
        if (index < cards.length - 1) {
          setRevealedIndex(index + 1)
        } else {
          setPhase('done')
        }
      }, 300)
    }
  }

  const revealAll = () => {
    setFlipped(new Array(cards.length).fill(true))
    setRevealedIndex(cards.length - 1)
    setPhase('done')
  }

  return (
    <>
      <style>{`
        @keyframes packShake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-8px) rotate(-3deg); }
          20% { transform: translateX(8px) rotate(3deg); }
          30% { transform: translateX(-10px) rotate(-4deg); }
          40% { transform: translateX(10px) rotate(4deg); }
          50% { transform: translateX(-6px) rotate(-2deg); }
          60% { transform: translateX(6px) rotate(2deg); }
          70% { transform: translateX(-4px) rotate(-1deg); }
          80% { transform: translateX(4px) rotate(1deg); }
          90% { transform: translateX(-2px) rotate(-0.5deg); }
        }
        @keyframes burstScale {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.6; }
          100% { transform: scale(0) rotate(180deg); opacity: 0; }
        }
        @keyframes burstLight {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.5); }
          100% { opacity: 0; transform: scale(2.5); }
        }
        @keyframes cardSlideIn {
          0% { opacity: 0; transform: translateY(40px) scale(0.85); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes flipCard {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }
        @keyframes cardGlint {
          0%, 100% { transform: translateX(-100%) skewX(-15deg); }
          50% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes particleBurst {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }

        .pack-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.92);
          z-index: 200;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .pack-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 420px;
        }
        .pack-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 32px;
        }
        .pack-box {
          width: 200px;
          height: 280px;
          cursor: pointer;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(135deg, #0d1229 0%, #1a2450 50%, #0d1229 100%);
          border: 2px solid rgba(196,160,80,0.4);
          box-shadow: 0 0 40px rgba(196,160,80,0.2), 0 20px 60px rgba(0,0,0,0.6);
        }
        .pack-box.shaking {
          animation: packShake 1.2s ease;
        }
        .pack-box.bursting {
          animation: burstScale 0.5s ease forwards;
        }
        .burst-ring {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          animation: burstLight 0.6s ease forwards;
          background: radial-gradient(circle, rgba(196,160,80,0.6) 0%, rgba(196,160,80,0.1) 50%, transparent 70%);
          pointer-events: none;
        }
        .pack-hint {
          margin-top: 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          animation: pulse 2s ease infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        /* Reveal cards */
        .cards-reveal-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          width: 100%;
        }
        .card-reveal-slot {
          position: relative;
          animation: cardSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .card-reveal-slot.not-yet {
          visibility: hidden;
          pointer-events: none;
        }
        .card-flip-wrapper {
          position: relative;
          cursor: pointer;
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          width: 110px;
          height: 154px;
        }
        .card-flip-wrapper.flipped {
          transform: rotateY(180deg);
        }
        .card-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .card-back-face {
          transform: rotateY(0deg);
          background: linear-gradient(135deg, #0d1229 0%, #1a2450 100%);
          border-radius: 10px;
          border: 1px solid rgba(196,160,80,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .card-back-face::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent 40%, rgba(196,160,80,0.08) 50%, transparent 60%);
          animation: cardGlint 2s linear infinite;
        }
        .card-back-logo {
          font-size: 32px;
          opacity: 0.6;
        }
        .card-front-face {
          transform: rotateY(180deg);
        }
        .card-tap-hint {
          position: absolute;
          bottom: -20px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.35);
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* Glow effect on flip */
        .card-rarity-glow {
          position: absolute;
          inset: -8px;
          border-radius: 16px;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }
        .card-flip-wrapper.flipped + .card-rarity-glow {
          opacity: 1;
        }

        /* Bottom buttons */
        .pack-bottom-bar {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          width: 100%;
          max-width: 400px;
        }
        .pack-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .pack-btn:active { transform: scale(0.96); }
        .pack-btn-primary {
          background: linear-gradient(135deg, #c4a050 0%, #e8c97a 50%, #c4a050 100%);
          color: #0a0e1a;
          box-shadow: 0 4px 20px rgba(196,160,80,0.4);
        }
        .pack-btn-secondary {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.12);
        }
      `}</style>

      <div className="pack-overlay">
        <div className="pack-stage">

          {/* Phase IDLE / SHAKE / BURST */}
          {(phase === 'idle' || phase === 'shake' || phase === 'burst') && (
            <>
              <div className="pack-title">{packName}</div>

              <div
                className={`pack-box ${phase === 'shake' ? 'shaking' : ''} ${phase === 'burst' ? 'bursting' : ''}`}
                onClick={handlePackTap}
              >
                {phase === 'burst' && <div className="burst-ring" />}

                {packImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={packImage} alt={packName} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 64, marginBottom: 8 }}>📦</div>
                    <div style={{
                      fontFamily: 'Rajdhani, sans-serif',
                      fontSize: 11,
                      color: 'rgba(196,160,80,0.6)',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                    }}>
                      PSG Pack
                    </div>
                  </div>
                )}

                {/* Décorations intérieures */}
                <div style={{
                  position: 'absolute',
                  inset: 8,
                  border: '1px solid rgba(196,160,80,0.15)',
                  borderRadius: 10,
                  pointerEvents: 'none',
                }} />
              </div>

              {phase === 'idle' && (
                <div className="pack-hint">Appuyer pour ouvrir</div>
              )}
            </>
          )}

          {/* Phase REVEAL / DONE */}
          {(phase === 'reveal' || phase === 'done') && (
            <>
              <div className="pack-title" style={{ marginBottom: 16 }}>
                {phase === 'done' ? '🎉 Tes cartes' : 'Retourne les cartes'}
              </div>

              <div className="cards-reveal-grid">
                {cards.map((card, i) => {
                  const visible = i <= revealedIndex
                  const isFlipped = flipped[i]
                  const rarityColor = RARITY_COLORS[card.rarity]

                  return (
                    <div
                      key={card.owned_id}
                      className={`card-reveal-slot${!visible ? ' not-yet' : ''}`}
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      <div
                        className={`card-flip-wrapper${isFlipped ? ' flipped' : ''}`}
                        onClick={() => handleCardTap(i)}
                      >
                        {/* Dos de la carte */}
                        <div className="card-face card-back-face">
                          <span className="card-back-logo">⚜️</span>
                        </div>

                        {/* Face de la carte */}
                        <div className="card-face card-front-face">
                          <CardComponent card={card} size="sm" showStats={false} />
                        </div>
                      </div>

                      {/* Glow under card after flip */}
                      {isFlipped && (
                        <div style={{
                          position: 'absolute',
                          inset: -6,
                          borderRadius: 14,
                          background: `radial-gradient(ellipse, ${rarityColor}20 0%, transparent 70%)`,
                          pointerEvents: 'none',
                          filter: 'blur(4px)',
                        }} />
                      )}

                      {!isFlipped && visible && (
                        <div className="card-tap-hint">Tapper !</div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="pack-bottom-bar">
                {phase === 'reveal' && (
                  <button className="pack-btn pack-btn-secondary" onClick={revealAll}>
                    Tout révéler
                  </button>
                )}
                <button
                  className="pack-btn pack-btn-primary"
                  onClick={onClose}
                  disabled={phase !== 'done'}
                  style={{ opacity: phase !== 'done' ? 0.4 : 1 }}
                >
                  Continuer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}