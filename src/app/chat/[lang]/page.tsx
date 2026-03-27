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
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === msg.id)
        if (exists) return prev
        const tempIndex = prev.findIndex(
          (m) => m.id.startsWith('temp-') && m.user_id === msg.user_id && m.content === msg.content
        )
        if (tempIndex !== -1) {
          const updated = [...prev]
          updated[tempIndex] = msg
          return updated
        }
        return [...prev, msg]
      })
    })
    return () => { sub.unsubscribe() }
  }, [lang, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return
    const content = input.trim()
    setInput('')

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      pseudo: user.pseudo,
      avatar_url: user.avatar_url,
      lang,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])
    inputRef.current?.focus()

    setSending(true)
    await sendChatMessage(user.id, user.pseudo, user.avatar_url, lang, content)
    const earned = await rewardChatMessage(user.id)
    setCoins((prev) => prev + earned)
    setCoinDelta(earned)
    setTimeout(() => setCoinDelta(0), 2500)
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const langInfo = LANGUAGE_LABELS[lang] || { label: lang, flag: '💬' }
  const userLangs = user ? [user.primary_language, ...user.secondary_languages] : []

  return (
    <>
      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100dvh - var(--navbar-height, 64px));
          background: var(--bg-primary, #0a0e1a);
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          background: var(--bg-secondary, #0d1229);
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
          color: var(--text-primary, #fff);
        }
        .chat-lang-tabs {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
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
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          color: var(--text-muted, rgba(255,255,255,0.35));
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
          color: rgba(255,255,255,0.6);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255,255,255,0.2);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .chat-empty-icon {
          font-size: 40px;
          opacity: 0.4;
        }
        .chat-input-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-top: 1px solid var(--border-subtle, rgba(255,255,255,0.08));
          background: var(--bg-secondary, #0d1229);
          flex-shrink: 0;
        }
        .chat-input {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 10px 16px;
          color: #fff;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .chat-input::placeholder {
          color: rgba(255,255,255,0.25);
        }
        .chat-input:focus {
          border-color: rgba(196,160,80,0.5);
        }
        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c4a050 0%, #e8c97a 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0e1a;
          flex-shrink: 0;
          transition: opacity 0.2s ease, transform 0.15s ease;
        }
        .chat-send-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .chat-send-btn:not(:disabled):active {
          transform: scale(0.9);
        }
      `}</style>

      <div className="chat-page">
        {/* ── Header ── */}
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-lang-flag">{langInfo.flag}</span>
            <span className="chat-lang-name">{langInfo.label}</span>
          </div>
          {user && (
            <CoinDisplay amount={coins} showDelta={coinDelta > 0} size="sm" />
          )}
        </div>

        {/* ── Onglets de langue ── */}
        {userLangs.length > 1 && (
          <div className="chat-lang-tabs">
            {userLangs.map((l) => {
              const info = LANGUAGE_LABELS[l] || { label: l, flag: '💬' }
              return (
                <button
                  key={l}
                  className={`chat-tab${l === lang ? ' active' : ''}`}
                  onClick={() => router.push(`/chat/${l}`)}
                >
                  <span>{info.flag}</span>
                  <span>{info.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Messages ── */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span className="chat-empty-icon">💬</span>
              <span>Sois le premier à écrire !</span>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageComponent
                key={msg.id}
                message={msg}
                currentUserId={user?.id ?? ''}
                showAvatar={true}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Barre d'envoi ── */}
        <div className="chat-input-bar">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Écris un message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={300}
            autoComplete="off"
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Envoyer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}