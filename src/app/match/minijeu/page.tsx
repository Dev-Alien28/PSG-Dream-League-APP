// src/app/match/minijeu/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import { rewardChatMessage } from '@/lib/coinEngine'
import CoinDisplay from '@/components/CoinDisplay'
import Minigame from '@/components/Minigame'
import type { User } from '@/types/user'

export default function MinijeuPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
    })
  }, [router])

  if (!user) return <div className="loader-center"><div className="loader" /></div>

  return (
    <>
      <style>{`
        .minijeu-page { padding: 0 0 32px; }
        .minijeu-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .minijeu-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .minijeu-back-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .minijeu-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .minijeu-content {
          padding: 20px 16px;
        }
        .minijeu-reward-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
          text-align: center;
        }
      `}</style>

      <div className="minijeu-page">
        <div className="minijeu-header">
          <div className="minijeu-header-left">
            <button className="minijeu-back-btn" onClick={() => router.push('/match')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className="minijeu-title">Mini-jeu</div>
          </div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        <div className="minijeu-content">
          <div className="minijeu-reward-label">🎯 Penalty — Gagne 25 ₱</div>
          <Minigame
            reward={25}
            onWin={(earned) => setCoins((prev) => prev + earned)}
          />
        </div>
      </div>
    </>
  )
}