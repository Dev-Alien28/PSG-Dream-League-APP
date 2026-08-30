// src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { register } from '@/lib/authHelpers'
import type { Language } from '@/types/user'

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pseudo, setPseudo] = useState('')
  const [primaryLang, setPrimaryLang] = useState<Language>('fr')
  const [secondaryLangs, setSecondaryLangs] = useState<Language[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSecondary = (lang: Language) => {
    if (lang === primaryLang) return
    setSecondaryLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  const handleStep1 = () => {
    if (!email || !password || !pseudo) {
      setError('Tous les champs sont requis.')
      return
    }
    if (password.length < 6) {
      setError('Mot de passe : minimum 6 caractères.')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleRegister = async () => {
    setLoading(true)
    setError(null)
    const { user, error: err } = await register({
      email,
      password,
      pseudo,
      primaryLanguage: primaryLang,
      secondaryLanguages: secondaryLangs,
    })
    setLoading(false)
    if (err) {
      setError(err)
      setStep(1)
    } else if (user) {
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
          margin-bottom: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .auth-logo-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #c4a050, #e8c97a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-step-indicator {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 24px;
        }
        .auth-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transition: all 0.2s ease;
        }
        .auth-step-dot.active {
          background: #c4a050;
          transform: scale(1.2);
        }
        .auth-step-dot.done {
          background: rgba(196,160,80,0.4);
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
          margin-top: 6px;
        }
        .auth-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .auth-submit:not(:disabled):active { transform: scale(0.97); }
        .auth-footer {
          text-align: center;
          margin-top: 20px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          font-weight: 600;
        }
        .auth-footer a { color: #c4a050; text-decoration: none; font-weight: 700; }
        .lang-section-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          margin: 4px 0 8px;
        }
        .lang-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .lang-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          text-align: left;
        }
        .lang-btn:hover { background: rgba(196,160,80,0.08); border-color: rgba(196,160,80,0.25); }
        .lang-btn.selected { background: rgba(196,160,80,0.12); border-color: rgba(196,160,80,0.4); color: #c4a050; }
        .lang-btn.primary-selected { background: rgba(196,160,80,0.18); border-color: #c4a050; color: #e8c97a; }
        .lang-flag { font-size: 18px; }
        .lang-check { margin-left: auto; font-size: 12px; color: #4ade80; }
        .back-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 10px 16px;
          color: rgba(255,255,255,0.5);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: all 0.15s ease;
        }
        .back-btn:hover { background: rgba(255,255,255,0.1); }
        .step-actions { display: flex; gap: 10px; margin-top: 6px; }
        .step-actions .auth-submit { margin-top: 0; }
      `}</style>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <Image src="/logo.png" alt="PSG Dream League" width={80} height={80} priority />
            <div className="auth-logo-title">Créer un compte</div>
          </div>

          <div className="auth-step-indicator">
            <div className={`auth-step-dot ${step === 1 ? 'active' : 'done'}`} />
            <div className={`auth-step-dot ${step === 2 ? 'active' : ''}`} />
          </div>

          {step === 1 && (
            <div className="auth-form">
              {error && <div className="auth-error">⚠️ {error}</div>}

              <div className="auth-form-group">
                <label className="auth-label">Pseudo</label>
                <input
                  className="input"
                  type="text"
                  placeholder="ParisFan77"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="auth-form-group">
                <label className="auth-label">Mot de passe</label>
                <input
                  className="input"
                  type="password"
                  placeholder="6 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button className="auth-submit" onClick={handleStep1}>
                Continuer →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="auth-form">
              {error && <div className="auth-error">⚠️ {error}</div>}

              <div>
                <div className="lang-section-title">Langue principale</div>
                <div className="lang-grid">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      className={`lang-btn${primaryLang === l.code ? ' primary-selected' : ''}`}
                      onClick={() => {
                        setPrimaryLang(l.code)
                        setSecondaryLangs((prev) => prev.filter((x) => x !== l.code))
                      }}
                    >
                      <span className="lang-flag">{l.flag}</span>
                      <span>{l.label}</span>
                      {primaryLang === l.code && <span className="lang-check">★</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="lang-section-title">Langues secondaires (facultatif)</div>
                <div className="lang-grid">
                  {LANGUAGES.filter((l) => l.code !== primaryLang).map((l) => (
                    <button
                      key={l.code}
                      className={`lang-btn${secondaryLangs.includes(l.code) ? ' selected' : ''}`}
                      onClick={() => toggleSecondary(l.code)}
                    >
                      <span className="lang-flag">{l.flag}</span>
                      <span>{l.label}</span>
                      {secondaryLangs.includes(l.code) && <span className="lang-check">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="step-actions">
                <button className="back-btn" onClick={() => setStep(1)}>← Retour</button>
                <button className="auth-submit" onClick={handleRegister} disabled={loading}>
                  {loading ? 'Création…' : "C'est parti !"}
                </button>
              </div>
            </div>
          )}

          <div className="auth-footer">
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    </>
  )
}