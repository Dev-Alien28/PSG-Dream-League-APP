'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  {
    href: '/chat',
    label: 'Chat',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: '/packs',
    label: 'Boutique',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    href: '/collection',
    label: 'Collection',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    href: '/equipe/builder',
    label: 'Équipe',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
        <path d="M19 8a3 3 0 1 1 0-6"/>
        <path d="M5 8a3 3 0 1 0 0-6"/>
        <path d="M22 20v-1.5a4.5 4.5 0 0 0-3-4.24"/>
        <path d="M2 20v-1.5a4.5 4.5 0 0 1 3-4.24"/>
      </svg>
    ),
  },
  {
    href: '/match',
    label: 'Match',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    href: '/histoire',
    label: 'Histoire',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    href: '/config',
    label: 'Config',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
]

export default function Navbar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      setVisible(currentY < lastY || currentY < 60)
      setLastY(currentY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastY])

  const isActive = (href: string) => {
    if (href === '/chat') return pathname.startsWith('/chat')
    if (href === '/equipe/builder') return pathname.startsWith('/equipe')
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      <style>{`
        .psg-navbar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: linear-gradient(135deg, #0a0e1a 0%, #0d1229 100%);
          border-top: 1px solid rgba(196, 160, 80, 0.2);
          padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
          display: flex;
          justify-content: space-around;
          align-items: center;
          transform: translateY(${visible ? '0' : '100%'});
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(20px);
          box-shadow: 0 -8px 32px rgba(0,0,0,0.5), 0 -1px 0 rgba(196,160,80,0.1);
        }
        .psg-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 6px 8px;
          border-radius: 10px;
          text-decoration: none;
          color: rgba(255,255,255,0.35);
          transition: all 0.2s ease;
          position: relative;
          min-width: 44px;
          cursor: pointer;
        }
        .psg-nav-item.active {
          color: #c4a050;
        }
        .psg-nav-item.active::before {
          content: '';
          position: absolute;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #c4a050, transparent);
          border-radius: 2px;
        }
        .psg-nav-item:active {
          transform: scale(0.9);
        }
        .psg-nav-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-family: 'Rajdhani', sans-serif;
        }
        .psg-nav-icon-wrap {
          position: relative;
        }
        .psg-nav-item.active .psg-nav-icon-wrap::after {
          content: '';
          position: absolute;
          inset: -4px;
          background: radial-gradient(circle, rgba(196,160,80,0.12) 0%, transparent 70%);
          border-radius: 50%;
        }
      `}</style>
      <nav className="psg-navbar">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={`psg-nav-item${active ? ' active' : ''}`}>
              <span className="psg-nav-icon-wrap">
                {item.icon(active)}
              </span>
              <span className="psg-nav-label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}