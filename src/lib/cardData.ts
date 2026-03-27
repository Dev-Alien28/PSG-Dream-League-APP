// src/lib/cardData.ts
// ✅ NOUVEAU FICHIER — isole l'import allCards loin de supabase.ts
// Cela évite l'erreur "Unexpected token 'export'" due à un import circulaire
// qui cassait tout le bundle côté client.

import type { OwnedCard } from '@/types/card'

// Import dynamique — ce fichier ne sera jamais importé à l'init de supabase.ts
let _allCards: any[] | null = null

async function getAllCards(): Promise<any[]> {
  if (_allCards) return _allCards
  try {
    const mod = await import('../../data/packs')
    _allCards = (mod as any).allCards ?? []
  } catch (e) {
    console.error('[cardData] Impossible de charger allCards:', e)
    _allCards = []
  }
  return _allCards!
}

function calculerOverall(stats: Record<string, number>): number {
  const valeurs = Object.values(stats).filter((v) => typeof v === 'number')
  if (valeurs.length === 0) return 0
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length)
}

export async function rowToOwnedCard(row: any): Promise<OwnedCard | null> {
  const allCards = await getAllCards()
  const carteJSON = allCards.find((c: any) => c.id === row.card_id)
  if (!carteJSON) return null

  return {
    id: carteJSON.id,
    name: carteJSON.nom,
    category: carteJSON.type,
    rarity: carteJSON.rareté,
    position: carteJSON.position,
    image: carteJSON.image,
    stats: {
      ...carteJSON.stats,
      overall: calculerOverall(carteJSON.stats),
    },
    owned_id: row.owned_id,
    user_id: row.user_id,
    obtained_at: row.obtained_at,
    pack_source: row.pack_source,
  }
}