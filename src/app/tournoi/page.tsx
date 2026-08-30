// src/app/tournoi/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { getUserCollection, saveMatchResult } from '@/lib/supabase'
import { loadPlayerTeam } from '@/lib/teamHelpers'
import { simulateMatch } from '@/lib/matchEngine'
import { generateBotTeam } from '@/lib/matchmaking'
import { rewardTournamentRound, rewardTournamentChampion, COIN_REWARDS } from '@/lib/coinEngine'
import { computeTeamOverall } from '@/lib/cardHelpers'
import { TEAM_COLOR_PALETTE } from '@/lib/shopData'
import { playWhistle, playVictory, playDefeat, playClick } from '@/lib/soundEngine'
import { tryClaimMilestone } from '@/lib/milestones'
import CoinDisplay from '@/components/CoinDisplay'
import type { User } from '@/types/user'
import type { Team, MatchResult } from '@/types/match'

const ROUND_LABELS = ['Quarts de finale', 'Demi-finale', 'Finale']
// Les adversaires montent en niveau à chaque tour.
const ROUND_OVERALL_OFFSET = [-6, 2, 10]

type Phase = 'loading' | 'intro' | 'playing' | 'round_result' | 'eliminated' | 'champion'

interface RoundState {
  label: string
  opponent: Team
  result: MatchResult | null
  status: 'pending' | 'current' | 'won' | 'lost'
}

