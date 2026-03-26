// src/app/config/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout } from '@/lib/authHelpers'
import {
  updateUserPseudo,
  updateUserAvatar,
  updateUserLanguages,
} from '@/lib/supabase'
import { spendCoinsForPseudoChange } from '@/lib/coinEngine'
import { COIN_COSTS } from '@/lib/coinEngine'
import CoinDisplay from '@/components/CoinDisplay'
import type { User, Language } from '@/types/user'

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

export default function ConfigPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [coins, setCoins] = useState(0)
  const [pseudoEdit, setPseudoEdit] = useState('')
  const [editingPseudo, setEditingPseudo] = useState(false)
  const [primaryLang, setPrimaryLang] = useState<Language>('fr')
  const [secondaryLangs, setSecondaryLangs] = useState<Language[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'ok' | 'error' } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      setUser(u)
      setCoins(u.coins)
      setPseudoEdit(u.pseudo)
      setPrimaryLang(u.primary_language)
      setSecondaryLangs(u.secondary_languages)
    })
  }, [router])

  const showMsg = (text: string, type: 'ok' | 'error') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 3000)
  }

  const handleChangePseudo = async () => {
    if (!user || !pseudoEdit.trim() || pseudoEdit === user.pseudo) return
    setSaving(true)
    const ok = await spendCoinsForPseudoChange(user.id)
    if (!ok) {
      showMsg(`Il te faut ${COIN_COSTS.CHANGE_PSEUDO} ₱ pour changer de pseudo.`, 'error')
      setSaving(false)
      return
    }
    const updated = await updateUserPseudo(user.id, pseudoEdit.trim())
    setSaving(false)
    if (updated) {
      setUser((prev) => prev ? { ...prev, pseudo: pseudoEdit.trim() } : prev)
      setCoins((prev) => prev - COIN_COSTS.CHANGE_PSEUDO)
      showMsg('Pseudo mis à jour !', 'ok')
      setEditingPseudo(false)
    } else {
      showMsg('Erreur lors de la mise à jour.', 'error')
    }
  }

  const handleSaveLangs = async () => {
    if (!user) return
    setSaving(true)
    const ok = await updateUserLanguages(user.id, primaryLang, secondaryLangs)
    setSaving(false)
    showMsg(ok ? 'Langues mises à jour !' : 'Erreur lors de la sauvegarde.', ok ? 'ok' : 'error')
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    // Simulate URL (in production: upload to Supabase Storage)
    const url = URL.createObjectURL(file)
    await updateUserAvatar(user.id, url)
    setUser((prev) => prev ? { ...prev, avatar_url: url } : prev)
    showMsg('Avatar mis à jour !', 'ok')
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const toggleSecondary = (lang: Language) => {
    if (lang === primaryLang) return
    setSecondaryLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    )
  }

  if (!user) return <div className="loader-center"><div className="loader" /></div>

  const initials = user.pseudo.slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        .config-page { padding-bottom: 40px; }
        .config-header {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .config-title {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* Profile section */
        .profile-section {
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .avatar-wrap {
          position: relative;
          cursor: pointer;
        }
        .avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba(196,160,80,0.4);
          background: linear-gradient(135deg, #001a5e30, #c4a05015);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Rajdhani', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #c4a050;
        }
        .avatar-circle img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-edit-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 24px;
          height: 24px;
          background: #c4a050;
          border-radius: 50%;
          border: 2px solid var(--bg-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .profile-pseudo {
          font-family: 'Rajdhani', sans-serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .profile-email {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        /* Settings list */
        .settings-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .settings-section-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .settings-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-subtle);
        }
        .settings-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          border-radius: 14px;
          overflow: hidden;
        }
        .settings-row {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .settings-row:last-child { border-bottom: none; }
        .settings-row-icon {
          font-size: 20px;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }
        .settings-row-label {
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.03em;
          flex: 1;
        }
        .settings-row-value {
          font-family: 'Rajdhani', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Pseudo edit inline */
        .pseudo-edit-wrap { padding: 12px 16px 12px; }
        .pseudo-input-row { display: flex; gap: 8px; }
        .pseudo-cost-note {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: rgba(196,160,80,0.6);
          margin-top: 6px;
          text-align: right;
          letter-spacing: 0.06em;
        }

        /* Lang selector */
        .lang-picker-wrap { padding: 12px 16px; }
        .lang-picker-sub {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin: 8px 0 6px;
        }
        .lang-grid-small {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        .lang-btn-small {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .lang-btn-small.active {
          background: rgba(196,160,80,0.1);
          border-color: rgba(196,160,80,0.3);
          color: #c4a050;
        }
        .lang-btn-small.primary-active {
          background: rgba(196,160,80,0.18);
          border-color: #c4a050;
          color: #e8c97a;
        }

        /* Toast */
        .settings-toast {
          position: fixed;
          bottom: calc(var(--navbar-height) + 16px);
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 24px;
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.06em;
          z-index: 500;
          animation: slideUp 0.25s ease;
          white-space: nowrap;
        }
        .settings-toast.ok {
          background: rgba(74,222,128,0.15);
          border: 1px solid rgba(74,222,128,0.3);
          color: #4ade80;
        }
        .settings-toast.error {
          background: rgba(248,113,113,0.15);
          border: 1px solid rgba(248,113,113,0.3);
          color: #f87171;
        }
        @keyframes slideUp { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

        /* Danger */
        .danger-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.25);
          color: #f87171;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .danger-btn:hover { background: rgba(248,113,113,0.14); }
        .danger-btn:active { transform: scale(0.97); }
      `}</style>

      <div className="config-page">
        {/* Header */}
        <div className="config-header">
          <div className="config-title">Paramètres</div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        {/* Toast */}
        {msg && <div className={`settings-toast ${msg.type}`}>{msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}</div>}

        {/* Profile */}
        <div className="profile-section">
          <div className="avatar-wrap" onClick={() => fileRef.current?.click()}>
            <div className="avatar-circle">
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.pseudo} />
                : initials
              }
            </div>
            <div className="avatar-edit-badge">✏️</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <div className="profile-pseudo">{user.pseudo}</div>
          <div className="profile-email">{user.email}</div>
        </div>

        <div className="settings-list">
          {/* Pseudo */}
          <div className="settings-section-label">Profil</div>
          <div className="settings-card">
            <div className="settings-row" onClick={() => setEditingPseudo(!editingPseudo)} style={{ cursor: 'pointer' }}>
              <span className="settings-row-icon">✏️</span>
              <span className="settings-row-label">Pseudo</span>
              <span className="settings-row-value">{user.pseudo}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{editingPseudo ? '▲' : '▼'}</span>
            </div>
            {editingPseudo && (
              <div className="pseudo-edit-wrap">
                <div className="pseudo-input-row">
                  <input
                    className="input"
                    type="text"
                    value={pseudoEdit}
                    onChange={(e) => setPseudoEdit(e.target.value)}
                    maxLength={20}
                    placeholder="Nouveau pseudo"
                  />
                  <button
                    className="btn btn-gold"
                    style={{ borderRadius: 10, padding: '0 16px', flexShrink: 0 }}
                    onClick={handleChangePseudo}
                    disabled={saving || !pseudoEdit.trim() || pseudoEdit === user.pseudo}
                  >
                    OK
                  </button>
                </div>
                <div className="pseudo-cost-note">Coût : {COIN_COSTS.CHANGE_PSEUDO} ₱</div>
              </div>
            )}
          </div>

          {/* Langues */}
          <div className="settings-section-label">Langues</div>
          <div className="settings-card">
            <div className="lang-picker-wrap">
              <div className="lang-picker-sub">Langue principale</div>
              <div className="lang-grid-small">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`lang-btn-small${primaryLang === l.code ? ' primary-active' : ''}`}
                    onClick={() => {
                      setPrimaryLang(l.code)
                      setSecondaryLangs((p) => p.filter((x) => x !== l.code))
                    }}
                  >
                    {l.flag} {l.label}
                    {primaryLang === l.code && <span style={{ marginLeft: 'auto', fontSize: 10 }}>★</span>}
                  </button>
                ))}
              </div>

              <div className="lang-picker-sub" style={{ marginTop: 12 }}>Langues secondaires</div>
              <div className="lang-grid-small">
                {LANGUAGES.filter((l) => l.code !== primaryLang).map((l) => (
                  <button
                    key={l.code}
                    className={`lang-btn-small${secondaryLangs.includes(l.code) ? ' active' : ''}`}
                    onClick={() => toggleSecondary(l.code)}
                  >
                    {l.flag} {l.label}
                    {secondaryLangs.includes(l.code) && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
                  </button>
                ))}
              </div>

              <button
                className="btn btn-gold"
                style={{ width: '100%', marginTop: 12, padding: '10px', borderRadius: 10 }}
                onClick={handleSaveLangs}
                disabled={saving}
              >
                Sauvegarder
              </button>
            </div>
          </div>

          {/* About */}
          <div className="settings-section-label">À propos</div>
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-row-icon">⚜️</span>
              <span className="settings-row-label">PSG Fan App</span>
              <span className="settings-row-value">v1.0.0</span>
            </div>
            <div className="settings-row">
              <span className="settings-row-icon">ℹ️</span>
              <span className="settings-row-label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                Fan app non officielle, sans affiliation avec le PSG.
              </span>
            </div>
          </div>

          {/* Logout */}
          <button className="danger-btn" onClick={handleLogout}>
            🚪 Se déconnecter
          </button>
        </div>
      </div>
    </>
  )
}