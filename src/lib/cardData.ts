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

// Les fichiers de packs stockent des chemins relatifs ("images/cards/Carte_1.png").
// Sans le "/" de tête, le navigateur les résout par rapport à la page courante
// (ex: /collection/images/cards/Carte_1.png → 404), donc l'image ne s'affichait
// jamais en dehors de l'écran d'ouverture de pack, qui préfixait déjà lui-même.
// On le fait ici, une bonne fois, pour que ça marche partout (collection, builder,
// match, historique...).
function resolveImagePath(path: string): string {
  if (!path) return path
  if (path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `/${path}`
}

function calculerOverall(stats: Record<string, number>): number {
  const valeurs = Object.values(stats).filter((v) => typeof v === 'number')
  if (valeurs.length === 0) return 0
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length)
}

// Applique le bonus de craft (+1 par palier de grade franchi) à chaque stat
// numérique de la carte — voir supabase_migration_grades.sql / craftCardUpgrade.
function applyStatBonus(stats: Record<string, number>, bonus: number): Record<string, number> {
  if (!bonus) return stats
  const boosted: Record<string, number> = {}
  for (const [k, v] of Object.entries(stats)) {
    boosted[k] = typeof v === 'number' ? v + bonus : v
  }
  return boosted
}

export async function rowToOwnedCard(row: any): Promise<OwnedCard | null> {
  const allCards = await getAllCards()
  const carteJSON = allCards.find((c: any) => c.id === row.card_id)
  if (!carteJSON) return null

  const statBonus = row.stat_bonus ?? 0
  const boostedStats = applyStatBonus(carteJSON.stats, statBonus)

  return {
    id: carteJSON.id,
    name: carteJSON.nom,
    category: carteJSON.type,
    rarity: carteJSON.rareté,
    position: carteJSON.position,
    image: resolveImagePath(carteJSON.image),
    stats: {
      ...boostedStats,
      overall: calculerOverall(boostedStats),
    },
    owned_id: row.owned_id,
    user_id: row.user_id,
    obtained_at: row.obtained_at,
    pack_source: row.pack_source,
    // ⚠️ Rétrocompatible : les lignes créées avant la migration grades n'ont
    // pas encore ces colonnes, on retombe sur des valeurs par défaut sûres.
    base_card_id: row.base_card_id ?? row.card_id,
    grade: row.grade ?? null,
    stat_bonus: statBonus,
  }
}