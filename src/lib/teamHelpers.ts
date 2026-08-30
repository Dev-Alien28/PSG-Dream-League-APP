// src/lib/teamHelpers.ts
// Centralise la construction de l'équipe du joueur (utilisée par /match,
// /match/online et /tournoi) pour éviter d'avoir cette logique dupliquée à
// plusieurs endroits — c'est justement ce genre de duplication qui avait causé
// le bug où /match ignorait l'équipe sauvegardée dans le Builder.

import type { OwnedCard, PlayerPosition } from '@/types/card'
import type { Formation, Team, TeamSlot } from '@/types/match'
import { getUserTeam } from './supabase'

export const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = {
  '4-3-3': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant', 'Attaquant'],
  '4-4-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '4-2-3-1': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant'],
  '3-5-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '5-3-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
}

/**
 * Construit automatiquement la meilleure équipe possible (par overall) à
 * partir de la collection, pour une formation donnée. Utilisé si le joueur
 * n'a pas encore sauvegardé d'équipe dans le Builder, ou si celle-ci est
 * incomplète.
 */
export function autoBuildTeam(collection: OwnedCard[], formation: Formation = '4-3-3'): TeamSlot[] {
  const positions = FORMATION_LAYOUTS[formation]
  const usedIds = new Set<string>()
  return positions.map((position) => {
    const available = collection.filter(
      (c) => c.category === 'joueur' && c.position === position && !usedIds.has(c.owned_id)
    )
    available.sort((a, b) => b.stats.overall - a.stats.overall)
    const card = available[0] || null
    if (card) usedIds.add(card.owned_id)
    return { position, card }
  })
}

/**
 * Charge l'équipe du joueur : celle sauvegardée dans Collection > Builder si
 * elle est complète, sinon un onze auto-généré avec les meilleures cartes.
 */
export async function loadPlayerTeam(
  userId: string,
  pseudo: string,
  collection: OwnedCard[],
  computeTeamOverall: (slots: TeamSlot[]) => number
): Promise<Team> {
  let formation: Formation = '4-3-3'
  let slots: TeamSlot[] | undefined

  const saved = await getUserTeam(userId)
  if (saved) {
    const layout = FORMATION_LAYOUTS[saved.formation] ?? FORMATION_LAYOUTS['4-3-3']
    const hydrated = layout.map((position, idx) => {
      const s = saved.slots[idx]
      const card = s?.owned_id ? collection.find((c) => c.owned_id === s.owned_id) ?? null : null
      return { position, card }
    })
    const complete = hydrated.length === layout.length && hydrated.every((s) => s.card !== null)
    if (complete) {
      formation = saved.formation
      slots = hydrated
    }
  }
  if (!slots) slots = autoBuildTeam(collection, formation)

  return {
    user_id: userId,
    pseudo,
    formation,
    slots,
    overall: computeTeamOverall(slots),
  }
}
