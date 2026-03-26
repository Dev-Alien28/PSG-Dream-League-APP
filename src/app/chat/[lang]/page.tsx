// src/app/chat/[lang]/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'
import {
  getChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from '@/lib/supabase'
import { rewardChatMessage } from '@/lib/coinEngine'
import ChatMessageComponent from '@/components/ChatMessage'
import CoinDisplay from '@/components/CoinDisplay'
import type { User } from '@/types/user'

const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  fr: { label: 'Français', flag: '🇫🇷' },
  en: { label: 'English', flag: '🇬🇧' },
  es: { label: 'Español', flag: '🇪🇸' },
  it: { label: 'Italiano', flag: '🇮🇹' },
  ar: { label: 'العربية', flag: '🇸🇦' },
  ja: { label: '日本語', flag: '🇯🇵' },
  zh: { label: '中文', flag: '🇨🇳' },
  'pt-BR': { label: 'Português', flag: '🇧🇷' },
}

export default function ChatRoomPage() {
  const params = useParams()
  const lang = params.lang as string
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [coins, setCoins] = useState(0)
  const [coinDelta, setCoinDelta] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) { router.replace('/login'); return }
      const langs = [u.primary_language, ...u.secondary_languages]
      if (!langs.includes(lang as any)) { router.replace(`/chat/${u.primary_language}`); return }
      setUser(u)
      setCoins(u.coins)
    })
  }, [lang, router])

  useEffect(() => {
    if (!user) return
    getChatMessages(lang).then(setMessages)
    const sub = subscribeToChatMessages(lang, (msg) => {
      setMessages((prev) => [...prev, msg])
    })
    return () => { sub.unsubscribe() }
  }, [lang, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    await sendChatMessage(user.id, user.pseudo, user.avatar_url, lang, content)
    const earned = await rewardChatMessage(user.id)
    setCoins((prev) => prev + earned)
    setCoinDelta(earned)
    setTimeout(() => setCoinDelta(0), 2500)
    setSending(false)
    inputRef.current?.focus()
  }

  const langInfo = LANGUAGE_LABELS[lang] || { label: lang, flag: '💬' }
  const userLangs = user ? [user.primary_language, ...user.secondary_languages] : []

  return (
    <>
      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - var(--navbar-height));
          background: var(--bg-primary);
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          gap: 12px;
          flex-shrink: 0;
        }
        .chat-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .chat-lang-flag {
          font-size: 24px;
          line-height: 1;
        }
        .chat-lang-name {
          font-family: 'Rajdhani', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }
        .chat-lang-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
          scrollbar-width: none;
        }
        .chat-lang-tabs::-webkit-scrollbar { display: none; }
        .chat-tab {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-family: 'Rajdhani', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .chat-tab.active {
          background: rgba(196,160,80,0.12);
          border-color: rgba(196,160,80,0.35);
          color: #c4a050;
        }
        .chat-tab:not(.active):hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chat-input-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 24px;
          padding: 10px 16px;
          color: var(--text-primary);
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .chat-input:focus { border-color: var(--border-gold); }
        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c4a050, #e8c97a);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
          box-shadow: 0 2px 12px rgba(196,160,80,0.3);
        }
        .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .chat-send-btn:not(:disabled):active { transform: scale(0.9); }
        .chat-coin-hint {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: rgba(196,160,80,0.5);
          text-align: center;
          padding: 4px 0 0;
          letter-spacing: 0.08em;
          flex-shrink: 0;
        }
        @keyframes langTabIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .chat-tab { animation: langTabIn 0.2s ease both; }
      `}</style>

      <div className="chat-page">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-lang-flag">{langInfo.flag}</span>
            <span className="chat-lang-name">{langInfo.label}</span>
          </div>
          <CoinDisplay amount={coins} size="sm" />
        </div>

        {/* Lang tabs */}
        <div className="chat-lang-tabs">
          {userLangs.map((l) => {
            const info = LANGUAGE_LABELS[l] || { label: l, flag: '💬' }
            return (
              <a
                key={l}
                href={`/chat/${l}`}
                className={`chat-tab${l === lang ? ' active' : ''}`}
              >
                {info.flag} {info.label}
              </a>
            )
          })}
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state" style={{ flex: 1 }}>
              <div className="empty-icon">{langInfo.flag}</div>
              <div className="empty-title">Salon vide</div>
              <div className="empty-desc">Sois le premier à écrire ! Tu gagneras 5 ₱ par message.</div>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              currentUserId={user?.id ?? ''}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {user && (
          <div>
            <div className="chat-coin-hint">+5 ₱ par message envoyé</div>
            <div className="chat-input-bar">
              <input
                ref={inputRef}
                className="chat-input"
                placeholder="Écrire un message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                maxLength={500}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="#0a0e1a" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#0a0e1a" strokeWidth="2.5" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}