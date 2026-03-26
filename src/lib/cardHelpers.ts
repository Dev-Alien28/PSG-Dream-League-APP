// src/lib/cardHelpers.ts

import type { Card, CardCategory, CardRarity, CardStats, OwnedCard, PlayerPosition } from '@/types/card'
import type { TeamSlot } from '@/types/match'

// ─── FILTRAGE ─────────────────────────────────────────────────────────────────

export function filterByCategory(cards: OwnedCard[], category: CardCategory): OwnedCard[] {
  return cards.filter((c) => c.category === category)
}

export function filterByRarity(cards: OwnedCard[], rarity: CardRarity): OwnedCard[] {
  return cards.filter((c) => c.rarity === rarity)
}

export function filterByPosition(cards: OwnedCard[], position: PlayerPosition): OwnedCard[] {
  return cards.filter((c) => c.position === position)
}

export function filterByName(cards: OwnedCard[], query: string): OwnedCard[] {
  const q = query.toLowerCase().trim()
  return cards.filter((c) => c.name.toLowerCase().includes(q))
}

export function sortByOverall(cards: OwnedCard[], desc = true): OwnedCard[] {
  return [...cards].sort((a, b) =>
    desc ? b.stats.overall - a.stats.overall : a.stats.overall - b.stats.overall
  )
}

// ─── COMPATIBILITÉ POSTE ──────────────────────────────────────────────────────

/**
 * Les cartes `joueur` ont un `position` qui doit correspondre au slot.
 * Les cartes `entraineur` et `trophee` ne sont pas jouables en match.
 */
export function isCardCompatibleWithSlot(card: OwnedCard, slot: TeamSlot): boolean {
  if (card.category !== 'joueur') return false
  return card.position === slot.position
}

/**
 * Retourne toutes les cartes jouables pour un slot donné.
 */
export function getCompatibleCards(cards: OwnedCard[], slot: TeamSlot): OwnedCard[] {
  return cards.filter((c) => isCardCompatibleWithSlot(c, slot))
}

// ─── CALCUL D'OVERALL ─────────────────────────────────────────────────────────

/**
 * Calcule l'overall d'une carte selon sa position et ses stats.
 * Chaque position pondère différemment les statistiques.
 */
export function computeOverall(stats: Omit<CardStats, 'overall'>, position?: PlayerPosition): number {
  if (!position) {
    // Cartes non-joueur : moyenne des stats disponibles
    const values = Object.values(stats).filter((v): v is number => typeof v === 'number')
    if (values.length === 0) return 0
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
  }

  switch (position) {
    case 'Gardien':
      return Math.round(
        ((stats.physique ?? 50) * 0.2 +
          (stats.agilité ?? 50) * 0.35 +
          (stats.arrêt ?? 50) * 0.45)
      )

    case 'Défenseur':
      return Math.round(
        ((stats.physique ?? 50) * 0.3 +
          (stats.intelligence ?? 50) * 0.35 +
          (stats.pression ?? 50) * 0.35)
      )

    case 'Milieu':
      return Math.round(
        ((stats.physique ?? 50) * 0.2 +
          (stats.technique ?? 50) * 0.4 +
          (stats.contrôle ?? 50) * 0.4)
      )

    case 'Attaquant':
      return Math.round(
        ((stats.physique ?? 50) * 0.2 +
          (stats.technique ?? 50) * 0.25 +
          (stats.frappe ?? 50) * 0.55)
      )

    default:
      return 50
  }
}

// ─── OVERALL ÉQUIPE ───────────────────────────────────────────────────────────

/**
 * Calcule l'overall moyen d'une équipe à partir des slots remplis.
 * Les slots vides sont ignorés.
 */
export function computeTeamOverall(slots: TeamSlot[]): number {
  const filledSlots = slots.filter((s) => s.card !== null)
  if (filledSlots.length === 0) return 0

  const total = filledSlots.reduce((sum, s) => sum + (s.card!.stats.overall ?? 0), 0)
  return Math.round(total / filledSlots.length)
}

// ─── RARETÉ ───────────────────────────────────────────────────────────────────

export const RARITY_ORDER: Record<CardRarity, number> = {
  Basic: 0,
  Advanced: 1,
  Elite: 2,
}

export function sortByRarity(cards: OwnedCard[], desc = true): OwnedCard[] {
  return [...cards].sort((a, b) => {
    const diff = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]
    return desc ? diff : -diff
  })
}

export const RARITY_LABELS: Record<CardRarity, string> = {
  Basic: 'Basique',
  Advanced: 'Avancée',
  Elite: 'Élite',
}

export const RARITY_COLORS: Record<CardRarity, string> = {
  Basic: '#94a3b8',    // gris-bleu
  Advanced: '#3b82f6', // bleu
  Elite: '#f59e0b',    // or
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

/**
 * Déduplique les cartes en ne gardant que la meilleure version (highest overall)
 * de chaque card_id — utile pour le builder.
 */
export function getBestVersionPerCard(cards: OwnedCard[]): OwnedCard[] {
  const map = new Map<string, OwnedCard>()
  for (const card of cards) {
    const existing = map.get(card.id)
    if (!existing || card.stats.overall > existing.stats.overall) {
      map.set(card.id, card)
    }
  }
  return Array.from(map.values())
}

/**
 * Retourne le nombre de cartes par rareté.
 */
export function countByRarity(cards: OwnedCard[]): Record<CardRarity, number> {
  return cards.reduce(
    (acc, card) => {
      acc[card.rarity] = (acc[card.rarity] ?? 0) + 1
      return acc
    },
    { Basic: 0, Advanced: 0, Elite: 0 } as Record<CardRarity, number>
  )
}