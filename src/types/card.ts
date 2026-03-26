// src/types/card.ts

export type CardRarity = 'Basic' | 'Advanced' | 'Elite'

export type CardCategory = 'joueur' | 'entraineur' | 'trophee'

export type PlayerPosition =
  | 'Gardien'
  | 'Défenseur'
  | 'Milieu'
  | 'Attaquant'

export type CardStats = {
  // Gardien
  physique?: number
  agilité?: number
  arrêt?: number
  // Défenseur
  intelligence?: number
  pression?: number
  // Milieu
  technique?: number
  contrôle?: number
  // Attaquant
  frappe?: number
  // Calculé
  overall: number
}

export type Card = {
  id: string
  name: string
  category: CardCategory
  rarity: CardRarity
  position?: PlayerPosition
  image: string
  stats: CardStats
  description?: string
}

export type OwnedCard = Card & {
  owned_id: string
  user_id: string
  obtained_at: string
  pack_source: string
}