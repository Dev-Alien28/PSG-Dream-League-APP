// src/lib/coinEngine.ts

import { incrementUserCoins, decrementUserCoins, getUserCoins } from './supabase'

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

export const COIN_REWARDS = {
  CHAT_MESSAGE: 5,          // Par message envoyé dans le chat
  MATCH_WIN: 100,           // Victoire en match
  MATCH_LOSS: 30,           // Défaite en match (pour ne pas décourager)
  MATCH_DRAW: 50,           // Match nul
  STORY_CHAPTER: 75,        // Complétion d'un chapitre histoire
  STORY_CHAPTER_FIRST: 150, // Premier succès sur un chapitre
  DAILY_LOGIN: 20,          // Connexion quotidienne
} as const

export const COIN_COSTS = {
  CHANGE_PSEUDO: 200,       // Coût du changement de pseudo
} as const

// ─── ATTRIBUTION ──────────────────────────────────────────────────────────────

/**
 * Récompense pour l'envoi d'un message dans le chat.
 * Limite anti-spam : max 1 gain par message, vérification côté serveur conseillée.
 */
export async function rewardChatMessage(userId: string): Promise<number> {
  const amount = COIN_REWARDS.CHAT_MESSAGE
  await incrementUserCoins(userId, amount)
  return amount
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
  const amount = rewardMap[result]
  await incrementUserCoins(userId, amount)
  return amount
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
  await incrementUserCoins(userId, amount)
  return amount
}

/**
 * Récompense de connexion quotidienne.
 */
export async function rewardDailyLogin(userId: string): Promise<number> {
  const amount = COIN_REWARDS.DAILY_LOGIN
  await incrementUserCoins(userId, amount)
  return amount
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