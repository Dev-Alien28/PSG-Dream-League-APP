// src/app/layout.tsx
import type { Metadata } from 'next'
import { Rajdhani } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PSG Dream League',
  description: 'La fan app non officielle du Paris Saint-Germain',
  manifest: '/manifest.json',
  themeColor: '#0a0e1a',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={rajdhani.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <main className="app-main">
          {children}
        </main>
        <Navbar />
      </body>
    </html>
  )
}