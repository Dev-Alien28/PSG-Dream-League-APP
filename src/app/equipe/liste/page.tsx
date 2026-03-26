// src/app/equipe/liste/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection } from '@/lib/supabase'
import CardComponent from '@/components/Card'
import type { OwnedCard, CardCategory, CardRarity, PlayerPosition } from '@/types/card'

const CATEGORIES: { value: CardCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'joueur', label: 'Joueurs' },
  { value: 'entraineur', label: 'Entraîneurs' },
  { value: 'trophee', label: 'Trophées' },
]

const RARITIES: { value: CardRarity | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'Basic', label: 'Basic' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Elite', label: 'Elite' },
]

const SORT_OPTIONS = [
  { value: 'overall_desc', label: 'Overall ↓' },
  { value: 'overall_asc', label: 'Overall ↑' },
  { value: 'name_asc', label: 'Nom A→Z' },
  { value: 'date_desc', label: 'Récent' },
]

const RARITY_ORDER: Record<CardRarity, number> = { Elite: 3, Advanced: 2, Basic: 1 }

export default function ListePage() {
  const router = useRouter()
  const [collection, setCollection] = useState<OwnedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CardCategory | 'all'>('all')
  const [rarity, setRarity] = useState<CardRarity | 'all'>('all')
  const [sort, setSort] = useState('overall_desc')
  const [selected, setSelected] = useState<OwnedCard | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      getUserCollection(u.id).then((c) => {
        setCollection(c)
        setLoading(false)
      })
    })
  }, [router])

  const filtered = collection
    .filter((c) => {
      if (category !== 'all' && c.category !== category) return false
      if (rarity !== 'all' && c.rarity !== rarity) return false
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sort) {
        case 'overall_desc': return b.stats.overall - a.stats.overall
        case 'overall_asc': return a.stats.overall - b.stats.overall
        case 'name_asc': return a.name.localeCompare(b.name)
        case 'date_desc': return new Date(b.obtained_at).getTime() - new Date(a.obtained_at).getTime()
        default: return 0
      }
    })

  const statsMap: Record<PlayerPosition, string> = {
    Gardien: 'Arrêt / Agilité / Physique',
    Défenseur: 'Intelligence / Pression / Physique',
    Milieu: 'Technique / Contrôle / Physique',
    Attaquant: 'Frappe / Technique / Physique',
  }

  return (
    <>
      <style>{`
        .liste-page {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - var(--navbar-height));
          background: var(--bg-primary);
        }
        .liste-header {
          padding: 12px 16px 0;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .liste-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .liste-search {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 8px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          margin-bottom: 10px;
          box-sizing: border-box;
        }
        .liste-search::placeholder { color: var(--text-muted); }
        .filter-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 10px;
        }
        .filter-row::-webkit-scrollbar { display: none; }
        .filter-chip {
          padding: 4px 12px;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          letter-spacing: 0.04em;
          transition: all 0.15s;
        }
        .filter-chip.active {
          background: rgba(196,160,80,0.12);
          border-color: rgba(196,160,80,0.35);
          color: #c4a050;
        }
        .filter-divider {
          width: 1px;
          background: var(--border-subtle);
          flex-shrink: 0;
          margin: 2px 2px;
        }
        .sort-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 8px 16px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .sort-row::-webkit-scrollbar { display: none; }
        .sort-chip {
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          letter-spacing: 0.04em;
          transition: all 0.15s;
        }
        .sort-chip.active {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.2);
          color: var(--text-primary);
        }
        .liste-count {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          padding: 6px 16px;
          flex-shrink: 0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .liste-grid {
          flex: 1;
          overflow-y: auto;
          padding: 8px 12px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-content: flex-start;
        }
        .empty-state {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 8px;
        }
        .empty-icon { font-size: 48px; }
        .empty-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .empty-desc {
          font-size: 13px;
          color: var(--text-muted);
          text-align: center;
          max-width: 240px;
        }

        /* Detail modal */
        .detail-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 50;
          display: flex;
          align-items: flex-end;
          animation: fadeIn 0.2s ease;
        }
        .detail-sheet {
          width: 100%;
          background: var(--bg-secondary);
          border-radius: 20px 20px 0 0;
          padding: 20px 20px 40px;
          animation: slideUp 0.25s ease;
          max-height: 70dvh;
          overflow-y: auto;
        }
        .detail-drag {
          width: 40px;
          height: 4px;
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
          margin: 0 auto 16px;
        }
        .detail-top {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          align-items: flex-start;
        }
        .detail-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          line-height: 1.1;
        }
        .detail-meta {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          align-items: center;
          flex-wrap: wrap;
        }
        .detail-badge {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .badge-basic { background: rgba(100,100,100,0.2); color: #aaa; border: 1px solid rgba(100,100,100,0.3); }
        .badge-advanced { background: rgba(50,80,180,0.2); color: #7ca4ff; border: 1px solid rgba(50,80,180,0.3); }
        .badge-elite { background: rgba(196,160,80,0.2); color: #c4a050; border: 1px solid rgba(196,160,80,0.3); }
        .detail-overall {
          font-family: 'Rajdhani', sans-serif;
          font-size: 48px;
          font-weight: 900;
          color: #c4a050;
          line-height: 1;
          margin: 8px 0;
        }
        .detail-overall-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .stats-section {
          border-top: 1px solid var(--border-subtle);
          padding-top: 14px;
        }
        .stats-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 10px;
        }
        .stat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .stat-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          width: 80px;
          flex-shrink: 0;
        }
        .stat-bar {
          flex: 1;
          height: 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
        }
        .stat-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #4a9eff, #7cc3ff);
          transition: width 0.5s ease;
        }
        .stat-bar-fill.high { background: linear-gradient(90deg, #c4a050, #e8c97a); }
        .stat-value {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 900;
          color: var(--text-primary);
          width: 28px;
          text-align: right;
        }
        .detail-desc {
          margin-top: 14px;
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .detail-obtained {
          margin-top: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="liste-page">
        {/* Header + Filtres */}
        <div className="liste-header">
          <div className="liste-title">Collection</div>
          <input
            className="liste-search"
            placeholder="Rechercher une carte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-row">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`filter-chip${category === c.value ? ' active' : ''}`}
                onClick={() => setCategory(c.value as CardCategory | 'all')}
              >
                {c.label}
              </button>
            ))}
            <div className="filter-divider" />
            {RARITIES.map((r) => (
              <button
                key={r.value}
                className={`filter-chip${rarity === r.value ? ' active' : ''}`}
                onClick={() => setRarity(r.value as CardRarity | 'all')}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tri */}
        <div className="sort-row">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`sort-chip${sort === s.value ? ' active' : ''}`}
              onClick={() => setSort(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="liste-count">
          {loading ? '...' : `${filtered.length} carte${filtered.length > 1 ? 's' : ''}`}
        </div>

        {/* Grille */}
        <div className="liste-grid">
          {loading && (
            <div className="empty-state">
              <div className="empty-desc">Chargement...</div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🃏</div>
              <div className="empty-title">Aucune carte</div>
              <div className="empty-desc">
                {collection.length === 0
                  ? 'Ouvre des packs pour commencer ta collection.'
                  : 'Aucune carte ne correspond à ces filtres.'}
              </div>
            </div>
          )}
          {!loading && filtered.map((card) => (
            <div key={card.owned_id} onClick={() => setSelected(card)} style={{ cursor: 'pointer' }}>
              <CardComponent card={card} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Detail sheet */}
      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="detail-drag" />
            <div className="detail-top">
              <CardComponent card={selected} size="sm" />
              <div style={{ flex: 1 }}>
                <div className="detail-name">{selected.name}</div>
                <div className="detail-meta">
                  <span className={`detail-badge badge-${selected.rarity.toLowerCase()}`}>
                    {selected.rarity}
                  </span>
                  {selected.position && (
                    <span className="detail-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                      {selected.position}
                    </span>
                  )}
                </div>
                <div className="detail-overall">{selected.stats.overall}</div>
                <div className="detail-overall-label">Overall</div>
              </div>
            </div>

            <div className="stats-section">
              <div className="stats-title">Statistiques</div>
              {(Object.entries(selected.stats) as [string, number | undefined][])
                .filter(([key, val]) => key !== 'overall' && val !== undefined)
                .map(([key, val]) => (
                  <div key={key} className="stat-row">
                    <div className="stat-label">{key}</div>
                    <div className="stat-bar">
                      <div
                        className={`stat-bar-fill${(val ?? 0) >= 80 ? ' high' : ''}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <div className="stat-value">{val}</div>
                  </div>
                ))}
            </div>

            {selected.description && (
              <div className="detail-desc">{selected.description}</div>
            )}
            <div className="detail-obtained">
              Obtenu le {new Date(selected.obtained_at).toLocaleDateString('fr-FR')} · {selected.pack_source}
            </div>
          </div>
        </div>
      )}
    </>
  )
}