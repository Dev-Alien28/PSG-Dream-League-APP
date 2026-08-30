// src/lib/cardHelpers.ts

import type { Card, CardCategory, CardGrade, CardRarity, CardStats, OwnedCard, PlayerPosition } from '@/types/card'
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
  Legend: 3,
  Unique: 4,
  Give: 5,
  Encounter: 6,
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
  Legend: 'Légende',
  Unique: 'Unique',
  Give: 'Cadeau',
  Encounter: 'Rencontre',
}

export const RARITY_COLORS: Record<CardRarity, string> = {
  Basic: '#94a3b8',    // gris-bleu
  Advanced: '#3b82f6', // bleu
  Elite: '#f59e0b',    // or
  Legend: '#f6c343',   // or riche + couronne
  Unique: '#f472b6',   // rose-violet + étoile
  Give: '#f87171',     // rouge + cadeau
  Encounter: '#fdf1b8', // crème pâle + cravate
}

export const RARITY_EMOJIS: Record<CardRarity, string> = {
  Basic: '🟢',
  Advanced: '🔵',
  Elite: '🟣',
  Legend: '👑',
  Unique: '⭐',
  Give: '🎁',
  Encounter: '👔',
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
    { Basic: 0, Advanced: 0, Elite: 0, Legend: 0, Unique: 0, Give: 0, Encounter: 0 } as Record<CardRarity, number>
  )
}

// ─── GRADE / CRAFT (améliorations par doublons) ────────────────────────────────
// Porté fidèlement depuis le bot (src/utils/cardHelpers.js). Un grade se
// superpose à la rareté de base sans la changer : une carte Basic améliorée
// reste `rarity: 'Basic'` mais porte `grade: 'plus' | 'x' | 'omega'`.
// Seules les raretés Basic/Advanced/Elite sont craftables — Legend, Unique,
// Give et Encounter restent telles quelles (trop rares pour être dupliquées).

export interface GradeStep {
  grade: CardGrade
  next: Exclude<CardGrade, null>
  need: number
}

export const GRADE_STEPS: Partial<Record<CardRarity, GradeStep[]>> = {
  Basic: [
    { grade: null, next: 'plus', need: 4 },
    { grade: 'plus', next: 'x', need: 3 },
    { grade: 'x', next: 'omega', need: 2 },
  ],
  Advanced: [
    { grade: null, next: 'x', need: 4 },
    { grade: 'x', next: 'omega', need: 3 },
  ],
  Elite: [
    { grade: null, next: 'omega', need: 4 },
  ],
}

export const GRADE_SUFFIX: Record<Exclude<CardGrade, null>, string> = {
  plus: '+',
  x: 'X',
  omega: 'Ω',
}

export function gradeSuffix(grade: CardGrade): string {
  return grade ? GRADE_SUFFIX[grade] : ''
}

export function isUpgradableRarity(rarity: CardRarity): boolean {
  return Object.prototype.hasOwnProperty.call(GRADE_STEPS, rarity)
}

export function getNextGradeStep(rarity: CardRarity, currentGrade: CardGrade): GradeStep | null {
  const steps = GRADE_STEPS[rarity]
  if (!steps) return null
  return steps.find((s) => s.grade === currentGrade) ?? null
}

/**
 * Groupe les cartes possédées par (base_card_id + grade) pour l'écran de
 * craft — chaque groupe représente un "empilement" de doublons identiques.
 */
export interface CardStack {
  baseCardId: string
  grade: CardGrade
  rarity: CardRarity
  cards: OwnedCard[]
}

export function groupOwnedCardsForCraft(cards: OwnedCard[]): CardStack[] {
  const map = new Map<string, CardStack>()
  for (const card of cards) {
    if (card.category !== 'joueur') continue
    const key = `${card.base_card_id}__${card.grade ?? 'null'}`
    const existing = map.get(key)
    if (existing) {
      existing.cards.push(card)
    } else {
      map.set(key, { baseCardId: card.base_card_id, grade: card.grade, rarity: card.rarity, cards: [card] })
    }
  }
  return Array.from(map.values())
}

export const SELL_PRICE: Partial<Record<CardRarity, number>> = {
  Basic: 50,
  Advanced: 100,
  Elite: 200,
}

/**
 * Vrai si le joueur possède déjà la version Ω d'une carte donnée.
 */
export function hasOmegaVersion(cards: OwnedCard[], baseCardId: string): boolean {
  return cards.some((c) => c.base_card_id === baseCardId && c.grade === 'omega')
}

/**
 * Piles de doublons classiques vendables : rareté upgradable, grade nul,
 * et Ω déjà possédée pour cette carte (comme dans le bot — voir
 * getSellableDuplicates dans src/utils/database.js).
 */
export function getSellableStacks(cards: OwnedCard[]): CardStack[] {
  return groupOwnedCardsForCraft(cards).filter(
    (s) => s.grade === null && isUpgradableRarity(s.rarity) && hasOmegaVersion(cards, s.baseCardId)
  )
}