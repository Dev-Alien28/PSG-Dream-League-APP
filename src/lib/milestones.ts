// src/lib/milestones.ts
// Jalons (achievements) qui débloquent une carte Cadeau (rareté Give) une
// seule fois — ces cartes sont distribuées à la main par les admins dans le
// bot Discord (MVP d'événements, etc.), donc on ne les met pas dans un pack
// aléatoire : elles récompensent ici de vraies étapes marquantes.

import giveCards from '../../data/packs/pack_give.json'
import { claimMilestone } from './supabase'

export const MILESTONES = {
  first_omega: {
    label: 'Premier craft Ω',
    description: 'Améliorer une carte jusqu\u2019au grade Ω pour la première fois',
  },
  first_tournament_champion: {
    label: 'Premier tournoi remporté',
    description: 'Remporter un tournoi complet pour la première fois',
  },
  all_encounters: {
    label: 'Toutes les rencontres',
    description: 'Obtenir les 5 cartes Rencontre',
  },
} as const

export type MilestoneKey = keyof typeof MILESTONES

interface MilestoneResult {
  unlocked: boolean
  cardName?: string
}

/**
 * Tente de réclamer un jalon. Ne fait rien si déjà réclamé (vérifié côté
 * serveur). Retourne le nom de la carte Cadeau obtenue si débloqué.
 */
export async function tryClaimMilestone(
  userId: string,
  key: MilestoneKey,
  alreadyClaimed: string[]
): Promise<MilestoneResult> {
  if (alreadyClaimed.includes(key)) return { unlocked: false }

  const pool = giveCards as { id: string; nom: string }[]
  const card = pool[Math.floor(Math.random() * pool.length)]

  const result = await claimMilestone(userId, key, card.id)
  if (!result.success) return { unlocked: false }

  return { unlocked: true, cardName: card.nom }
}
