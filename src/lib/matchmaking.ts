// src/lib/matchmaking.ts

import { supabase } from './supabase'
import { computeTeamOverall } from './cardHelpers'
import type { Team, Formation } from '@/types/match'
import type { OwnedCard, PlayerPosition } from '@/types/card'

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const MATCHMAKING_TIMEOUT_MS = 15_000   // 15 secondes avant de tomber sur un bot
const OVERALL_TOLERANCE = 10             // Écart max d'overall pour matcher deux joueurs
const MATCHMAKING_CHANNEL = 'matchmaking_queue'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface QueueEntry {
  user_id: string
  pseudo: string
  overall: number
  team: Team
  joined_at: string
}

// ─── FILE D'ATTENTE ───────────────────────────────────────────────────────────

/**
 * Inscrit le joueur dans la file de matchmaking.
 */
export async function joinQueue(entry: QueueEntry): Promise<boolean> {
  const { error } = await supabase.from('matchmaking_queue').upsert(
    {
      user_id: entry.user_id,
      pseudo: entry.pseudo,
      overall: entry.overall,
      team: entry.team,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('[matchmaking] joinQueue:', error.message)
    return false
  }
  return true
}

/**
 * Retire le joueur de la file d'attente.
 */
export async function leaveQueue(userId: string): Promise<void> {
  await supabase.from('matchmaking_queue').delete().eq('user_id', userId)
}

/**
 * Cherche un adversaire disponible avec un overall similaire.
 */
export async function findOpponent(
  userId: string,
  playerOverall: number
): Promise<QueueEntry | null> {
  const { data, error } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .neq('user_id', userId)
    .gte('overall', playerOverall - OVERALL_TOLERANCE)
    .lte('overall', playerOverall + OVERALL_TOLERANCE)
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null
  return data as QueueEntry
}

// ─── MATCHMAKING PRINCIPAL ────────────────────────────────────────────────────

export interface MatchmakingResult {
  opponent: Team
  isBot: boolean
}

/**
 * Lance la recherche d'adversaire avec timeout.
 * - Tente de trouver un joueur réel via polling + Realtime
 * - Si timeout → génère un bot
 */
export async function searchForOpponent(
  playerTeam: Team,
  onStatusChange?: (status: 'searching' | 'found' | 'bot') => void
): Promise<MatchmakingResult> {
  const overall = playerTeam.overall
  onStatusChange?.('searching')

  // Inscrire dans la file
  await joinQueue({
    user_id: playerTeam.user_id,
    pseudo: playerTeam.pseudo,
    overall,
    team: playerTeam,
    joined_at: new Date().toISOString(),
  })

  return new Promise((resolve) => {
    let resolved = false
    let subscription: ReturnType<typeof supabase.channel> | null = null

    const finish = async (result: MatchmakingResult) => {
      if (resolved) return
      resolved = true
      await leaveQueue(playerTeam.user_id)
      subscription?.unsubscribe()
      resolve(result)
    }

    // Timeout → bot
    const timeout = setTimeout(async () => {
      onStatusChange?.('bot')
      const bot = generateBotTeam(overall)
      await finish({ opponent: bot, isBot: true })
    }, MATCHMAKING_TIMEOUT_MS)

    // Polling immédiat
    const pollOpponent = async () => {
      const opponent = await findOpponent(playerTeam.user_id, overall)
      if (opponent) {
        clearTimeout(timeout)
        onStatusChange?.('found')
        // Retirer l'adversaire de la file
        await leaveQueue(opponent.user_id)
        await finish({ opponent: opponent.team, isBot: false })
      }
    }

    pollOpponent()

    // Écouter les nouvelles entrées en file
    subscription = supabase
      .channel(MATCHMAKING_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matchmaking_queue' },
        () => { if (!resolved) pollOpponent() }
      )
      .subscribe()
  })
}

// ─── BOT ──────────────────────────────────────────────────────────────────────

const BOT_NAMES = [
  'RougeetBleu_Bot', 'ParisFan_IA', 'Titi_PSG', 'PrinceduParcBot',
  'Capital_Bot', 'PsgForever_AI', 'CityOfLight_Bot',
]

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2']

/**
 * Génère une carte bot fictive pour un poste donné, avec un overall cible.
 */
function generateBotCard(position: PlayerPosition, targetOverall: number): OwnedCard {
  const jitter = randomBetween(-8, 8)
  const overall = clamp(targetOverall + jitter, 20, 99)

  const baseStats = buildStatsForPosition(position, overall)

  return {
    id: `bot_${position}_${Math.random().toString(36).slice(2)}`,
    owned_id: `bot_owned_${Math.random().toString(36).slice(2)}`,
    user_id: 'bot',
    name: botPlayerName(position),
    category: 'joueur',
    rarity: overall >= 80 ? 'Elite' : overall >= 60 ? 'Advanced' : 'Basic',
    position,
    image: `/images/cards/bot_${position.toLowerCase()}.png`,
    stats: { ...baseStats, overall },
    obtained_at: new Date().toISOString(),
    pack_source: 'bot',
  }
}

function buildStatsForPosition(position: PlayerPosition, overall: number) {
  const base = overall + randomBetween(-5, 5)
  switch (position) {
    case 'Gardien':
      return { physique: base - 5, agilité: base, arrêt: base + 3 }
    case 'Défenseur':
      return { physique: base, intelligence: base + 3, pression: base - 2 }
    case 'Milieu':
      return { physique: base - 3, technique: base + 2, contrôle: base }
    case 'Attaquant':
      return { physique: base - 2, technique: base, frappe: base + 4 }
    default:
      return {}
  }
}

function botPlayerName(position: PlayerPosition): string {
  const names: Record<PlayerPosition, string[]> = {
    Gardien: ['Robo GK', 'AutoStop', 'MegaGarden'],
    Défenseur: ['IronBot', 'SteelBack', 'CyberDef'],
    Milieu: ['MidBot', 'PassBot', 'TechMid'],
    Attaquant: ['GoalBot', 'StrikerAI', 'NetBot'],
  }
  const list = names[position]
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * Génère une équipe bot complète avec un niveau similaire au joueur.
 */
export function generateBotTeam(playerOverall: number): Team {
  const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)]
  const slots = buildSlotsFromFormation(formation, playerOverall)

  return {
    user_id: 'bot',
    pseudo: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
    formation,
    slots,
    overall: playerOverall + randomBetween(-5, 5),
  }
}

/**
 * Construit les slots d'une équipe selon la formation.
 */
function buildSlotsFromFormation(formation: Formation, overall: number) {
  const layout = FORMATION_LAYOUTS[formation]
  return layout.map((position) => ({
    position,
    card: generateBotCard(position, overall),
  }))
}

const FORMATION_LAYOUTS: Record<Formation, PlayerPosition[]> = {
  '4-3-3': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant', 'Attaquant'],
  '4-4-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '4-2-3-1': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant'],
  '3-5-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
  '5-3-2': ['Gardien', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Défenseur', 'Milieu', 'Milieu', 'Milieu', 'Attaquant', 'Attaquant'],
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}