export default function TournoiPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [rounds, setRounds] = useState<RoundState[]>([])
  const [roundIndex, setRoundIndex] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
      getUserCollection(u.id).then(async (col) => {
        const team = await loadPlayerTeam(u.id, u.pseudo, col, computeTeamOverall)
        setUserTeam(team)
        setPhase('intro')
      })
    })
  }, [router])

  const startTournament = () => {
    if (!userTeam) return
    const newRounds: RoundState[] = ROUND_LABELS.map((label, i) => ({
      label,
      opponent: generateBotTeam(userTeam.overall + ROUND_OVERALL_OFFSET[i]),
      result: null,
      status: i === 0 ? 'current' : 'pending',
    }))
    setRounds(newRounds)
    setRoundIndex(0)
    setTotalEarned(0)
    playRound(newRounds, 0)
  }

  const playRound = async (currentRounds: RoundState[], idx: number) => {
    if (!userTeam || !user) return
    setPhase('playing')
    setStatusText(`${currentRounds[idx].label} — coup d'envoi…`)
    playWhistle()
    await new Promise((r) => setTimeout(r, 1800))

    const matchResult = simulateMatch(userTeam, currentRounds[idx].opponent, true)
    await saveMatchResult(matchResult)

    const won = matchResult.winner === 'home'
    const updated = [...currentRounds]
    updated[idx] = { ...updated[idx], result: matchResult, status: won ? 'won' : 'lost' }
    if (won && idx + 1 < updated.length) {
      updated[idx + 1] = { ...updated[idx + 1], status: 'current' }
    }
    setRounds(updated)

    if (won) {
      const earned = await rewardTournamentRound(user.id)
      setCoins((prev) => prev + earned)
      setTotalEarned((prev) => prev + earned)

      if (idx + 1 >= updated.length) {
        const bonus = await rewardTournamentChampion(user.id)
        setCoins((prev) => prev + bonus)
        setTotalEarned((prev) => prev + bonus)
        playVictory()
        setPhase('champion')

        const milestone = await tryClaimMilestone(user.id, 'first_tournament_champion', user.claimed_milestones ?? [])
        if (milestone.unlocked) {
          setMilestoneMsg(`🎁 Jalon débloqué : Premier tournoi remporté ! Carte Cadeau reçue — ${milestone.cardName}`)
        }
      } else {
        playClick()
        setPhase('round_result')
      }
    } else {
      playDefeat()
      setPhase('eliminated')
    }
  }

  const handleNextRound = () => {
    const next = roundIndex + 1
    setRoundIndex(next)
    playRound(rounds, next)
  }

  const handleRestart = () => {
    setPhase('intro')
    setRounds([])
    setRoundIndex(0)
    setTotalEarned(0)
    setMilestoneMsg(null)
  }

  if (phase === 'loading' || !user || !userTeam) {
    return <div className="loader-center"><div className="loader" /></div>
  }

  const currentRound = rounds[roundIndex]
  const hasEnoughPlayers = userTeam.slots.filter((s) => s.card).length >= 5

  return (
    <>
      <style>{`
        .tournoi-team-card {
          margin: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .tournoi-team-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: linear-gradient(135deg, #001a5e20, #001a5e10);
          border: 2px solid var(--team-color, rgba(0,26,94,0.3));
          box-shadow: 0 0 12px var(--team-color-glow, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          flex-shrink: 0;
        }
        .tournoi-team-pseudo {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .tournoi-team-meta {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 3px;
        }
        .tournoi-team-overall {
          font-family: 'Rajdhani', sans-serif;
          font-size: 36px;
          font-weight: 900;
          color: #c4a050;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .tournoi-bracket-preview {
          display: flex;
          gap: 8px;
          margin: 0 16px 16px;
        }
        .tournoi-round-chip {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 6px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .tournoi-round-chip.current { border-color: rgba(196,160,80,0.4); color: #c4a050; background: rgba(196,160,80,0.06); }
        .tournoi-round-chip.won { border-color: rgba(74,222,128,0.35); color: #4ade80; background: rgba(74,222,128,0.06); }
        .tournoi-round-chip.lost { border-color: rgba(248,113,113,0.35); color: #f87171; background: rgba(248,113,113,0.06); }
        .tournoi-round-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .tournoi-rewards-info {
          margin: 0 16px 16px;
          padding: 14px 16px;
        }
        .tournoi-rewards-row {
          display: flex;
          justify-content: space-between;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          padding: 4px 0;
        }
        .tournoi-rewards-row span:last-child { color: #c4a050; font-weight: 700; }
        .tournoi-btn-wrap { padding: 0 16px 16px; }
        .tournoi-round-label {
          text-align: center;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        /* Status "playing" (identique à /match pour la cohérence visuelle) */
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
        @keyframes searchPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.7; } }
        .search-icon-big { font-size: 60px; animation: searchPulse 1.5s ease infinite; }
        .search-status-text {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .search-dots { display: flex; gap: 8px; }
        .search-dot { width: 8px; height: 8px; border-radius: 50%; background: #c4a050; animation: pulse 1.2s ease infinite; }
        .search-dot:nth-child(2) { animation-delay: 0.2s; }
        .search-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }

        /* Result (identique à /match pour la cohérence visuelle) */
        .result-screen { padding: 16px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .result-score-board {
          background: linear-gradient(135deg, #0d1229, #111829);
          border: 1px solid var(--border-subtle);
          border-radius: 16px;
          padding: 20px 16px;
          text-align: center;
          margin-bottom: 14px;
        }
        .result-teams { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
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
        .result-champion { background: rgba(196,160,80,0.18); color: #e8c97a; border: 1px solid rgba(196,160,80,0.4); }
        .result-coins {
          margin-top: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          color: #c4a050;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .result-actions { display: flex; flex-direction: column; gap: 10px; }
      `}</style>

      <div className="page">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Tournoi</div>
            <div className="page-subtitle">3 tours · gagne le trophée</div>
          </div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        {phase === 'intro' && (
          <>
            <div className="tournoi-team-card glass-card">
              <div className="tournoi-team-icon" style={{
                ['--team-color' as string]: TEAM_COLOR_PALETTE[user.selected_color ?? 'rouge']?.hex ?? 'rgba(0,26,94,0.3)',
                ['--team-color-glow' as string]: `${TEAM_COLOR_PALETTE[user.selected_color ?? 'rouge']?.hex ?? '#001a5e'}40`,
              }}>🛡️</div>
              <div style={{ flex: 1 }}>
                <div className="tournoi-team-pseudo">{userTeam.pseudo}</div>
                <div className="tournoi-team-meta">
                  {userTeam.formation} · {userTeam.slots.filter((s) => s.card).length}/11 joueurs
                </div>
              </div>
              <div className="tournoi-team-overall">{userTeam.overall}</div>
            </div>

            <div className="tournoi-bracket-preview">
              {ROUND_LABELS.map((label, i) => (
                <div key={label} className="tournoi-round-chip">
                  <span className="tournoi-round-num">{i + 1}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="tournoi-rewards-info glass-card">
              <div className="tournoi-rewards-row"><span>🏅 Par tour gagné</span><span>+{COIN_REWARDS.TOURNAMENT_ROUND_WIN} ₱</span></div>
              <div className="tournoi-rewards-row"><span>🏆 Tournoi remporté</span><span>+{COIN_REWARDS.TOURNAMENT_CHAMPION} ₱</span></div>
            </div>

            <div className="tournoi-btn-wrap">
              <button
                className="btn btn-gold"
                style={{ width: '100%', padding: 16, fontSize: 17, borderRadius: 14 }}
                onClick={startTournament}
                disabled={!hasEnoughPlayers}
              >
                🏆 Lancer le tournoi
              </button>
              {!hasEnoughPlayers && (
                <div style={{ textAlign: 'center', marginTop: 8, fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
                  Il te faut au moins 5 cartes dans ton équipe.
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'playing' && (
          <div className="match-status-screen">
            <div className="search-icon-big">⚽</div>
            <div className="search-status-text">{statusText}</div>
            <div className="search-dots"><div className="search-dot" /><div className="search-dot" /><div className="search-dot" /></div>
          </div>
        )}

        {(phase === 'round_result' || phase === 'eliminated' || phase === 'champion') && currentRound?.result && (
          <div className="result-screen">
            <div className="tournoi-round-label">{currentRound.label}</div>

            <div className="result-score-board">
              <div className="result-teams">
                <div className="result-team-name home">{currentRound.result.home.pseudo}</div>
                <div className="result-score">{currentRound.result.score_home} — {currentRound.result.score_away}</div>
                <div className="result-team-name away">{currentRound.result.away.pseudo}</div>
              </div>
              <span className={`result-badge ${phase === 'champion' ? 'result-champion' : phase === 'eliminated' ? 'result-loss' : 'result-win'}`}>
                {phase === 'champion' ? '🏆 Champion du tournoi !' : phase === 'eliminated' ? '💀 Éliminé' : '✅ Qualifié pour le tour suivant'}
              </span>
              <div className="result-coins">+{totalEarned} ₱ gagnés dans ce tournoi</div>
              {milestoneMsg && <div className="result-coins" style={{ color: '#f6c343', marginTop: 6 }}>{milestoneMsg}</div>}
            </div>

            <div className="tournoi-bracket-preview">
              {rounds.map((r) => (
                <div key={r.label} className={`tournoi-round-chip ${r.status}`}>
                  <span className="tournoi-round-num">
                    {r.status === 'won' ? '✓' : r.status === 'lost' ? '✕' : ROUND_LABELS.indexOf(r.label) + 1}
                  </span>
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            <div className="result-actions">
              {phase === 'round_result' && (
                <button className="btn btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12 }} onClick={handleNextRound}>
                  Tour suivant →
                </button>
              )}
              {(phase === 'eliminated' || phase === 'champion') && (
                <button className="btn btn-gold" style={{ width: '100%', padding: 14, borderRadius: 12 }} onClick={handleRestart}>
                  🔁 Nouveau tournoi
                </button>
              )}
              <button className="btn btn-ghost" style={{ width: '100%', padding: 12, borderRadius: 12 }} onClick={() => router.push('/collection')}>
                Voir ma collection
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
