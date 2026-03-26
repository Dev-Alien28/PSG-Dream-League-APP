import { OwnedCard, PlayerPosition } from './card'

export type Formation =
  | '4-3-3'
  | '4-4-2'
  | '4-2-3-1'
  | '3-5-2'
  | '5-3-2'

export type TeamSlot = {
  position: PlayerPosition
  card: OwnedCard | null
}

export type Team = {
  user_id: string
  pseudo: string
  formation: Formation
  slots: TeamSlot[]
  overall: number
}

export type MatchEvent = {
  minute: number
  type: 'but' | 'arret' | 'occasion' | 'carton'
  player_name: string
  team: 'home' | 'away'
}

export type MatchResult = {
  id: string
  home: Team
  away: Team
  score_home: number
  score_away: number
  events: MatchEvent[]
  winner: 'home' | 'away' | 'draw'
  coins_earned: number
  played_at: string
  is_bot: boolean
}

export type MatchStatus =
  | 'searching'
  | 'found'
  | 'in_progress'
  | 'finished'