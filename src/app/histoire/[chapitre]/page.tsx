// src/app/histoire/[chapitre]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection } from '@/lib/supabase'
import {
  loadChapter,
  isChapterUnlocked,
  completeChapter,
  evaluateObjectives,
} from '@/lib/storyEngine'
import { simulateMatch as runMatch } from '@/lib/matchEngine'
import { computeTeamOverall } from '@/lib/cardHelpers'
import type { ChapterData } from '@/lib/storyEngine'
import type { OwnedCard, PlayerPosition } from '@/types/card'
import type { Formation, TeamSlot, MatchResult } from '@/types/match'

const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = {
  '4-3-3': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant', 'Attaquant'],
  '4-4-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '4-2-3-1': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant'],
  '3-5-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '5-3-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
}

type Phase = 'loading' | 'locked' | 'intro' | 'select_team' | 'in_progress' | 'result'

export default function ChapiterPage() {
  const router = useRouter()
  const params = useParams()
  const chapterId = Number(params.chapitre)

  const [phase, setPhase] = useState<Phase>('loading')
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [collection, setCollection] = useState<OwnedCard[]>([])
  const [selectedFormation] = useState<Formation>('4-3-3')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [objectivesResult, setObjectivesResult] = useState<{
    passed: boolean; objectivesMetCount: number; total: number
  } | null>(null)
  const [eventIdx, setEventIdx] = useState(0)

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) { router.replace('/login'); return }
      setUserId(user.id)

      const chapterData = await loadChapter(chapterId)
      if (!chapterData) { router.replace('/histoire'); return }
      setChapter(chapterData)

      const unlocked = await isChapterUnlocked(user.id, chapterData)
      if (!unlocked) { setPhase('locked'); return }

      const col = await getUserCollection(user.id)
      setCollection(col)
      setPhase('intro')
    }
    init()
  }, [chapterId, router])

  async function handleStartMatch() {
    if (!chapter || !userId) return
    setPhase('in_progress')
    setEventIdx(0)

    // Construire équipe joueur (cartes aléatoires de la collection pour simplifier)
    const positions = FORMATION_LAYOUTS[selectedFormation]
    const slots: TeamSlot[] = positions.map((position) => {
      const compatible = collection.filter((c) => c.position === position)
      const card = compatible.length > 0 ? compatible[0] : null
      return { position, card }
    })

    const playerTeam = {
      user_id: userId,
      pseudo: 'Toi',
      formation: selectedFormation,
      slots,
      overall: computeTeamOverall(slots),
    }

    const matchResult = await runMatch(playerTeam, chapter.opponent)
    setResult(matchResult)

    // Animer les événements
    let i = 0
    const interval = setInterval(() => {
      i++
      setEventIdx(i)
      if (i >= matchResult.events.length) {
        clearInterval(interval)
        setTimeout(async () => {
          const outcome = {
            playerScore: matchResult.score_home,
            opponentScore: matchResult.score_away,
            playerWon: matchResult.winner === 'home',
          }
          const objResult = evaluateObjectives(chapter, outcome)
          setObjectivesResult(objResult)

          if (objResult.passed) {
            const { coinsEarned: c, isFirstTime: first } = await completeChapter(userId, chapterId)
            setCoinsEarned(c)
            setIsFirstTime(first)
          }
          setPhase('result')
        }, 1000)
      }
    }, 600)
  }

  if (phase === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - var(--navbar-height))' }}>
        <div style={{ fontFamily: 'Rajdhani, sans-serif', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 13 }}>
          Chargement...
        </div>
      </div>
    )
  }

  if (phase === 'locked') {
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="chapter-page">
          <div className="chapter-header">
            <button className="back-btn" onClick={() => router.push('/histoire')}>←</button>
            <div className="chapter-header-title">Chapitre {chapterId}</div>
          </div>
          <div className="locked-state">
            <div className="locked-icon">🔒</div>
            <div className="locked-title">Chapitre verrouillé</div>
            <div className="locked-desc">Complète le chapitre précédent pour débloquer celui-ci.</div>
            <button className="action-btn" onClick={() => router.push('/histoire')}>
              Retour à l&apos;histoire
            </button>
          </div>
        </div>
      </>
    )
  }

  if (phase === 'intro' && chapter) {
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="chapter-page">
          <div className="chapter-header">
            <button className="back-btn" onClick={() => router.push('/histoire')}>←</button>
            <div className="chapter-header-title">Chapitre {chapterId}</div>
          </div>

          <div className="intro-content">
            <div className="intro-cover" style={{ backgroundImage: chapter.coverImage ? `url(${chapter.coverImage})` : undefined }}>
              <div className="intro-cover-overlay" />
              <div className="intro-title-block">
                <div className="intro-chapter-num">CHAPITRE {chapterId}</div>
                <div className="intro-title">{chapter.title}</div>
                <div className="intro-subtitle">{chapter.subtitle}</div>
              </div>
            </div>

            <div className="intro-body">
              <div className="intro-desc">{chapter.description}</div>

              <div className="section-label">Adversaire</div>
              <div className="opponent-card">
                <div className="opponent-name">{chapter.opponent.pseudo}</div>
                <div className="opponent-meta">
                  <span className="opponent-formation">{chapter.opponent.formation}</span>
                  <span className="opponent-overall">{chapter.opponent.overall} OVR</span>
                </div>
              </div>

              <div className="section-label">Objectifs</div>
              <div className="objectives-list">
                {chapter.objectives.map((obj, i) => (
                  <div key={i} className="objective-row">
                    <span className="objective-icon">
                      {obj.type === 'win' ? '🏆' : obj.type === 'score_goals' ? '⚽' : obj.type === 'clean_sheet' ? '🧤' : '📏'}
                    </span>
                    <span className="objective-label">{obj.label}</span>
                  </div>
                ))}
              </div>

              <div className="section-label">Récompense</div>
              <div className="reward-row">
                <span className="coin-icon">🪙</span>
                <span className="reward-value">{chapter.reward} PSG Coins</span>
              </div>

              <button className="action-btn primary" onClick={handleStartMatch}>
                Lancer le match
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (phase === 'in_progress' && result) {
    const visibleEvents = result.events.slice(0, eventIdx)
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="chapter-page">
          <div className="chapter-header">
            <div className="chapter-header-title">{chapter?.title}</div>
          </div>

          <div className="match-view">
            <div className="scoreboard">
              <div className="team-score-block">
                <div className="team-label">PSG</div>
                <div className="score-num">{result.score_home}</div>
              </div>
              <div className="score-sep">—</div>
              <div className="team-score-block">
                <div className="team-label">{chapter?.opponent.pseudo}</div>
                <div className="score-num">{result.score_away}</div>
              </div>
            </div>

            <div className="events-stream">
              {visibleEvents.map((ev, i) => (
                <div key={i} className={`event-row ${ev.team === 'home' ? 'home' : 'away'}`}>
                  <span className="event-min">{ev.minute}&apos;</span>
                  <span className="event-icon">
                    {ev.type === 'but' ? '⚽' : ev.type === 'arret' ? '🧤' : ev.type === 'occasion' ? '💨' : '🟨'}
                  </span>
                  <span className="event-player">{ev.player_name}</span>
                </div>
              ))}
              {visibleEvents.length === 0 && (
                <div className="event-waiting">Match en cours...</div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (phase === 'result' && result && chapter && objectivesResult) {
    const won = objectivesResult.passed
    return (
      <>
        <style>{sharedStyles}</style>
        <div className="chapter-page">
          <div className="chapter-header">
            <div className="chapter-header-title">Résultat</div>
          </div>

          <div className="result-view">
            <div className={`result-banner ${won ? 'win' : 'loss'}`}>
              <div className="result-emoji">{won ? '🏆' : '💔'}</div>
              <div className="result-title">{won ? 'Victoire !' : 'Défaite'}</div>
              <div className="result-score">{result.score_home} — {result.score_away}</div>
            </div>

            <div className="result-body">
              <div className="section-label">Objectifs</div>
              {chapter.objectives.map((obj, i) => {
                const outcome = {
                  playerScore: result.score_home,
                  opponentScore: result.score_away,
                  playerWon: result.winner === 'home',
                }
                let met = false
                switch (obj.type) {
                  case 'win': met = outcome.playerWon; break
                  case 'score_goals': met = outcome.playerScore >= (obj.value ?? 1); break
                  case 'clean_sheet': met = outcome.opponentScore === 0; break
                  case 'win_by_margin': met = outcome.playerWon && outcome.playerScore - outcome.opponentScore >= (obj.value ?? 2); break
                }
                return (
                  <div key={i} className={`objective-row ${met ? 'met' : 'missed'}`}>
                    <span className="objective-check">{met ? '✅' : '❌'}</span>
                    <span className="objective-label">{obj.label}</span>
                  </div>
                )
              })}

              {won && (
                <div className="coins-earned-block">
                  <span className="coin-icon">🪙</span>
                  <span className="coins-earned-value">+{chapter.reward} PSG Coins</span>
                  {isFirstTime && <span className="first-time-badge">Première fois !</span>}
                </div>
              )}

              {!won && (
                <div className="retry-hint">Entraîne-toi et améliore ton équipe !</div>
              )}

              <button className="action-btn primary" onClick={() => router.push('/histoire')}>
                Retour à l&apos;histoire
              </button>
              {won && (
                <button className="action-btn" onClick={() => router.push('/packs')}>
                  Ouvrir des packs
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}

const sharedStyles = `
  .chapter-page {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--navbar-height));
    background: var(--bg-primary);
    overflow: hidden;
  }
  .chapter-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }
  .chapter-header-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .back-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .intro-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .intro-cover {
    position: relative;
    height: 200px;
    background: linear-gradient(135deg, #001133, #003366);
    background-size: cover;
    background-position: center;
    flex-shrink: 0;
  }
  .intro-cover-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.7));
  }
  .intro-title-block {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
  }
  .intro-chapter-num {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #c4a050;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .intro-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .intro-subtitle {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
    font-style: italic;
  }
  .intro-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .intro-desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
  }
  .section-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 4px;
  }
  .opponent-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .opponent-name {
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .opponent-meta { display: flex; gap: 8px; align-items: center; }
  .opponent-formation {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 700;
  }
  .opponent-overall {
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 900;
    color: #c4a050;
  }
  .objectives-list { display: flex; flex-direction: column; gap: 8px; }
  .objective-row {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .objective-row.met { border-color: rgba(80,200,80,0.3); background: rgba(80,200,80,0.05); }
  .objective-row.missed { border-color: rgba(200,80,80,0.3); background: rgba(200,80,80,0.05); }
  .objective-icon { font-size: 18px; }
  .objective-check { font-size: 16px; }
  .objective-label { font-size: 13px; color: var(--text-secondary); }
  .reward-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(196,160,80,0.08);
    border: 1px solid rgba(196,160,80,0.2);
    border-radius: 8px;
    padding: 10px 14px;
  }
  .coin-icon { font-size: 20px; }
  .reward-value {
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #c4a050;
  }
  .action-btn {
    width: 100%;
    padding: 14px;
    border-radius: 10px;
    border: 1px solid var(--border-subtle);
    background: rgba(255,255,255,0.04);
    color: var(--text-secondary);
    font-family: 'Rajdhani', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 4px;
  }
  .action-btn.primary {
    background: linear-gradient(135deg, #c4a050, #a07830);
    border-color: #c4a050;
    color: #fff;
  }
  .action-btn.primary:active { opacity: 0.85; }

  /* Locked */
  .locked-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 20px;
  }
  .locked-icon { font-size: 56px; }
  .locked-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .locked-desc {
    font-size: 14px;
    color: var(--text-muted);
    text-align: center;
    max-width: 260px;
  }

  /* Match view */
  .match-view {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .scoreboard {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 24px 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }
  .team-score-block { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .team-label {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .score-num {
    font-family: 'Rajdhani', sans-serif;
    font-size: 52px;
    font-weight: 900;
    line-height: 1;
    color: var(--text-primary);
  }
  .score-sep {
    font-family: 'Rajdhani', sans-serif;
    font-size: 28px;
    color: var(--text-muted);
    line-height: 1;
    margin-top: 16px;
  }
  .events-stream {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .event-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-subtle);
    animation: fadeIn 0.3s ease;
  }
  .event-row.home { border-left: 3px solid #c4a050; }
  .event-row.away { border-left: 3px solid rgba(255,255,255,0.15); }
  .event-min {
    font-family: 'Rajdhani', sans-serif;
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    width: 30px;
  }
  .event-icon { font-size: 16px; }
  .event-player {
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .event-waiting {
    font-family: 'Rajdhani', sans-serif;
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 40px 0;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Result */
  .result-view { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
  .result-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    gap: 6px;
  }
  .result-banner.win { background: linear-gradient(135deg, rgba(196,160,80,0.15), rgba(196,160,80,0.05)); }
  .result-banner.loss { background: rgba(200,60,60,0.05); }
  .result-emoji { font-size: 52px; }
  .result-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: 32px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .result-score {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-muted);
    letter-spacing: 0.1em;
  }
  .result-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .coins-earned-block {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(196,160,80,0.1);
    border: 1px solid rgba(196,160,80,0.25);
    border-radius: 10px;
    padding: 14px;
  }
  .coins-earned-value {
    font-family: 'Rajdhani', sans-serif;
    font-size: 20px;
    font-weight: 900;
    color: #c4a050;
  }
  .first-time-badge {
    font-family: 'Rajdhani', sans-serif;
    font-size: 10px;
    font-weight: 700;
    background: rgba(196,160,80,0.25);
    color: #c4a050;
    padding: 3px 8px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-left: auto;
  }
  .retry-hint {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
    padding: 8px 0;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`