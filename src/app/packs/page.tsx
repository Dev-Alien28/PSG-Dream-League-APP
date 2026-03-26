// src/app/packs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { hasEnoughCoins } from '@/lib/coinEngine'
import PackOpening from '@/components/PackOpening'
import CoinDisplay from '@/components/CoinDisplay'
import type { User } from '@/types/user'
import type { OwnedCard } from '@/types/card'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DropRates {
  Basic: number
  Advanced: number
  Elite: number
}

interface PackDef {
  id: string
  name: string
  description: string
  cost: number
  cardCount: number
  cooldownHours?: number
  dropRates: DropRates
}

interface RawCard {
  id: string
  type: string
  nom: string
  'rareté': 'Basic' | 'Advanced' | 'Elite'
  position: string
  stats: Record<string, number>
  image: string
}

// ─── DONNÉES STATIQUES ────────────────────────────────────────────────────────

const PACK_DEFS: PackDef[] = [
  {
    id: 'free_pack',
    name: 'Pack Gratuit',
    description: 'Un pack offert toutes les 24h. Contient 1 carte aléatoire.',
    cost: 0,
    cardCount: 1,
    cooldownHours: 24,
    dropRates: { Basic: 0.70, Advanced: 0.25, Elite: 0.05 },
  },
  {
    id: 'psg_start',
    name: 'Pack PSG',
    description: '3 cartes tirées au sort. Meilleures chances de rareté.',
    cost: 300,
    cardCount: 3,
    dropRates: { Basic: 0.55, Advanced: 0.35, Elite: 0.10 },
  },
  {
    id: 'pack_event',
    name: 'Pack Élite',
    description: `5 cartes Premium. Chance garantie d'avoir une Elite.`,
    cost: 800,
    cardCount: 5,
    dropRates: { Basic: 0.30, Advanced: 0.50, Elite: 0.20 },
  },
]

const PACK_ICONS = ['🎁', '⚽', '🏆']
const PACK_ACCENTS = ['#4ade80', '#c4a050', '#f59e0b']

const RARITY_COLORS: Record<string, string> = {
  Basic: '#94a3b8',
  Advanced: '#3b82f6',
  Elite: '#f59e0b',
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function computeOverall(stats: Record<string, number>): number {
  const values = Object.values(stats)
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length)
}

function drawCards(pool: RawCard[], count: number, rates: DropRates, userId: string, packId: string): OwnedCard[] {
  const rarities = ['Basic', 'Advanced', 'Elite'] as const
  const cards: OwnedCard[] = []

  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    let cum = 0
    let chosenRarity: 'Basic' | 'Advanced' | 'Elite' = 'Basic'
    for (const r of rarities) {
      cum += rates[r]
      if (roll < cum) { chosenRarity = r; break }
    }

    const eligible = pool.filter((c) => c['rareté'] === chosenRarity)
    const source = eligible.length > 0 ? eligible : pool
    const picked = source[Math.floor(Math.random() * source.length)]
    if (!picked) continue

    const overall = computeOverall(picked.stats)
    cards.push({
      id: picked.id,
      owned_id: `${picked.id}_${Date.now()}_${i}`,
      user_id: userId,
      name: picked.nom,
      category: picked.type as any,
      rarity: picked['rareté'] as any,
      position: picked.position as any,
      image: `/${picked.image}`,
      stats: { ...picked.stats, overall },
      obtained_at: new Date().toISOString(),
      pack_source: packId,
    })
  }

  return cards
}

