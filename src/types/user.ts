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
}

export type UserProfile = User & {
  total_matches: number
  wins: number
  losses: number
  rank: number
}