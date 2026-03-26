// src/app/collection/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection } from '@/lib/supabase'
import CardComponent from '@/components/Card'
import {
  filterByCategory,
  filterByRarity,
  filterByName,
  sortByOverall,
  sortByRarity,
  countByRarity,
} from '@/lib/cardHelpers'
import type { OwnedCard, CardRarity, CardCategory } from '@/types/card'

type SortMode = 'overall' | 'rarity' | 'name'
type FilterRarity = CardRarity | 'all'
type FilterCategory = CardCategory | 'all'

export default function CollectionPage() {
  const router = useRouter()
  const [cards, setCards] = useState<OwnedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRarity, setFilterRarity] = useState<FilterRarity>('all')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')
  const [sortMode, setSortMode] = useState<SortMode>('overall')

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      getUserCollection(u.id).then((c) => {
        setCards(c)
        setLoading(false)
      })
    })
  }, [router])

  const filtered = (() => {
    let result = [...cards]
    if (filterCategory !== 'all') result = filterByCategory(result, filterCategory)
    if (filterRarity !== 'all') result = filterByRarity(result, filterRarity)
    if (search.trim()) result = filterByName(result, search)
    if (sortMode === 'overall') result = sortByOverall(result)
    if (sortMode === 'rarity') result = sortByRarity(result)
    if (sortMode === 'name') result = result.sort((a, b) => a.name.localeCompare(b.name))
    return result
  })()

  const counts = countByRarity(cards)

  const RARITIES: { value: FilterRarity; label: string; color: string }[] = [
    { value: 'all', label: 'Toutes', color: 'var(--text-muted)' },
    { value: 'Elite', label: 'Elite', color: '#f59e0b' },
    { value: 'Advanced', label: 'Advanced', color: '#3b82f6' },
    { value: 'Basic', label: 'Basic', color: '#94a3b8' },
  ]

  const CATEGORIES: { value: FilterCategory; label: string; icon: string }[] = [
    { value: 'all', label: 'Tous', icon: '🃏' },
    { value: 'joueur', label: 'Joueurs', icon: '⚽' },
    { value: 'entraineur', label: 'Entraîneurs', icon: '🧠' },
    { value: 'trophee', label: 'Trophées', icon: '🏆' },
  ]

  return (
    <>
      <style>{`
        .collection-header {
          padding: 16px 16px 0;
        }
        .collection-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .collection-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 24px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .collection-count {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .rarity-stats {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .rarity-stat {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          padding: 8px 10px;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .rarity-stat-count {
          font-family: 'Rajdhani', sans-serif;
          font-size: 20px;
          font-weight: 700;
          line-height: 1;
        }
        .rarity-stat-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 2px;
        }
        .search-bar {
          position: relative;
          margin-bottom: 10px;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          padding: 10px 16px 10px 38px;
          color: var(--text-primary);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .search-input:focus { border-color: var(--border-gold); }
        .search-input::placeholder { color: var(--text-muted); }
        .filter-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 8px 0;
          scrollbar-width: none;
          margin-bottom: 4px;
        }
        .filter-tabs::-webkit-scrollbar { display: none; }
        .filter-tab {
          padding: 5px 12px;
          border-radius: 20px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          letter-spacing: 0.05em;
        }
        .filter-tab.active {
          color: var(--text-primary);
        }
        .sort-row {
          display: flex;
          gap: 6px;
          padding: 0 0 12px;
        }
        .sort-btn {
          padding: 4px 10px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: all 0.15s ease;
        }
        .sort-btn.active {
          background: rgba(196,160,80,0.1);
          border-color: var(--border-gold);
          color: var(--psg-gold);
        }
        .collection-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 0 12px 24px;
          justify-content: flex-start;
        }
        @keyframes cardAppear {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .collection-grid > * {
          animation: cardAppear 0.2s ease both;
        }
      `}</style>

      <div>
        <div className="collection-header">
          <div className="collection-title-row">
            <span className="collection-title">Collection</span>
            <span className="collection-count">{cards.length} cartes</span>
          </div>

          {/* Rarity stats */}
          <div className="rarity-stats">
            <div className="rarity-stat">
              <div className="rarity-stat-count" style={{ color: '#f59e0b' }}>{counts.Elite}</div>
              <div className="rarity-stat-label">Elite</div>
            </div>
            <div className="rarity-stat">
              <div className="rarity-stat-count" style={{ color: '#3b82f6' }}>{counts.Advanced}</div>
              <div className="rarity-stat-label">Advanced</div>
            </div>
            <div className="rarity-stat">
              <div className="rarity-stat-count" style={{ color: '#94a3b8' }}>{counts.Basic}</div>
              <div className="rarity-stat-label">Basic</div>
            </div>
          </div>

          {/* Search */}
          <div className="search-bar">
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="search-input"
              placeholder="Rechercher un joueur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="filter-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`filter-tab${filterCategory === c.value ? ' active' : ''}`}
                style={filterCategory === c.value ? { background: 'rgba(196,160,80,0.1)', borderColor: 'rgba(196,160,80,0.35)', color: '#c4a050' } : {}}
                onClick={() => setFilterCategory(c.value)}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Rarity filter */}
          <div className="filter-tabs">
            {RARITIES.map((r) => (
              <button
                key={r.value}
                className={`filter-tab${filterRarity === r.value ? ' active' : ''}`}
                style={filterRarity === r.value ? { background: `${r.color}18`, borderColor: `${r.color}40`, color: r.color } : {}}
                onClick={() => setFilterRarity(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="sort-row">
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Trier :</span>
            {[
              { value: 'overall', label: 'Overall' },
              { value: 'rarity', label: 'Rareté' },
              { value: 'name', label: 'Nom' },
            ].map((s) => (
              <button
                key={s.value}
                className={`sort-btn${sortMode === s.value ? ' active' : ''}`}
                onClick={() => setSortMode(s.value as SortMode)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="loader-center"><div className="loader" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🃏</div>
            <div className="empty-title">Aucune carte</div>
            <div className="empty-desc">Ouvre des packs dans la boutique pour obtenir des cartes !</div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="collection-grid">
            {filtered.map((card, i) => (
              <div key={card.owned_id} style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}>
                <CardComponent card={card} size="sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}