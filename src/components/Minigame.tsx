'use client'

import { useState, useCallback, useRef } from 'react'

type Zone = 1 | 2 | 3 | 4 | 5 | 6 | null
type GamePhase = 'idle' | 'aim' | 'shoot' | 'result'

interface MiniGameProps {
  onWin?: (coinsEarned: number) => void
  onClose?: () => void
  reward?: number
}

const ZONE_LABELS = ['Haut-G', 'Haut-C', 'Haut-D', 'Bas-G', 'Bas-D']

export default function Minigame({ onWin, onClose, reward = 25 }: MiniGameProps) {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [chosenZone, setChosenZone] = useState<Zone>(null)
  const [keeperZone, setKeeperZone] = useState<Zone>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [score, setScore] = useState({ goals: 0, saves: 0 })
  const [round, setRound] = useState(1)
  const totalRounds = 3
  const aimTimeout = useRef<NodeJS.Timeout | null>(null)

  const selectZone = useCallback((zone: Zone) => {
    if (phase !== 'aim') return
    setChosenZone(zone)
    setPhase('shoot')

    // Le gardien choisit aléatoirement (légèrement biaisé)
    const keeper = (Math.floor(Math.random() * 6) + 1) as Zone
    setKeeperZone(keeper)

    const scored = zone !== keeper
    setWon(scored)
    setScore((prev) => ({
      goals: prev.goals + (scored ? 1 : 0),
      saves: prev.saves + (scored ? 0 : 1),
    }))

    if (aimTimeout.current) clearTimeout(aimTimeout.current)
    aimTimeout.current = setTimeout(() => {
      if (round >= totalRounds) {
        const finalGoals = score.goals + (scored ? 1 : 0)
        if (finalGoals >= 2 && onWin) onWin(reward)
        setPhase('result')
      } else {
        setRound((r) => r + 1)
        setChosenZone(null)
        setKeeperZone(null)
        setWon(null)
        setPhase('aim')
      }
    }, 1800)
  }, [phase, round, score.goals, onWin, reward])

  const startGame = () => {
    setPhase('aim')
    setScore({ goals: 0, saves: 0 })
    setRound(1)
    setChosenZone(null)
    setKeeperZone(null)
    setWon(null)
  }

  const zoneGrid: Zone[] = [1, 2, 3, 4, null, 5, 6]

  return (
    <>
      <style>{`
        @keyframes ballKick {
          0% { transform: scale(1) translateY(0); }
          30% { transform: scale(0.8) translateY(-10px); }
          60% { transform: scale(0.5) translateY(-30px); opacity: 0.7; }
          100% { transform: scale(0.2) translateY(-60px); opacity: 0; }
        }
        @keyframes keeperJump {
          0% { transform: translateX(0); }
          100% { transform: translateX(var(--keeper-tx)); }
        }
        @keyframes goalFlash {
          0%, 100% { background: rgba(74,222,128,0); }
          50% { background: rgba(74,222,128,0.15); }
        }
        @keyframes saveFlash {
          0%, 100% { background: rgba(248,113,113,0); }
          50% { background: rgba(248,113,113,0.15); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .minigame-container {
          background: linear-gradient(180deg, #0a1a0a 0%, #0a0e1a 40%, #050810 100%);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          overflow: hidden;
          width: 100%;
          max-width: 380px;
          margin: 0 auto;
        }

        /* Field */
        .field {
          position: relative;
          height: 200px;
          background: linear-gradient(180deg, #1a3a1a 0%, #1e4020 40%, #152e15 100%);
          overflow: hidden;
        }
        .field-lines {
          position: absolute;
          inset: 0;
          opacity: 0.15;
        }

        /* Goal */
        .goal {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 120px;
          border: 3px solid rgba(255,255,255,0.7);
          border-bottom: none;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 1px;
        }
        .goal-zone {
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
          transition: all 0.15s ease;
        }
        .goal-zone.chosen {
          background: rgba(196,160,80,0.3);
          border-color: rgba(196,160,80,0.6);
        }
        .goal-zone.keeper-zone {
          background: rgba(59,130,246,0.3);
          border-color: rgba(59,130,246,0.6);
        }
        .goal-zone.goal-scored {
          background: rgba(74,222,128,0.3);
        }
        .goal-zone.goal-saved {
          background: rgba(248,113,113,0.3);
        }

        /* Ball */
        .ball {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 28px;
          height: 28px;
          font-size: 24px;
          line-height: 1;
          z-index: 5;
          transition: all 0.05s;
        }
        .ball.kicking {
          animation: ballKick 0.8s ease forwards;
        }

        /* Keeper */
        .keeper {
          position: absolute;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 28px;
          z-index: 4;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Net flash */
        .net-flash {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
        }
        .net-flash.goal { animation: goalFlash 0.6s ease; }
        .net-flash.save { animation: saveFlash 0.6s ease; }

        /* Controls */
        .game-controls {
          padding: 16px;
        }
        .round-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .round-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.45);
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .score-pills {
          display: flex;
          gap: 8px;
        }
        .score-pill {
          padding: 3px 10px;
          border-radius: 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
        }
        .score-pill.goals {
          background: rgba(74,222,128,0.15);
          color: #4ade80;
          border: 1px solid rgba(74,222,128,0.3);
        }
        .score-pill.saves {
          background: rgba(248,113,113,0.15);
          color: #f87171;
          border: 1px solid rgba(248,113,113,0.3);
        }

        /* Zone selector */
        .zone-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-align: center;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .zone-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, auto);
          gap: 6px;
        }
        .zone-btn {
          padding: 10px 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.6);
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
        }
        .zone-btn:hover {
          background: rgba(196,160,80,0.12);
          border-color: rgba(196,160,80,0.35);
          color: #c4a050;
          transform: scale(1.03);
        }
        .zone-btn:active { transform: scale(0.96); }
        .zone-btn.empty { visibility: hidden; }

        /* Result */
        .result-banner {
          text-align: center;
          padding: 8px;
          border-radius: 10px;
          margin-bottom: 10px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          animation: slideUp 0.3s ease;
        }
        .result-banner.goal-msg {
          background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.3);
          color: #4ade80;
        }
        .result-banner.save-msg {
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.3);
          color: #f87171;
        }

        /* Buttons */
        .game-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s ease;
        }
        .game-btn:active { transform: scale(0.97); }
        .game-btn-gold {
          background: linear-gradient(135deg, #c4a050 0%, #e8c97a 50%, #c4a050 100%);
          color: #0a0e1a;
          box-shadow: 0 4px 16px rgba(196,160,80,0.35);
        }
        .game-btn-ghost {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .final-score {
          text-align: center;
          padding: 16px;
          animation: slideUp 0.3s ease;
        }
        .final-score-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: #c4a050;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }
        .final-score-sub {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>

      <div className="minigame-container">
        {/* Field */}
        <div className={`field${phase === 'shoot' ? (won ? ' goal' : ' save') : ''}`}>
          {/* SVG field lines */}
          <svg className="field-lines" viewBox="0 0 380 200" preserveAspectRatio="none">
            <rect x="90" y="140" width="200" height="50" fill="none" stroke="white" strokeWidth="1.5"/>
            <line x1="190" y1="190" x2="190" y2="160" stroke="white" strokeWidth="1.5"/>
          </svg>

          {/* Goal zones */}
          {phase !== 'idle' && phase !== 'result' && (
            <div className="goal">
              {[1, 2, 3, 4, 5, 6].map((z) => {
                const zone = z as Zone
                const isChosen = chosenZone === zone
                const isKeeper = keeperZone === zone
                const scored = isChosen && !isKeeper
                const saved = isChosen && isKeeper

                return (
                  <div
                    key={z}
                    className={`goal-zone${isChosen ? ' chosen' : ''}${isKeeper ? ' keeper-zone' : ''}${scored ? ' goal-scored' : ''}${saved ? ' goal-saved' : ''}`}
                  />
                )
              })}
            </div>
          )}

          {/* Net flash */}
          {phase === 'shoot' && (
            <div className={`net-flash ${won ? 'goal' : 'save'}`} />
          )}

          {/* Keeper */}
          {phase !== 'idle' && (
            <div className="keeper" style={{
              transform: `translateX(calc(-50% + ${keeperZone ? getKeeperTranslate(keeperZone) : 0}px))`,
              transition: phase === 'shoot' ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}>
              🧤
            </div>
          )}

          {/* Ball */}
          {phase !== 'idle' && (
            <div className={`ball${phase === 'shoot' ? ' kicking' : ''}`}>⚽</div>
          )}
        </div>

        {/* Controls */}
        <div className="game-controls">
          {phase === 'idle' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, fontWeight: 800, color: '#c4a050', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Penalty Shootout
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  3 tirs · 2 buts pour gagner {reward} ₱
                </div>
              </div>
              <button className="game-btn game-btn-gold" onClick={startGame}>
                Commencer
              </button>
              {onClose && (
                <button className="game-btn game-btn-ghost" onClick={onClose} style={{ marginTop: 6 }}>
                  Fermer
                </button>
              )}
            </>
          )}

          {(phase === 'aim' || phase === 'shoot') && (
            <>
              <div className="round-info">
                <span className="round-label">Tir {round}/{totalRounds}</span>
                <div className="score-pills">
                  <span className="score-pill goals">⚽ {score.goals}</span>
                  <span className="score-pill saves">🧤 {score.saves}</span>
                </div>
              </div>

              {phase === 'shoot' && won !== null && (
                <div className={`result-banner ${won ? 'goal-msg' : 'save-msg'}`}>
                  {won ? '⚽ BUT !' : '🧤 Arrêté !'}
                </div>
              )}

              {phase === 'aim' && (
                <>
                  <div className="zone-title">Choisis ta zone</div>
                  <div className="zone-grid">
                    {([1, 2, 3, null, 4, 5, 6] as (Zone | null)[]).map((z, i) => (
                      z !== null ? (
                        <button key={i} className="zone-btn" onClick={() => selectZone(z)}>
                          {ZONE_LABELS[(z as number) - 1]}
                        </button>
                      ) : (
                        <div key={i} className="zone-btn empty" />
                      )
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {phase === 'result' && (
            <div className="final-score">
              <div className="final-score-title">
                {score.goals >= 2 ? `🏆 +${reward} ₱` : '😔 Raté'}
              </div>
              <div className="final-score-sub">
                {score.goals >= 2 ? 'Bravo ! Coins gagnés !' : `${score.goals}/${totalRounds} buts — Rejoue !`}
              </div>
              <button className="game-btn game-btn-gold" onClick={startGame} style={{ marginTop: 16 }}>
                Rejouer
              </button>
              {onClose && (
                <button className="game-btn game-btn-ghost" onClick={onClose} style={{ marginTop: 6 }}>
                  Fermer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function getKeeperTranslate(zone: Zone): number {
  const map: Record<number, number> = {
    1: -60, 2: 0, 3: 60,
    4: -60, 5: 0, 6: 60,
  }
  return zone ? map[zone] ?? 0 : 0
}