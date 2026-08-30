export type Language =
  | 'fr'
  | 'en'
  | 'es'
  | 'it'
  | 'ar'
  | 'ja'
  | 'zh'
  | 'pt-BR'

export type User = {
  id: string
  email: string
  pseudo: string
  avatar_url: string | null
  coins: number
  primary_language: Language
  secondary_languages: Language[]
  created_at: string
  boost_expires_at: string | null
  unlocked_colors: string[]
  selected_color: string
  pity_legend: number
  claimed_milestones: string[]
  unlocked_formations: string[]
  unlocked_affiches: string[]
  selected_affiche: string
}

export type UserProfile = User & {
  total_matches: number
  wins: number
  losses: number
  rank: number
}