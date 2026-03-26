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
  title: 'PSG Fan App',
  description: 'La fan app non officielle du Paris Saint-Germain',
  manifest: '/manifest.json',
  themeColor: '#0a0e1a',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
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