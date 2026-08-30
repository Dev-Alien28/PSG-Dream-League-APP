// src/lib/formationData.ts
// Compositions tactiques — les 5 premières sont gratuites, les 9 suivantes
// sont premium (achetables en Boutique, 150 ₱, une fois pour toutes).
// Portées depuis src/utils/teamHelpers.js du bot (objet FORMATIONS), avec les
// bonus plats ("flatBonus") réduits pour s'adapter à l'échelle de notation
// 0-100 de cette appli (le bot travaille sur une échelle 0-300).

import type { Formation } from '@/types/match'
import type { PlayerPosition } from '@/types/card'

export interface FormationDef {
  label: string
  emoji: string
  styleLabel: string
  description: string
  layout: PlayerPosition[]
  bonus: { attaque: number; milieu: number; defense: number }
  premium: boolean
  prix?: number
}

const G: PlayerPosition = 'Gardien'
const D: PlayerPosition = 'Défenseur'
const M: PlayerPosition = 'Milieu'
const A: PlayerPosition = 'Attaquant'

function layout(g: number, d: number, m: number, a: number): PlayerPosition[] {
  return [
    ...Array(g).fill(G),
    ...Array(d).fill(D),
    ...Array(m).fill(M),
    ...Array(a).fill(A),
  ]
}

export const FORMATION_DEFS: Record<Formation, FormationDef> = {
  '4-3-3': {
    label: '4-3-3',
    emoji: '⚡',
    styleLabel: '⚡ Offensif — Ailes',
    description: 'Jeu rapide sur les côtés, forte pression haute',
    layout: layout(1, 4, 3, 3),
    bonus: { attaque: 2, milieu: 0, defense: 0 },
    premium: false,
  },
  '4-4-2': {
    label: '4-4-2',
    emoji: '⚖️',
    styleLabel: '⚖️ Équilibré',
    description: 'Bloc solide, transition rapide, deux pointes',
    layout: layout(1, 4, 4, 2),
    bonus: { attaque: 1, milieu: 1, defense: 1 },
    premium: false,
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    emoji: '🎯',
    styleLabel: '🎯 Possession offensive',
    description: 'Double pivot défensif, ligne offensive à quatre',
    layout: layout(1, 4, 2, 4),
    bonus: { attaque: 1, milieu: 1, defense: 0 },
    premium: false,
  },
  '3-5-2': {
    label: '3-5-2',
    emoji: '🔄',
    styleLabel: '🔄 Domination milieu',
    description: 'Pressing intense, contrôle total du milieu',
    layout: layout(1, 3, 5, 2),
    bonus: { attaque: 0, milieu: 2, defense: 0 },
    premium: false,
  },
  '5-3-2': {
    label: '5-3-2',
    emoji: '🛡️',
    styleLabel: '🛡️ Défensif — Contre',
    description: 'Bloc bas, contre-attaque rapide, solidité défensive',
    layout: layout(1, 5, 3, 2),
    bonus: { attaque: 0, milieu: 0, defense: 2 },
    premium: false,
  },

  '3-2-5': {
    label: '3-2-5',
    emoji: '🚀',
    styleLabel: '🚀 Rouleau compresseur',
    description: 'Full offensif, ligne à 5 devant, gros risque défensif',
    layout: layout(1, 3, 2, 5),
    bonus: { attaque: 4, milieu: 0, defense: -1 },
    premium: true,
    prix: 150,
  },
  '2-3-5': {
    label: '2-3-5',
    emoji: '⚔️',
    styleLabel: '⚔️ Pyramide (WM historique)',
    description: 'Formation historique des années 1920-30, quasi suicidaire en défense',
    layout: layout(1, 2, 3, 5),
    bonus: { attaque: 4, milieu: 0, defense: -1 },
    premium: true,
    prix: 150,
  },
  '3-3-4': {
    label: '3-3-4',
    emoji: '🔴',
    styleLabel: '🔴 Quadri offensif',
    description: 'Deux avant-centres + deux ailiers, très verticale',
    layout: layout(1, 3, 3, 4),
    bonus: { attaque: 3, milieu: 1, defense: 0 },
    premium: true,
    prix: 150,
  },
  '3-4-3': {
    label: '3-4-3',
    emoji: '🌀',
    styleLabel: '🌀 Pressing total',
    description: 'Formation moderne (Conte, Tuchel), très utilisée en vrai foot',
    layout: layout(1, 3, 4, 3),
    bonus: { attaque: 2, milieu: 2, defense: 0 },
    premium: true,
    prix: 150,
  },
  '5-2-3': {
    label: '5-2-3',
    emoji: '🛡️',
    styleLabel: '🛡️⚡ Verrou + contre',
    description: 'Bloc bas très solide, attaquants rapides en transition',
    layout: layout(1, 5, 2, 3),
    bonus: { attaque: 1, milieu: 0, defense: 3 },
    premium: true,
    prix: 150,
  },
  '5-4-1': {
    label: '5-4-1',
    emoji: '🧱',
    styleLabel: '🧱 Bus garé',
    description: 'Ultra-défensif, un seul attaquant isolé pour tenir le score',
    layout: layout(1, 5, 4, 1),
    bonus: { attaque: -1, milieu: 0, defense: 4 },
    premium: true,
    prix: 150,
  },
  '4-1-5': {
    label: '4-1-5',
    emoji: '🎯',
    styleLabel: '🎯 Diamant offensif',
    description: "Un seul relayeur devant la défense, tout repose sur l'attaque",
    layout: layout(1, 4, 1, 5),
    bonus: { attaque: 4, milieu: 0, defense: -1 },
    premium: true,
    prix: 150,
  },
  '2-4-4': {
    label: '2-4-4',
    emoji: '⚖️',
    styleLabel: '⚖️ Box-to-box extrême',
    description: 'Ligne défensive minimaliste, milieu et attaque très denses',
    layout: layout(1, 2, 4, 4),
    bonus: { attaque: 2, milieu: 2, defense: -1 },
    premium: true,
    prix: 150,
  },
  '3-6-1': {
    label: '3-6-1',
    emoji: '🔄',
    styleLabel: '🔄 Milieu total',
    description: 'Domination totale du milieu, un seul point de fixation devant',
    layout: layout(1, 3, 6, 1),
    bonus: { attaque: 0, milieu: 4, defense: 0 },
    premium: true,
    prix: 150,
  },
}

export const FREE_FORMATIONS = (Object.keys(FORMATION_DEFS) as Formation[]).filter(
  (f) => !FORMATION_DEFS[f].premium
)
export const PREMIUM_FORMATIONS = (Object.keys(FORMATION_DEFS) as Formation[]).filter(
  (f) => FORMATION_DEFS[f].premium
)

// Rétrocompatible avec l'ancien export utilisé dans plusieurs pages.
export const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = Object.fromEntries(
  (Object.keys(FORMATION_DEFS) as Formation[]).map((f) => [f, FORMATION_DEFS[f].layout])
) as Record<Formation, PlayerPosition[]>
