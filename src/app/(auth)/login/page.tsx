'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { login } from '@/lib/authHelpers'
import { initUserLanguage } from '@/lib/langInit'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setLoading(true)
    setError(null)

    const { user, error: err } = await login(email, password, rememberMe)

    setLoading(false)

    if (err) {
      setError(err)
    } else if (user) {
      await initUserLanguage(user)
      router.push('/chat')
    }
  }

  return (
    <>
      <style>{`
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-container {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 380px;
          animation: authFadeIn 0.4s ease;
        }
        .auth-logo {
          text-align: center;
          margin-bottom: 36px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .auth-logo-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #c4a050, #e8c97a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.1;
        }
        .auth-logo-sub {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .auth-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .auth-remember {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }
        .auth-remember input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: #c4a050;
          cursor: pointer;
        }
        .auth-remember-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          font-weight: 600;
        }
        .auth-error {
          background: rgba(248,113,113,0.1);
          border: 1px solid rgba(248,113,113,0.3);
          border-radius: 10px;
          padding: 10px 14px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: #f87171;
          font-weight: 600;
        }
        .auth-submit {
          margin-top: 6px;
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #c4a050 0%, #e8c97a 50%, #c4a050 100%);
          color: #0a0e1a;
          font-family: 'Rajdhani', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 20px rgba(196,160,80,0.35);
        }
        .auth-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .auth-submit:not(:disabled):active { transform: scale(0.97); }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          font-weight: 600;
        }
        .auth-footer a {
          color: #c4a050;
          text-decoration: none;
          font-weight: 700;
        }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <Image src="/logo.png" alt="PSG Dream League" width={100} height={100} priority />
            <div>
              <div className="auth-logo-title">PSG Dream League</div>
              <div className="auth-logo-sub">Fan App Non Officielle</div>
            </div>
          </div>

          <div className="auth-form">
            {error && <div className="auth-error">⚠️ {error}</div>}

            <div className="auth-form-group">
              <label className="auth-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="email"
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Mot de passe</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoComplete="current-password"
              />
            </div>

            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-remember-label">Se souvenir de moi</span>
            </label>

            <button className="auth-submit" onClick={handleLogin} disabled={loading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </div>

          <div className="auth-footer">
            Pas encore de compte ?{' '}
            <Link href="/register">S'inscrire</Link>
          </div>
        </div>
      </div>
    </>
  )
}