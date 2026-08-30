// src/lib/packEngine.ts

import type { Card, CardRarity, OwnedCard } from '@/types/card'
import { addCardToCollection } from './supabase'
import { decrementUserCoins } from './supabase'

// ─── TYPES PACK ───────────────────────────────────────────────────────────────

export interface PackDefinition {
  id: string
  name: string
  description: string
  cost: number          // En PSG Coins (0 = gratuit)
  cardCount: number     // Nombre de cartes par ouverture
  cooldownHours?: number // Pour le pack gratuit
  dropRates: Record<CardRarity, number> // Somme doit = 1
  cardPool: string[]    // IDs de cartes éligibles
}

export interface PackOpenResult {
  cards: OwnedCard[]
  error: string | null
}

// ─── PROBABILITÉS ─────────────────────────────────────────────────────────────

/**
 * Tire une rareté selon les probabilités définies (tirage pondéré).
 */
function rollRarity(dropRates: Record<CardRarity, number>): CardRarity {
  const roll = Math.random()
  let cumulative = 0

  for (const [rarity, rate] of Object.entries(dropRates) as [CardRarity, number][]) {
    cumulative += rate
    if (roll < cumulative) return rarity
  }

  // Fallback sécurisé
  return 'Basic'
}

/**
 * Sélectionne une carte aléatoire dans le pool en respectant la rareté tirée.
 */
function pickCardFromPool(pool: Card[], rarity: CardRarity): Card | null {
  const eligible = pool.filter((c) => c.rarity === rarity)
  if (eligible.length === 0) {
    // Fallback : n'importe quelle carte du pool
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }
  return eligible[Math.floor(Math.random() * eligible.length)]
}

// ─── OUVERTURE ────────────────────────────────────────────────────────────────

/**
 * Ouvre un pack pour un utilisateur.
 * - Vérifie le cooldown (pack gratuit)
 * - Déduit les coins
 * - Tire les cartes
 * - Enregistre en base
 */
export async function openPack(
  userId: string,
  pack: PackDefinition,
  allCards: Card[],
  lastFreePack?: string | null // ISO date, pour le cooldown
): Promise<PackOpenResult> {
  // 1. Vérification cooldown (pack gratuit)
  if (pack.cooldownHours && lastFreePack) {
    const lastDate = new Date(lastFreePack)
    const now = new Date()
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)
    if (diffHours < pack.cooldownHours) {
      const remaining = Math.ceil(pack.cooldownHours - diffHours)
      return {
        cards: [],
        error: `Pack gratuit disponible dans ${remaining}h.`,
      }
    }
  }

  // 2. Déduction des coins (si pack payant)
  if (pack.cost > 0) {
    const success = await decrementUserCoins(userId, pack.cost)
    if (!success) {
      return { cards: [], error: 'PSG Coins insuffisants.' }
    }
  }

  // 3. Filtrer le pool de cartes
  const poolCards = allCards.filter((c) => pack.cardPool.includes(c.id))

  // 4. Tirage des cartes
  const drawnCards: OwnedCard[] = []

  for (let i = 0; i < pack.cardCount; i++) {
    const rarity = rollRarity(pack.dropRates)
    const card = pickCardFromPool(poolCards, rarity)

    if (!card) continue

    const owned = await addCardToCollection(userId, card.id, pack.id)
    if (owned) drawnCards.push(owned)
  }

  if (drawnCards.length === 0) {
    return { cards: [], error: 'Erreur lors du tirage des cartes.' }
  }

  return { cards: drawnCards, error: null }
}

// ─── CHARGEMENT DES PACKS ─────────────────────────────────────────────────────

/**
 * Charge la définition d'un pack depuis les fichiers statiques JSON.
 * À utiliser côté serveur (Next.js Server Component ou API route).
 */
export async function loadPackDefinition(packId: string): Promise<PackDefinition | null> {
  try {
    // Dynamique selon l'ID
    const pack = await import(`@/data/packs/${packId}.json`)
    return pack.default as PackDefinition
  } catch (e) {
    console.error(`[packEngine] loadPackDefinition: pack "${packId}" introuvable`)
    return null
  }
}

export const PACK_IDS = {
  FREE: 'free_pack',
  START: 'psg_start',
  EVENT: 'pack_event',
} as const