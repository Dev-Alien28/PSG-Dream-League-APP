// src/app/histoire/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { isChapterUnlocked, loadChapter } from '@/lib/storyEngine'
import type { ChapterData } from '@/lib/storyEngine'

const CHAPTERS_META = [
  {
    id: 1,
    title: 'Les Origines',
    subtitle: 'Fondation 1970',
    coverEmoji: '🔵',
    coverGradient: 'linear-gradient(135deg, #001a5e, #003399)',
    accentColor: '#4a7fff',
  },
  {
    id: 2,
    title: `L'Ère QSI`,
    subtitle: 'Rachat 2011',
    coverEmoji: '🌍',
    coverGradient: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    accentColor: '#c4a050',
  },
  {
    id: 3,
    title: 'Les Galactiques',
    subtitle: 'Ibra & Cie',
    coverEmoji: '⭐',
    coverGradient: 'linear-gradient(135deg, #0d2137, #1a3a5c)',
    accentColor: '#f59e0b',
  },
  {
    id: 4,
    title: 'La Remontada',
    subtitle: 'Ligue des Champions',
    coverEmoji: '🏆',
    coverGradient: 'linear-gradient(135deg, #1a0a00, #3d1f00)',
    accentColor: '#ef4444',
  },
  {
    id: 5,
    title: 'MNM',
    subtitle: 'Messi · Neymar · Mbappé',
    coverEmoji: '⚡',
    coverGradient: 'linear-gradient(135deg, #0a1628, #001a4d)',
    accentColor: '#a855f7',
  },
  {
    id: 6,
    title: `L'Ère Kylian`,
    subtitle: '2021 — 2022',
    coverEmoji: '🔵',
    coverGradient: 'linear-gradient(135deg, #001133, #002266)',
    accentColor: '#3b82f6',
  },
]

type ChapterStatus = 'locked' | 'available' | 'completed'

interface ChapterState {
  id: number
  status: ChapterStatus
}

