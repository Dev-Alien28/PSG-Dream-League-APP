// src/lib/matchEngine.ts

import { v4 as uuidv4 } from 'uuid'
import type { Team, MatchResult, MatchEvent } from '@/types/match'
import type { OwnedCard } from '@/types/card'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val))
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Retourne les cartes joueurs d'une équipe (exclut entraîneurs et trophées).
 */
function getPlayerCards(team: Team): OwnedCard[] {
  return team.slots
    .filter((s) => s.card && s.card.category === 'joueur')
    .map((s) => s.card!)
}

/**
 * Calcule l'overall offensif : attaquants + milieux pondérés.
 */
function getAttackRating(team: Team): number {
  const players = getPlayerCards(team)
  const attackers = players.filter((c) => c.position === 'Attaquant')
  const midfielders = players.filter((c) => c.position === 'Milieu')

  const attAvg = attackers.length
    ? attackers.reduce((s, c) => s + c.stats.overall, 0) / attackers.length
    : 50
  const midAvg = midfielders.length
    ? midfielders.reduce((s, c) => s + c.stats.overall, 0) / midfielders.length
    : 50

  return attAvg * 0.65 + midAvg * 0.35
}

/**
 * Calcule l'overall défensif : défenseurs + gardien pondérés.
 */
function getDefenseRating(team: Team): number {
  const players = getPlayerCards(team)
  const defenders = players.filter((c) => c.position === 'Défenseur')
  const goalkeepers = players.filter((c) => c.position === 'Gardien')

  const defAvg = defenders.length
    ? defenders.reduce((s, c) => s + c.stats.overall, 0) / defenders.length
    : 50
  const gkAvg = goalkeepers.length
    ? goalkeepers.reduce((s, c) => s + c.stats.overall, 0) / goalkeepers.length
    : 50

  return defAvg * 0.6 + gkAvg * 0.4
}

// ─── SIMULATION ───────────────────────────────────────────────────────────────

interface MatchState {
  scoreHome: number
  scoreAway: number
  events: MatchEvent[]
}

/**
 * Simule une occasion de but.
 * La probabilité de but dépend du ratio attaque/défense.
 */
function simulateChance(
  attackTeam: Team,
  defenseTeam: Team,
  side: 'home' | 'away',
  minute: number,
  state: MatchState
): void {
  const attackRating = getAttackRating(attackTeam)
  const defenseRating = getDefenseRating(defenseTeam)

  // Probabilité de but : entre 15% et 55% selon le différentiel de stats
  const diff = clamp((attackRating - defenseRating) / 100, -0.3, 0.3)
  const goalChance = clamp(0.3 + diff, 0.15, 0.55)

  // Occasion
  const attackers = getPlayerCards(attackTeam).filter((c) => c.position === 'Attaquant')
  const scorer = attackers.length
    ? attackers[Math.floor(Math.random() * attackers.length)]
    : getPlayerCards(attackTeam)[0]

  if (!scorer) return

  state.events.push({
    minute,
    type: 'occasion',
    player_name: scorer.name,
    team: side,
  })

  const isGoal = Math.random() < goalChance

  if (isGoal) {
    if (side === 'home') state.scoreHome += 1
    else state.scoreAway += 1

    state.events.push({
      minute,
      type: 'but',
      player_name: scorer.name,
      team: side,
    })
  } else {
    // Arrêt du gardien
    const keepers = getPlayerCards(defenseTeam).filter((c) => c.position === 'Gardien')
    const keeper = keepers[0]
    if (keeper) {
      state.events.push({
        minute: minute + 1,
        type: 'arret',
        player_name: keeper.name,
        team: side === 'home' ? 'away' : 'home',
      })
    }
  }
}

/**
 * Décide si une occasion se produit à une minute donnée.
 * En moyenne ~3 occasions par mi-temps.
 */
function shouldChanceOccur(): boolean {
  return Math.random() < 0.065 // ~6.5% par minute = ~6 occasions sur 90 min
}

/**
 * Simule le déroulement complet d'un match.
 */
export function simulateMatch(
  home: Team,
  away: Team,
  isBot: boolean = false
): MatchResult {
  const state: MatchState = {
    scoreHome: 0,
    scoreAway: 0,
    events: [],
  }

  // Simulation minute par minute
  for (let minute = 1; minute <= 90; minute++) {
    if (shouldChanceOccur()) {
      // Qui attaque ce moment : pondéré par overall respectif
      const homeAttack = getAttackRating(home)
      const awayAttack = getAttackRating(away)
      const total = homeAttack + awayAttack

      const homeAttacks = Math.random() < homeAttack / total
      if (homeAttacks) {
        simulateChance(home, away, 'home', minute, state)
      } else {
        simulateChance(away, home, 'away', minute, state)
      }
    }
  }

  // Résultat
  let winner: 'home' | 'away' | 'draw'
  if (state.scoreHome > state.scoreAway) winner = 'home'
  else if (state.scoreAway > state.scoreHome) winner = 'away'
  else winner = 'draw'

  // PSG Coins gagnés selon résultat (home = le joueur humain)
  const coinsMap = { home: 100, away: 30, draw: 50 }
  const coinsEarned = coinsMap[winner]

  return {
    id: uuidv4(),
    home,
    away,
    score_home: state.scoreHome,
    score_away: state.scoreAway,
    events: state.events,
    winner,
    coins_earned: coinsEarned,
    played_at: new Date().toISOString(),
    is_bot: isBot,
  }
}

// ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────

/**
 * Retourne un résumé textuel court du match.
 */
export function getMatchSummary(result: MatchResult): string {
  const { home, away, score_home, score_away, winner } = result
  const winnerName =
    winner === 'home' ? home.pseudo : winner === 'away' ? away.pseudo : null
  const base = `${home.pseudo} ${score_home} - ${score_away} ${away.pseudo}`
  if (winnerName) return `${base} (Victoire de ${winnerName})`
  return `${base} (Match nul)`
}

/**
 * Retourne les buteurs d'une équipe.
 */
export function getScorers(result: MatchResult, side: 'home' | 'away'): string[] {
  return result.events
    .filter((e) => e.type === 'but' && e.team === side)
    .map((e) => `${e.player_name} (${e.minute}')`)
}