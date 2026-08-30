// src/lib/coinEngine.ts

import { incrementUserCoins, decrementUserCoins, getUserCoins, isCoinBoostActive, rewardChatMessageServer } from './supabase'

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

export const COIN_REWARDS = {
  CHAT_MESSAGE: 5,          // Par message envoyé dans le chat
  MATCH_WIN: 100,           // Victoire en match
  MATCH_LOSS: 30,           // Défaite en match (pour ne pas décourager)
  MATCH_DRAW: 50,           // Match nul
  STORY_CHAPTER: 75,        // Complétion d'un chapitre histoire
  STORY_CHAPTER_FIRST: 150, // Premier succès sur un chapitre
  DAILY_LOGIN: 20,          // Connexion quotidienne
  MINIGAME_WIN: 25,         // Mini-jeu de tirs au but réussi
  TOURNAMENT_ROUND_WIN: 60, // Chaque match de tournoi remporté
  TOURNAMENT_CHAMPION: 300, // Bonus pour avoir remporté tout le tournoi
} as const

export const COIN_COSTS = {
  CHANGE_PSEUDO: 200,       // Coût du changement de pseudo
} as const

// ─── ATTRIBUTION ──────────────────────────────────────────────────────────────

/**
 * Crédite une récompense en appliquant le boost x2 s'il est actif.
 * ⚠️ Réservé aux vraies récompenses de gameplay — ne jamais l'utiliser pour un
 * remboursement (ex: pseudo) où doubler le montant n'aurait aucun sens.
 */
async function creditReward(userId: string, baseAmount: number): Promise<number> {
  const boosted = await isCoinBoostActive(userId)
  const amount = boosted ? baseAmount * 2 : baseAmount
  await incrementUserCoins(userId, amount)
  return amount
}

/**
 * Récompense pour l'envoi d'un message dans le chat.
 * ⚠️ Le délai anti-spam (10s) est vérifié côté serveur (fonction Postgres
 * reward_chat_message) — avant, il n'était vérifié que côté client, ce qui
 * pouvait être contourné en appelant directement l'API depuis la console du
 * navigateur pour farmer des coins à l'infini.
 */
export async function rewardChatMessage(userId: string): Promise<number> {
  return rewardChatMessageServer(userId)
}

/**
 * Récompense après un match, selon le résultat.
 */
export async function rewardMatch(
  userId: string,
  result: 'win' | 'loss' | 'draw'
): Promise<number> {
  const rewardMap = {
    win: COIN_REWARDS.MATCH_WIN,
    loss: COIN_REWARDS.MATCH_LOSS,
    draw: COIN_REWARDS.MATCH_DRAW,
  }
  return creditReward(userId, rewardMap[result])
}

/**
 * Récompense pour la complétion d'un chapitre histoire.
 * `isFirstTime` = vrai si c'est la première fois que ce chapitre est terminé.
 */
export async function rewardStoryChapter(
  userId: string,
  isFirstTime: boolean
): Promise<number> {
  const amount = isFirstTime
    ? COIN_REWARDS.STORY_CHAPTER_FIRST
    : COIN_REWARDS.STORY_CHAPTER
  return creditReward(userId, amount)
}

/**
 * Récompense de connexion quotidienne.
 */
export async function rewardDailyLogin(userId: string): Promise<number> {
  return creditReward(userId, COIN_REWARDS.DAILY_LOGIN)
}

/**
 * Récompense pour une victoire au mini-jeu (tirs au but).
 * Le montant de base vient toujours du serveur (COIN_REWARDS), jamais du
 * client, pour éviter qu'un montant falsifié soit crédité.
 */
export async function rewardMinigame(userId: string): Promise<number> {
  return creditReward(userId, COIN_REWARDS.MINIGAME_WIN)
}

/**
 * Récompense pour un match de tournoi remporté (un tour).
 */
export async function rewardTournamentRound(userId: string): Promise<number> {
  return creditReward(userId, COIN_REWARDS.TOURNAMENT_ROUND_WIN)
}

/**
 * Bonus pour avoir remporté le tournoi en entier.
 */
export async function rewardTournamentChampion(userId: string): Promise<number> {
  return creditReward(userId, COIN_REWARDS.TOURNAMENT_CHAMPION)
}

// ─── DÉPENSES ─────────────────────────────────────────────────────────────────

/**
 * Déduit le coût de changement de pseudo.
 * Retourne true si la transaction a réussi (coins suffisants).
 */
export async function spendCoinsForPseudoChange(userId: string): Promise<boolean> {
  return decrementUserCoins(userId, COIN_COSTS.CHANGE_PSEUDO)
}

/**
 * Dépense générique — utilisée notamment pour l'achat de packs.
 */
export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true
  return decrementUserCoins(userId, amount)
}

// ─── VÉRIFICATION ─────────────────────────────────────────────────────────────

/**
 * Vérifie si un utilisateur a assez de coins pour une transaction.
 */
export async function hasEnoughCoins(userId: string, cost: number): Promise<boolean> {
  const coins = await getUserCoins(userId)
  return coins >= cost
}

/**
 * Retourne le solde actuel.
 */
export async function getBalance(userId: string): Promise<number> {
  return getUserCoins(userId)
}

// ─── FORMATAGE ────────────────────────────────────────────────────────────────

/**
 * Formate un montant de coins pour l'affichage.
 * Ex: 1500 → "1 500 ₱"
 */
export function formatCoins(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} ₱`
}