function getCooldownRemaining(lastPack: string | null): string | null {
  if (!lastPack) return null
  const diff = (Date.now() - new Date(lastPack).getTime()) / (1000 * 60 * 60)
  const rem = 24 - diff
  if (rem <= 0) return null
  const h = Math.floor(rem)
  const m = Math.floor((rem - h) * 60)
  return `${h}h ${m}m`
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PacksPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)
  const [cardPool, setCardPool] = useState<RawCard[]>([])
  const [lastFreePack, setLastFreePack] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [openedCards, setOpenedCards] = useState<OwnedCard[]>([])
  const [currentPackName, setCurrentPackName] = useState('')
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
    })
    setLastFreePack(localStorage.getItem('last_free_pack'))
    import('../../../data/packs/free_pack.json').then((data) => {
      setCardPool((data.default || data) as unknown as RawCard[])
    })
  }, [router])

  const freeCooldown = getCooldownRemaining(lastFreePack)

  const handleBuy = async (pack: PackDef) => {
    if (!user) return
    setErrorMsg(null)
    setLoadingPackId(pack.id)

    if (pack.id === 'free_pack') {
      const cd = getCooldownRemaining(lastFreePack)
      if (cd) {
        setErrorMsg(`Pack gratuit disponible dans ${cd}.`)
        setLoadingPackId(null)
        return
      }
    }

    if (pack.cost > 0) {
      const ok = await hasEnoughCoins(user.id, pack.cost)
      if (!ok) {
        setErrorMsg(`Il te faut ${pack.cost} \u20B1 pour ce pack.`)
        setLoadingPackId(null)
        return
      }
    }

    const cards = drawCards(cardPool, pack.cardCount, pack.dropRates, user.id, pack.id)

    if (pack.id === 'free_pack') {
      const now = new Date().toISOString()
      localStorage.setItem('last_free_pack', now)
      setLastFreePack(now)
    }
    if (pack.cost > 0) {
      setCoins((prev) => prev - pack.cost)
    }

    setLoadingPackId(null)
    setOpenedCards(cards)
    setCurrentPackName(pack.name)
    setOpening(true)
  }

  return (
    <>
      <style>{styles}</style>

      <div className="packs-page">

        {/* Header */}
        <div className="packs-header">
          <div className="packs-header-left">
            <div className="packs-title">Boutique</div>
            <div className="packs-subtitle">Ouvre des packs, enrichis ta collection</div>
          </div>
          {user && <CoinDisplay amount={coins} size="sm" />}
        </div>

        {/* Erreur */}
        {errorMsg && (
          <div className="packs-error">
            <span className="packs-error-icon">⚠️</span>
            {errorMsg}
            <button className="packs-error-close" onClick={() => setErrorMsg(null)}>✕</button>
          </div>
        )}

        {/* Liste des packs */}
        <div className="pack-list">
          {PACK_DEFS.map((pack, idx) => {
            const accent = PACK_ACCENTS[idx]
            const icon = PACK_ICONS[idx]
            const isFree = pack.id === 'free_pack'
            const isLoading = loadingPackId === pack.id
            const isDisabled = isLoading || (isFree && !!freeCooldown) || cardPool.length === 0

            return (
              <div
                key={pack.id}
                className="pack-card"
                style={{ '--accent': accent } as React.CSSProperties}
              >
                <div className="pack-card-stripe" style={{ background: accent }} />

                <div className="pack-card-inner">
                  <div className="pack-icon-col">
                    <div
                      className="pack-icon-wrap"
                      style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
                    >
                      <span className="pack-icon">{icon}</span>
                    </div>
                    <div className="pack-card-count" style={{ color: accent }}>
                      {pack.cardCount} carte{pack.cardCount > 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="pack-info">
                    <div className="pack-name">{pack.name}</div>
                    <div className="pack-desc">{pack.description}</div>
                    <div className="pack-rates">
                      {(['Basic', 'Advanced', 'Elite'] as const).map((r) => (
                        <div key={r} className="pack-rate-pill">
                          <span className="pack-rate-dot" style={{ background: RARITY_COLORS[r] }} />
                          <span className="pack-rate-pct" style={{ color: RARITY_COLORS[r] }}>
                            {Math.round(pack.dropRates[r] * 100)}%
                          </span>
                          <span className="pack-rate-label">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pack-card-footer">
                  {isFree && freeCooldown ? (
                    <div className="pack-cooldown">
                      <span>⏱</span>
                      Disponible dans <strong>{freeCooldown}</strong>
                    </div>
                  ) : (
                    <div className="pack-footer-spacer" />
                  )}

                  <button
                    className={`pack-btn ${isFree ? 'pack-btn-free' : 'pack-btn-paid'}`}
                    style={isFree ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
                    onClick={() => handleBuy(pack)}
                    disabled={isDisabled}
                  >
                    {isLoading
                      ? '…'
                      : isFree
                        ? (freeCooldown ? freeCooldown : 'Gratuit')
                        : `${pack.cost} \u20B1`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {cardPool.length > 0 && (
          <div className="packs-pool-info">
            {cardPool.length} cartes dans le pool &middot; PSG 24/25 &amp; 25/26
          </div>
        )}
      </div>

      {opening && openedCards.length > 0 && (
        <PackOpening
          packName={currentPackName}
          cards={openedCards}
          onClose={() => {
            setOpening(false)
            setOpenedCards([])
          }}
        />
      )}
    </>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = `
  .packs-page {
    padding-bottom: 40px;
    min-height: calc(100dvh - var(--navbar-height));
    background: var(--bg-primary);
  }

  .packs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 14px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
    gap: 12px;
  }
  .packs-header-left { flex: 1; min-width: 0; }
  .packs-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-primary);
    line-height: 1;
  }
  .packs-subtitle {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 3px;
    font-style: italic;
    letter-spacing: 0.03em;
  }

  .packs-error {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 16px 0;
    padding: 10px 14px;
    background: rgba(248,113,113,0.08);
    border: 1px solid rgba(248,113,113,0.25);
    border-radius: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: #f87171;
    font-weight: 600;
    animation: slideDown 0.2s ease;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .packs-error-icon { font-size: 16px; flex-shrink: 0; }
  .packs-error-close {
    margin-left: auto;
    background: none;
    border: none;
    color: #f87171;
    cursor: pointer;
    font-size: 13px;
    padding: 0 2px;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .pack-list {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .pack-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    overflow: hidden;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .pack-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  }
  .pack-card-stripe { height: 3px; width: 100%; }

  .pack-card-inner {
    display: flex;
    gap: 16px;
    padding: 16px 16px 12px;
  }

  .pack-icon-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .pack-icon-wrap {
    width: 60px;
    height: 72px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pack-icon { font-size: 34px; line-height: 1; }
  .pack-card-count {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .pack-info { flex: 1; min-width: 0; }
  .pack-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 5px;
  }
  .pack-desc {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.45;
    margin-bottom: 10px;
  }

  .pack-rates {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .pack-rate-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 20px;
    padding: 3px 8px 3px 6px;
  }
  .pack-rate-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pack-rate-pct {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  .pack-rate-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .pack-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 14px;
    gap: 12px;
    border-top: 1px solid var(--border-subtle);
  }
  .pack-footer-spacer { flex: 1; }
  .pack-cooldown {
    flex: 1;
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0.03em;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .pack-cooldown strong {
    color: var(--text-secondary);
    font-weight: 700;
  }

  .pack-btn {
    padding: 10px 22px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: all 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .pack-btn:active:not(:disabled) { transform: scale(0.96); opacity: 0.9; }
  .pack-btn-free {
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #0a1a0a;
    box-shadow: 0 4px 14px rgba(74,222,128,0.25);
  }
  .pack-btn-paid {
    color: #0a0e1a;
    box-shadow: 0 4px 14px rgba(0,0,0,0.2);
  }
  .pack-btn:disabled {
    background: rgba(255,255,255,0.07) !important;
    color: var(--text-muted) !important;
    box-shadow: none !important;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .packs-pool-info {
    margin: 4px 16px 0;
    text-align: center;
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.5;
  }
`