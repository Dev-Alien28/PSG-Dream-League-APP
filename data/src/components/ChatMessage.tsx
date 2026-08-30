'use client'

import type { ChatMessage as ChatMessageType } from '@/lib/supabase'

interface ChatMessageProps {
  message: ChatMessageType
  currentUserId: string
  showAvatar?: boolean
}

const LANGUAGE_FLAGS: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  it: '🇮🇹',
  ar: '🇸🇦',
  ja: '🇯🇵',
  zh: '🇨🇳',
  'pt-BR': '🇧🇷',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'maintenant'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}j`
}

function getAvatarColor(pseudo: string): string {
  const colors = ['#c4a050', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  let hash = 0
  for (let i = 0; i < pseudo.length; i++) hash = pseudo.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function ChatMessageComponent({
  message,
  currentUserId,
  showAvatar = true,
}: ChatMessageProps) {
  const isOwn = message.user_id === currentUserId
  const avatarColor = getAvatarColor(message.pseudo)
  const initials = message.pseudo.slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        @keyframes msgIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .chat-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 2px 0;
          animation: msgIn 0.2s ease both;
        }
        .chat-msg-row.own {
          flex-direction: row-reverse;
        }
        .chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Rajdhani', sans-serif;
          letter-spacing: 0.04em;
          overflow: hidden;
          border: 1.5px solid rgba(255,255,255,0.1);
        }
        .chat-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .chat-avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0e1a;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Rajdhani', sans-serif;
        }
        .chat-bubble-wrap {
          display: flex;
          flex-direction: column;
          max-width: calc(100% - 52px);
          gap: 3px;
        }
        .chat-msg-row.own .chat-bubble-wrap {
          align-items: flex-end;
        }
        .chat-meta {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 4px;
        }
        .chat-pseudo {
          font-family: 'Rajdhani', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.04em;
        }
        .chat-time {
          font-family: 'Rajdhani', sans-serif;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
        }
        .chat-flag {
          font-size: 10px;
        }
        .chat-bubble {
          padding: 9px 13px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.45;
          color: rgba(255,255,255,0.9);
          word-break: break-word;
          position: relative;
          max-width: 100%;
        }
        .chat-bubble.other {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-bottom-left-radius: 4px;
        }
        .chat-bubble.own {
          background: linear-gradient(135deg, rgba(196,160,80,0.25) 0%, rgba(196,160,80,0.15) 100%);
          border: 1px solid rgba(196,160,80,0.3);
          border-bottom-right-radius: 4px;
          color: rgba(255,255,255,0.95);
        }
      `}</style>

      <div className={`chat-msg-row${isOwn ? ' own' : ''}`}>
        {showAvatar && !isOwn && (
          <div className="chat-avatar">
            {message.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="chat-avatar-img" src={message.avatar_url} alt={message.pseudo} />
            ) : (
              <div className="chat-avatar-placeholder" style={{ background: avatarColor }}>
                {initials}
              </div>
            )}
          </div>
        )}

        <div className="chat-bubble-wrap">
          {!isOwn && (
            <div className="chat-meta">
              <span className="chat-pseudo">{message.pseudo}</span>
              <span className="chat-flag">{LANGUAGE_FLAGS[message.lang] || ''}</span>
              <span className="chat-time">{timeAgo(message.created_at)}</span>
            </div>
          )}

          <div className={`chat-bubble ${isOwn ? 'own' : 'other'}`}>
            {message.content}
          </div>

          {isOwn && (
            <div className="chat-meta" style={{ justifyContent: 'flex-end' }}>
              <span className="chat-time">{timeAgo(message.created_at)}</span>
            </div>
          )}
        </div>

        {showAvatar && isOwn && (
          <div className="chat-avatar" style={{ visibility: 'hidden' }} />
        )}
      </div>
    </>
  )
}