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
        // On évite les doublons entre le message temporaire et le vrai
        const exists = prev.some((m) => m.id === msg.id)
        if (exists) return prev
        // On remplace le message temporaire par le vrai si même contenu/auteur
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

    // Affichage immédiat sans attendre Supabase ✅
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

    // Envoi en arrière-plan
    setSending(true)
    await sendChatMessage(user.id, user.pseudo, user.avatar_url, lang, content)
    const earned = await rewardChatMessage(user.id)
    setCoins((prev) => prev + earned)
    setCoinDelta(earned)
    setTimeout(() => setCoinDelta(0), 2500)
    setSending(false)
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
          background: var(--border-gold);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          font-size: 18px;
          flex-shrink: 0;
          transition: opacity 0.2s ease;
        }
        .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      <div className="chat-page">
        {/* header, tabs, messages, input... */}
      </div>
    </>
  )
}