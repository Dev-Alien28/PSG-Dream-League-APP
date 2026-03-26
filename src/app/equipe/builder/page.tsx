// src/app/equipe/builder/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection } from '@/lib/supabase'
import CardComponent from '@/components/Card'
import { getCompatibleCards, computeTeamOverall } from '@/lib/cardHelpers'
import type { OwnedCard, PlayerPosition } from '@/types/card'
import type { Formation, TeamSlot } from '@/types/match'

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2']

const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = {
  '4-3-3': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant', 'Attaquant'],
  '4-4-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '4-2-3-1': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant'],
  '3-5-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '5-3-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
}

const POSITION_SHORT: Record<PlayerPosition, string> = {
  Gardien: 'GK',
  Défenseur: 'DEF',
  Milieu: 'MIL',
  Attaquant: 'ATT',
}

const POSITION_ROW: Record<PlayerPosition, number> = {
  Gardien: 5,
  Défenseur: 4,
  Milieu: 3,
  Attaquant: 1,
}

export default function BuilderPage() {
  const router = useRouter()
  const [formation, setFormation] = useState<Formation>('4-3-3')
  const [slots, setSlots] = useState<TeamSlot[]>([])
  const [collection, setCollection] = useState<OwnedCard[]>([])
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      getUserCollection(u.id).then((c) => {
        setCollection(c)
        setLoading(false)
      })
    })
  }, [router])

  useEffect(() => {
    const positions = FORMATION_LAYOUTS[formation]
    setSlots(positions.map((position) => ({ position, card: null })))
    setActiveSlotIdx(null)
  }, [formation])

  const handleSlotClick = (idx: number) => {
    setActiveSlotIdx(activeSlotIdx === idx ? null : idx)
  }

  const handlePickCard = (card: OwnedCard) => {
    if (activeSlotIdx === null) return
    setSlots((prev) => {
      const next = [...prev]
      // Remove from other slots
      for (let i = 0; i < next.length; i++) {
        if (next[i].card?.owned_id === card.owned_id) {
          next[i] = { ...next[i], card: null }
        }
      }
      next[activeSlotIdx] = { ...next[activeSlotIdx], card }
      return next
    })
    setActiveSlotIdx(null)
  }

  const removeCard = (idx: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], card: null }
      return next
    })
    setActiveSlotIdx(null)
  }

  const overall = computeTeamOverall(slots)
  const filledCount = slots.filter((s) => s.card !== null).length
  const totalSlots = slots.length

  const activeSlot = activeSlotIdx !== null ? slots[activeSlotIdx] : null
  const compatibleCards = activeSlot
    ? getCompatibleCards(collection, activeSlot)
    : []

  // Group slots by position row for visual layout
  const groupedSlots = slots.reduce<Record<number, { slot: TeamSlot; idx: number }[]>>(
    (acc, slot, idx) => {
      const row = POSITION_ROW[slot.position] ?? 3
      if (!acc[row]) acc[row] = []
      acc[row].push({ slot, idx })
      return acc
    },
    {}
  )
  const rows = Object.keys(groupedSlots)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <>
      <style>{`
        .builder-page { display: flex; flex-direction: column; height: calc(100dvh - var(--navbar-height)); }
        .builder-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .builder-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .builder-overall {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .builder-overall-value {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: #c4a050;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .builder-overall-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          line-height: 1.2;
        }
        .formation-tabs {
          display: flex;
          gap: 6px;
          padding: 10px 16px;
          overflow-x: auto;
          border-bottom: 1px solid var(--border-subtle);
          scrollbar-width: none;
          flex-shrink: 0;
          background: rgba(255,255,255,0.01);
        }
        .formation-tabs::-webkit-scrollbar { display: none; }
        .formation-tab {
          padding: 5px 12px;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          letter-spacing: 0.04em;
        }
        .formation-tab.active {
          background: rgba(196,160,80,0.12);
          border-color: rgba(196,160,80,0.35);
          color: #c4a050;
        }

        /* Field */
        .field-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          min-height: 0;
        }
        .field-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #0d2a0d 0%, #112e11 40%, #0d2a0d 100%);
        }
        .field-lines-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.12;
        }
        .field-content {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 8px 16px;
          gap: 4px;
        }
        .field-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          align-items: center;
        }
        .slot-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .slot-btn:active { transform: scale(0.92); }
        .slot-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 2px dashed rgba(255,255,255,0.25);
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          transition: all 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .slot-circle.active-slot {
          border-color: #c4a050;
          background: rgba(196,160,80,0.1);
          box-shadow: 0 0 16px rgba(196,160,80,0.4);
        }
        .slot-circle.filled {
          border-style: solid;
          border-color: rgba(255,255,255,0.2);
        }
        .slot-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 9px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .slot-card-mini {
          position: absolute;
          inset: -1px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1px;
        }
        .slot-card-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 7px;
          font-weight: 700;
          color: white;
          text-align: center;
          padding: 0 2px;
          line-height: 1.2;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .slot-card-ovr {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 900;
          color: #c4a050;
          line-height: 1;
        }

        /* Card picker panel */
        .card-picker {
          position: absolute;
          inset: 0;
          background: var(--bg-primary);
          z-index: 10;
          display: flex;
          flex-direction: column;
          animation: slideUp 0.25s ease;
        }
        .card-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .card-picker-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .card-picker-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 16px;
          transition: background 0.15s ease;
        }
        .card-picker-close:hover { background: rgba(255,255,255,0.1); }
        .card-picker-grid {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-content: flex-start;
        }
        .progress-bar-wrap {
          padding: 8px 16px;
          flex-shrink: 0;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }
        .progress-bar-label {
          display: flex;
          justify-content: space-between;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .progress-bar {
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #c4a050, #e8c97a);
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="builder-page">
        {/* Header */}
        <div className="builder-header">
          <div className="builder-title">Builder</div>
          <div className="builder-overall">
            <div>
              <div className="builder-overall-value">{overall}</div>
              <div className="builder-overall-label">Overall</div>
            </div>
          </div>
        </div>

        {/* Formation tabs */}
        <div className="formation-tabs">
          {FORMATIONS.map((f) => (
            <button
              key={f}
              className={`formation-tab${formation === f ? ' active' : ''}`}
              onClick={() => setFormation(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="progress-bar-wrap">
          <div className="progress-bar-label">
            <span>Équipe</span>
            <span>{filledCount}/{totalSlots}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${(filledCount / totalSlots) * 100}%` }} />
          </div>
        </div>

        {/* Field */}
        <div className="field-area">
          <div className="field-bg" />
          <svg className="field-lines-svg" viewBox="0 0 400 320" preserveAspectRatio="none">
            <rect x="100" y="260" width="200" height="50" fill="none" stroke="white" strokeWidth="1.5"/>
            <ellipse cx="200" cy="200" rx="50" ry="30" fill="none" stroke="white" strokeWidth="1"/>
            <line x1="50" y1="160" x2="350" y2="160" stroke="white" strokeWidth="1"/>
            <rect x="10" y="10" width="380" height="300" fill="none" stroke="white" strokeWidth="1.5"/>
            <rect x="160" y="10" width="80" height="30" fill="none" stroke="white" strokeWidth="1"/>
          </svg>

          <div className="field-content">
            {rows.map((row) => (
              <div key={row} className="field-row">
                {groupedSlots[row].map(({ slot, idx }) => {
                  const isActive = activeSlotIdx === idx
                  const hasCard = slot.card !== null
                  const rarityBg: Record<string, string> = {
                    Elite: '#2a1e04',
                    Advanced: '#05082a',
                    Basic: '#111827',
                  }

                  return (
                    <div
                      key={idx}
                      className="slot-btn"
                      onClick={() => hasCard ? removeCard(idx) : handleSlotClick(idx)}
                    >
                      <div
                        className={`slot-circle${isActive ? ' active-slot' : ''}${hasCard ? ' filled' : ''}`}
                        style={hasCard ? { background: rarityBg[slot.card!.rarity] || '#111' } : {}}
                      >
                        {!hasCard ? (
                          <span>{POSITION_SHORT[slot.position]}</span>
                        ) : (
                          <div className="slot-card-mini">
                            <div className="slot-card-ovr">{slot.card!.stats.overall}</div>
                            <div className="slot-card-name">
                              {slot.card!.name.split(' ')[0]}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="slot-label">
                        {hasCard ? POSITION_SHORT[slot.position] : '+'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Card picker overlay */}
          {activeSlotIdx !== null && (
            <div className="card-picker">
              <div className="card-picker-header">
                <div className="card-picker-title">
                  Choisir {activeSlot ? POSITION_SHORT[activeSlot.position] : ''}
                </div>
                <button className="card-picker-close" onClick={() => setActiveSlotIdx(null)}>
                  ✕
                </button>
              </div>
              <div className="card-picker-grid">
                {compatibleCards.length === 0 && (
                  <div className="empty-state" style={{ width: '100%' }}>
                    <div className="empty-icon">🃏</div>
                    <div className="empty-title">Aucune carte compatible</div>
                    <div className="empty-desc">Ouvre des packs pour obtenir des cartes à ce poste.</div>
                  </div>
                )}
                {compatibleCards.map((card) => (
                  <div
                    key={card.owned_id}
                    onClick={() => handlePickCard(card)}
                    style={{ cursor: 'pointer' }}
                  >
                    <CardComponent card={card} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}