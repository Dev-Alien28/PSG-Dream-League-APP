// src/app/match/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection, saveMatchResult } from '@/lib/supabase'
import { simulateMatch, getMatchSummary, getScorers } from '@/lib/matchEngine'
import { searchForOpponent } from '@/lib/matchmaking'
import { rewardMatch } from '@/lib/coinEngine'
import { computeTeamOverall } from '@/lib/cardHelpers'
import CoinDisplay from '@/components/CoinDisplay'
import Minigame from '@/components/Minigame'
import type { User } from '@/types/user'
import type { Team, MatchResult, Formation } from '@/types/match'
import type { OwnedCard, PlayerPosition } from '@/types/card'

const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = {
  '4-3-3': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant', 'Attaquant'],
  '4-4-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '4-2-3-1': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant'],
  '3-5-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '5-3-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
}

type PageState = 'idle' | 'searching' | 'found' | 'playing' | 'result' | 'minigame'

export default function MatchPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)
  const [pageState, setPageState] = useState<PageState>('idle')
  const [matchStatus, setMatchStatus] = useState<string>('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [showMinigame, setShowMinigame] = useState(false)
  const [userTeam, setUserTeam] = useState<Team | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
      // Build team from collection
      getUserCollection(u.id).then((col) => {
        const formation: Formation = '4-3-3'
        const positions = FORMATION_LAYOUTS[formation]
        const usedIds = new Set<string>()
        const slots = positions.map((position) => {
          const available = col.filter(
            (c) => c.category === 'joueur' && c.position === position && !usedIds.has(c.owned_id)
          )
          available.sort((a, b) => b.stats.overall - a.stats.overall)
          const card = available[0] || null
          if (card) usedIds.add(card.owned_id)
          return { position, card }
        })
        const overall = computeTeamOverall(slots)
        setUserTeam({
          user_id: u.id,
          pseudo: u.pseudo,
          formation,
          slots,
          overall,
        })
      })
    })
  }, [router])

  const handleSearch = async () => {
    if (!userTeam || !user) return
    setPageState('searching')
    setMatchStatus(`Recherche d'un adversaire\u2026`)

    const { opponent, isBot } = await searchForOpponent(userTeam, (status) => {
      if (status === 'found') setMatchStatus('Adversaire trouvé !')
      if (status === 'bot') setMatchStatus(`Aucun adversaire disponible \u2014 un bot te rejoint !`)
    })

    setMatchStatus(isBot ? '🤖 Bot prêt !' : '✅ Adversaire trouvé !')
    setPageState('found')

    await new Promise((r) => setTimeout(r, 1200))
    setPageState('playing')
    setMatchStatus(`Match en cours\u2026`)
    await new Promise((r) => setTimeout(r, 2000))

    const matchResult = simulateMatch(userTeam, opponent, isBot)
    await saveMatchResult(matchResult)

    const resultType = matchResult.winner === 'home' ? 'win' : matchResult.winner === 'draw' ? 'draw' : 'loss'
    const earned = await rewardMatch(user.id, resultType)
    setCoins((prev) => prev + earned)

    setResult(matchResult)
    setPageState('result')
  }

  const handleReset = () => {
    setPageState('idle')
    setResult(null)
  }

  if (!user) return <div className="loader-center"><div className="loader" /></div>

  return (
    <>
      <style>{`
        .match-page { padding: 0 0 32px; }
        .match-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .match-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .match-team-card {
          margin: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .match-team-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, #001a5e20, #001a5e10);
          border: 1px solid rgba(0,26,94,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
        }
        .match-team-info { flex: 1; }
        .match-team-pseudo {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .match-team-meta {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 3px;
        }
        .match-team-overall {
          font-family: 'Rajdhani', sans-serif;
          font-size: 36px;
          font-weight: 900;
          color: #c4a050;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .match-btn-wrap { padding: 16px; }

        /* Searching state */
        .match-status-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          gap: 20px;
          text-align: center;
          min-height: 300px;
        }
        @keyframes searchPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.7; }
        }
        .search-icon-big {
          font-size: 60px;
          animation: searchPulse 1.5s ease infinite;
        }
        .search-status-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .search-dots {
          display: flex;
          gap: 8px;
        }
        .search-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c4a050;
          animation: pulse 1.2s ease infinite;
        }
        .search-dot:nth-child(2) { animation-delay: 0.2s; }
        .search-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }

        /* Result */
        .result-screen { padding: 16px; animation: slideUp 0.3s ease; }
        .result-score-board {
          background: linear-gradient(135deg, #0d1229, #111829);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          margin-bottom: 14px;
        }
        .result-teams {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .result-team-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          flex: 1;
        }
        .result-team-name.home { text-align: left; }
        .result-team-name.away { text-align: right; }
        .result-score {
          font-family: 'Rajdhani', sans-serif;
          font-size: 52px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          line-height: 1;
          padding: 0 16px;
        }
        .result-badge {
          display: inline-block;
          padding: 6px 20px;
          border-radius: 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .result-win { background: rgba(74,222,128,0.15); color: #4ade80; border: 1px solid rgba(74,222,128,0.3); }
        .result-loss { background: rgba(248,113,113,0.15); color: #f87171; border: 1px solid rgba(248,113,113,0.3); }
        .result-draw { background: rgba(196,160,80,0.15); color: #c4a050; border: 1px solid rgba(196,160,80,0.3); }
        .result-coins {
          margin-top: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          color: #c4a050;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .result-events {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
        }
        .result-events-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .result-event {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .result-event:last-child { border-bottom: none; }
        .event-min {
          font-size: 11px;
          color: var(--text-muted);
          min-width: 28px;
        }
        .event-but { color: #4ade80; }
        .result-actions { display: flex; flex-direction: column; gap: 10px; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

        /* Minigame section */
        .minigame-section { padding: 16px; }
        .minigame-section-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }
      `}</style>

      <div className="match-page">
        {/* Header */}
        <div className="match-header">
          <div className="match-title">Match</div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        {/* IDLE */}
        {pageState === 'idle' && (
          <>
            {userTeam && (
              <div className="match-team-card">
                <div className="match-team-icon">⚜️</div>
                <div className="match-team-info">
                  <div className="match-team-pseudo">{userTeam.pseudo}</div>
                  <div className="match-team-meta">{userTeam.formation} · {userTeam.slots.filter(s => s.card).length}/11 joueurs</div>
                </div>
                <div className="match-team-overall">{userTeam.overall}</div>
              </div>
            )}
            <div className="match-btn-wrap">
              <button
                className="btn btn-gold"
                style={{ width: '100%', padding: '16px', fontSize: 17, borderRadius: 14 }}
                onClick={handleSearch}
                disabled={!userTeam || userTeam.slots.filter(s => s.card).length < 5}
              >
                ⚽ Lancer la recherche
              </button>
              {userTeam && userTeam.slots.filter(s => s.card).length < 5 && (
                <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
                  Il te faut au moins 5 cartes dans ton équipe.
                </div>
              )}
            </div>

            {/* Minigame section */}
            <div className="minigame-section">
              <div className="minigame-section-title">🎯 Mini-jeu penalty — Gagne 25 ₱</div>
              <Minigame
                reward={25}
                onWin={(earned) => setCoins((prev) => prev + earned)}
              />
            </div>
          </>
        )}

        {/* SEARCHING / FOUND / PLAYING */}
        {(pageState === 'searching' || pageState === 'found' || pageState === 'playing') && (
          <div className="match-status-screen">
            <div className="search-icon-big">
              {pageState === 'playing' ? '⚽' : pageState === 'found' ? '🤝' : '🔍'}
            </div>
            <div className="search-status-text">{matchStatus}</div>
            <div className="search-dots">
              <div className="search-dot" />
              <div className="search-dot" />
              <div className="search-dot" />
            </div>
          </div>
        )}

        {/* RESULT */}
        {pageState === 'result' && result && (
          <div className="result-screen">
            <div className="result-score-board">
              <div className="result-teams">
                <div className="result-team-name home">{result.home.pseudo}</div>
                <div className="result-score">{result.score_home} — {result.score_away}</div>
                <div className="result-team-name away">{result.away.pseudo}</div>
              </div>
              <span className={`result-badge ${result.winner === 'home' ? 'result-win' : result.winner === 'away' ? 'result-loss' : 'result-draw'}`}>
                {result.winner === 'home' ? '🏆 Victoire !' : result.winner === 'away' ? '💀 Défaite' : '🤝 Nul'}
              </span>
              <div className="result-coins">+{result.coins_earned} ₱ gagnés</div>
            </div>

            {/* Events */}
            {result.events.filter(e => e.type === 'but').length > 0 && (
              <div className="result-events">
                <div className="result-events-title">⚽ Buts</div>
                {result.events.filter(e => e.type === 'but').map((e, i) => (
                  <div key={i} className="result-event">
                    <span className="event-min">{e.minute}&apos;</span>
                    <span className="event-but">⚽</span>
                    <span>{e.player_name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                      {e.team === 'home' ? result.home.pseudo : result.away.pseudo}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="result-actions">
              <button className="btn btn-gold" style={{ width: '100%', padding: '14px', borderRadius: 12 }} onClick={handleReset}>
                Rejouer
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', padding: '12px', borderRadius: 12 }} onClick={() => router.push('/collection')}>
                Voir ma collection
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}