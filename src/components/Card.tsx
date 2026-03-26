'use client'

import type { OwnedCard, Card } from '@/types/card'
import { RARITY_COLORS, RARITY_LABELS } from '@/lib/cardHelpers'

interface CardProps {
  card: Card | OwnedCard
  size?: 'xs' | 'sm' | 'md' | 'lg'
  selected?: boolean
  onClick?: () => void
  showStats?: boolean
  glow?: boolean
}

const SIZE_CONFIG = {
  xs: { width: 80,  height: 112, radius: 8,  nameFontSize: 8,  rarityFontSize: 7,  statsFontSize: 7,  overallFontSize: 16 },
  sm: { width: 110, height: 154, radius: 10, nameFontSize: 10, rarityFontSize: 8,  statsFontSize: 8,  overallFontSize: 20 },
  md: { width: 150, height: 210, radius: 14, nameFontSize: 13, rarityFontSize: 10, statsFontSize: 10, overallFontSize: 28 },
  lg: { width: 200, height: 280, radius: 18, nameFontSize: 16, rarityFontSize: 12, statsFontSize: 12, overallFontSize: 36 },
}

const POSITION_LABELS: Record<string, string> = {
  Gardien: 'GK',
  Défenseur: 'DEF',
  Milieu: 'MIL',
  Attaquant: 'ATT',
}

const CATEGORY_ICON: Record<string, string> = {
  joueur: '⚽',
  entraineur: '🧠',
  trophee: '🏆',
}

export default function CardComponent({
  card,
  size = 'md',
  selected = false,
  onClick,
  showStats = true,
  glow = false,
}: CardProps) {
  const cfg = SIZE_CONFIG[size]
  const rarityColor = RARITY_COLORS[card.rarity]
  const rarityLabel = RARITY_LABELS[card.rarity]

  const relevantStats = getRelevantStats(card)

  return (
    <>
      <style>{`
        @keyframes cardShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes eliteGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.4), 0 0 24px rgba(245, 158, 11, 0.15); }
          50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.7), 0 0 40px rgba(245, 158, 11, 0.3); }
        }
        .psg-card {
          position: relative;
          border-radius: ${cfg.radius}px;
          cursor: ${onClick ? 'pointer' : 'default'};
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          flex-shrink: 0;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .psg-card:active {
          transform: scale(0.95) !important;
        }
        .psg-card:hover {
          transform: translateY(-3px) scale(1.02);
        }
        .psg-card.selected {
          outline: 2px solid #c4a050;
          outline-offset: 2px;
        }
        .psg-card.elite-glow {
          animation: eliteGlow 2.5s ease infinite;
        }
        .card-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255,255,255,0.06) 50%,
            transparent 70%
          );
          background-size: 200% 100%;
          animation: cardShimmer 3s linear infinite;
          pointer-events: none;
          z-index: 3;
        }
      `}</style>

      <div
        className={`psg-card${selected ? ' selected' : ''}${(glow || card.rarity === 'Elite') ? ' elite-glow' : ''}`}
        style={{
          width: cfg.width,
          height: cfg.height,
          background: getCardBackground(card.rarity),
          border: `1px solid ${rarityColor}40`,
          boxShadow: !glow && card.rarity !== 'Elite'
            ? `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`
            : undefined,
        }}
        onClick={onClick}
      >
        {card.rarity === 'Elite' && <div className="card-shimmer" />}

        {/* Bande supérieure rareté */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
        }} />

        {/* Zone image */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 10,
          right: 10,
          height: cfg.height * 0.44,
          borderRadius: cfg.radius - 4,
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.image}
            alt={card.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          {/* Fallback overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: cfg.height * 0.12,
          }}>
            {CATEGORY_ICON[card.category]}
          </div>
        </div>

        {/* Overall badge */}
        <div style={{
          position: 'absolute',
          top: 10,
          left: 8,
          background: 'rgba(0,0,0,0.7)',
          border: `1px solid ${rarityColor}60`,
          borderRadius: 6,
          padding: '2px 5px',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{
            fontSize: cfg.overallFontSize * 0.45,
            fontWeight: 900,
            color: rarityColor,
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '-0.02em',
          }}>
            {card.stats.overall}
          </span>
        </div>

        {/* Position badge */}
        {card.position && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 8,
            background: rarityColor,
            borderRadius: 4,
            padding: '2px 5px',
          }}>
            <span style={{
              fontSize: cfg.rarityFontSize * 0.8,
              fontWeight: 800,
              color: '#0a0e1a',
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.03em',
            }}>
              {POSITION_LABELS[card.position] || card.position}
            </span>
          </div>
        )}

        {/* Nom + rareté */}
        <div style={{
          position: 'absolute',
          bottom: showStats ? cfg.height * 0.28 : 10,
          left: 8,
          right: 8,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: cfg.nameFontSize,
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {card.name}
          </div>
          <div style={{
            fontSize: cfg.rarityFontSize * 0.85,
            color: rarityColor,
            fontFamily: 'Rajdhani, sans-serif',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 1,
          }}>
            {rarityLabel}
          </div>
        </div>

        {/* Stats */}
        {showStats && relevantStats.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            right: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '3px',
          }}>
            {relevantStats.map(({ key, value }) => (
              <div key={key} style={{
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 4,
                padding: '2px 3px',
                textAlign: 'center',
                backdropFilter: 'blur(4px)',
              }}>
                <div style={{
                  fontSize: cfg.statsFontSize * 0.75,
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'Rajdhani, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {STAT_LABELS[key] || key}
                </div>
                <div style={{
                  fontSize: cfg.statsFontSize,
                  fontWeight: 800,
                  color: getStatColor(value),
                  fontFamily: 'Rajdhani, sans-serif',
                  lineHeight: 1,
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Borde inférieure décorative */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${rarityColor}50, transparent)`,
        }} />
      </div>
    </>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCardBackground(rarity: string): string {
  switch (rarity) {
    case 'Elite':
      return 'linear-gradient(135deg, #1a1200 0%, #2a1e04 30%, #1a1500 60%, #0d0d0d 100%)'
    case 'Advanced':
      return 'linear-gradient(135deg, #050d2a 0%, #0a1840 40%, #050d2a 100%)'
    default:
      return 'linear-gradient(135deg, #0f1117 0%, #1a1e2a 50%, #0f1117 100%)'
  }
}

const STAT_LABELS: Record<string, string> = {
  physique: 'PHY',
  agilité: 'AGI',
  arrêt: 'ARR',
  intelligence: 'INT',
  pression: 'PRE',
  technique: 'TEC',
  contrôle: 'CTR',
  frappe: 'FRA',
}

function getRelevantStats(card: Card | OwnedCard): { key: string; value: number }[] {
  const { overall: _overall, ...rest } = card.stats
  return Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .slice(0, 3)
    .map(([key, value]) => ({ key, value: value as number }))
}

function getStatColor(value: number): string {
  if (value >= 85) return '#4ade80'
  if (value >= 70) return '#facc15'
  if (value >= 55) return '#fb923c'
  return '#f87171'
}