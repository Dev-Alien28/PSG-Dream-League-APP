// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getSession } from '@/lib/authHelpers'

export default function SplashPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const check = async () => {
      await new Promise((r) => setTimeout(r, 1800))
      const { userId, rememberMe } = await getSession()
      setVisible(false)
      await new Promise((r) => setTimeout(r, 400))
      if (userId && rememberMe) {
        router.replace('/chat')
      } else {
        router.replace('/login')
      }
    }
    check()
  }, [router])

  return (
    <>
      <style>{`
        @keyframes logoReveal {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); }
          60% { opacity: 1; transform: scale(1.04) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmerSweep {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeOut {
          to { opacity: 0; }
        }
        .splash {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, #001a5e22 0%, transparent 70%),
                      radial-gradient(ellipse at 80% 80%, #c4a05008 0%, transparent 60%),
                      #0a0e1a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: ${!visible ? 'fadeOut 0.4s ease forwards' : 'none'};
        }
        .splash-ring {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          border: 1px solid rgba(196,160,80,0.3);
          animation: ringPulse 2.5s ease-out infinite;
        }
        .splash-ring-2 {
          width: 380px;
          height: 380px;
          animation-delay: 0.6s;
          border-color: rgba(196,160,80,0.15);
        }
        .splash-logo {
          position: relative;
          z-index: 2;
          animation: logoReveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .splash-emblem {
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 40px rgba(196,160,80,0.35)) drop-shadow(0 0 80px rgba(0,26,94,0.5));
        }
        .splash-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #c4a050 0%, #e8c97a 50%, #c4a050 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerSweep 2s linear 1s infinite;
          text-align: center;
          line-height: 1.1;
        }
        .splash-subtitle {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .splash-dots {
          display: flex;
          gap: 6px;
          margin-top: 48px;
          position: relative;
          z-index: 2;
        }
        .splash-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(196,160,80,0.4);
          animation: pulse 1.2s ease infinite;
        }
        .splash-dot:nth-child(2) { animation-delay: 0.2s; }
        .splash-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
      <div className="splash">
        <div className="splash-ring" />
        <div className="splash-ring splash-ring-2" />
        <div className="splash-logo">
          <div className="splash-emblem">
            <Image
              src="/logo.png"
              alt="PSG Dream League"
              width={150}
              height={150}
              priority
            />
          </div>
          <div>
            <div className="splash-title">PSG Dream League</div>
            <div className="splash-subtitle">Fan App Non Officielle</div>
          </div>
        </div>
        <div className="splash-dots">
          <div className="splash-dot" />
          <div className="splash-dot" />
          <div className="splash-dot" />
        </div>
      </div>
    </>
  )
}