export default function HistoirePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [chapterStates, setChapterStates] = useState<ChapterState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const states: ChapterState[] = []
      for (const meta of CHAPTERS_META) {
        const chapterData = await loadChapter(meta.id)
        if (!chapterData) {
          states.push({ id: meta.id, status: 'locked' })
          continue
        }
        const unlocked = await isChapterUnlocked(user.id, chapterData)
        const completedKey = `chapter_${meta.id}_completed_${user.id}`
        const completed = typeof window !== 'undefined' && !!localStorage.getItem(completedKey)
        states.push({
          id: meta.id,
          status: !unlocked ? 'locked' : completed ? 'completed' : 'available',
        })
      }
      setChapterStates(states)
      setLoading(false)
    }
    init()
  }, [router])

  const getStatus = (id: number): ChapterStatus => {
    return chapterStates.find((s) => s.id === id)?.status ?? 'locked'
  }

  const completedCount = chapterStates.filter((s) => s.status === 'completed').length
  const totalCount = CHAPTERS_META.length

  return (
    <>
      <style>{pageStyles}</style>
      <div className="histoire-page">

        {/* Header */}
        <div className="histoire-header">
          <div className="histoire-header-left">
            <div className="histoire-title">Mode Histoire</div>
            <div className="histoire-subtitle">L&apos;épopée du Paris Saint-Germain</div>
          </div>
          <div className="histoire-progress-wrap">
            <div className="histoire-progress-label">{completedCount}/{totalCount}</div>
            <div className="histoire-progress-bar">
              <div
                className="histoire-progress-fill"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="histoire-loading">
            <div className="histoire-loading-text">Chargement...</div>
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div className="chapter-grid">
            {CHAPTERS_META.map((meta, idx) => {
              const status = getStatus(meta.id)
              const isLocked = status === 'locked'
              const isCompleted = status === 'completed'

              return (
                <div
                  key={meta.id}
                  className={`chapter-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onClick={() => !isLocked && router.push(`/histoire/${meta.id}`)}
                >
                  {/* Cover */}
                  <div
                    className="chapter-cover"
                    style={{ background: isLocked ? 'linear-gradient(135deg, #0a0e1a, #111829)' : meta.coverGradient }}
                  >
                    {/* Noise overlay */}
                    <div className="chapter-cover-noise" />

                    {/* Accent line top */}
                    {!isLocked && (
                      <div className="chapter-accent-line" style={{ background: meta.accentColor }} />
                    )}

                    {/* Emoji or lock */}
                    <div className="chapter-cover-emoji">
                      {isLocked ? '🔒' : meta.coverEmoji}
                    </div>

                    {/* Chapter number */}
                    <div className="chapter-num-badge">
                      CH.{String(meta.id).padStart(2, '0')}
                    </div>

                    {/* Completed badge */}
                    {isCompleted && (
                      <div className="chapter-completed-badge">✓</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="chapter-info">
                    <div className="chapter-info-title" style={{ color: isLocked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {meta.title}
                    </div>
                    <div className="chapter-info-subtitle">{meta.subtitle}</div>
                    <div className="chapter-info-footer">
                      {isLocked && <span className="chapter-status-tag locked-tag">Verrouillé</span>}
                      {!isLocked && !isCompleted && <span className="chapter-status-tag available-tag" style={{ color: meta.accentColor, borderColor: `${meta.accentColor}40`, background: `${meta.accentColor}12` }}>Disponible</span>}
                      {isCompleted && <span className="chapter-status-tag completed-tag">Terminé</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer hint */}
        {!loading && completedCount === 0 && (
          <div className="histoire-hint">
            ⚽ Commence par le Chapitre 1 pour démarrer l&apos;épopée parisienne
          </div>
        )}
      </div>
    </>
  )
}

const pageStyles = `
  .histoire-page {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - var(--navbar-height));
    background: var(--bg-primary);
    padding-bottom: 32px;
  }

  /* Header */
  .histoire-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 16px 14px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
    gap: 16px;
  }
  .histoire-header-left {
    flex: 1;
    min-width: 0;
  }
  .histoire-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-primary);
    line-height: 1;
  }
  .histoire-subtitle {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 3px;
    letter-spacing: 0.04em;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .histoire-progress-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    flex-shrink: 0;
  }
  .histoire-progress-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #c4a050;
    letter-spacing: 0.06em;
  }
  .histoire-progress-bar {
    width: 80px;
    height: 4px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .histoire-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #c4a050, #e8c97a);
    border-radius: 2px;
    transition: width 0.6s ease;
  }

  /* Loading */
  .histoire-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 0;
  }
  .histoire-loading-text {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  /* Grid */
  .chapter-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;
  }

  /* Card */
  .chapter-card {
    border-radius: 14px;
    overflow: hidden;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    animation: cardIn 0.4s ease both;
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .chapter-card:not(.locked):active {
    transform: scale(0.97);
  }
  .chapter-card:not(.locked):hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    border-color: rgba(196,160,80,0.25);
  }
  .chapter-card.locked {
    cursor: default;
    opacity: 0.55;
  }
  .chapter-card.completed {
    border-color: rgba(74,222,128,0.2);
  }

  /* Cover */
  .chapter-cover {
    position: relative;
    height: 110px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .chapter-cover-noise {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.06'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    opacity: 0.4;
    pointer-events: none;
  }
  .chapter-accent-line {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    opacity: 0.9;
  }
  .chapter-cover-emoji {
    font-size: 40px;
    line-height: 1;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
    z-index: 1;
  }
  .chapter-num-badge {
    position: absolute;
    bottom: 8px;
    left: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .chapter-completed-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(74,222,128,0.2);
    border: 1px solid rgba(74,222,128,0.45);
    color: #4ade80;
    font-size: 11px;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  /* Info */
  .chapter-info {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .chapter-info-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chapter-info-subtitle {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .chapter-info-footer {
    margin-top: 5px;
  }
  .chapter-status-tag {
    display: inline-block;
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid transparent;
  }
  .locked-tag {
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.08);
  }
  .available-tag {
    /* dynamic via inline style */
  }
  .completed-tag {
    color: #4ade80;
    background: rgba(74,222,128,0.1);
    border-color: rgba(74,222,128,0.25);
  }

  /* Hint */
  .histoire-hint {
    margin: 4px 16px 0;
    padding: 12px 14px;
    background: rgba(196,160,80,0.06);
    border: 1px solid rgba(196,160,80,0.15);
    border-radius: 10px;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    letter-spacing: 0.03em;
    line-height: 1.5;
  }
`