// src/lib/storyEngine.ts

import type { Team, Formation } from '@/types/match'
import type { PlayerPosition } from '@/types/card'
import { saveChapterProgress, getUserStoryProgress } from './supabase'
import { rewardStoryChapter } from './coinEngine'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface StoryObjective {
  type: 'win' | 'score_goals' | 'clean_sheet' | 'win_by_margin'
  value?: number   // Ex: score 3 buts, gagner par 2 buts d'écart
  label: string    // Description lisible
}

export interface ChapterData {
  id: number
  title: string
  subtitle: string
  description: string       // Narration PSG (contexte historique)
  coverImage: string        // Image d'illustration
  opponent: Team            // Équipe adverse prédéfinie
  objectives: StoryObjective[]
  unlockAfter: number | null  // ID du chapitre précédent requis (null = premier)
  reward: number              // PSG Coins en bonus (en plus de storyEngine)
}

export interface ChapterProgress {
  chapitre: number
  completed: boolean
  stars?: number // 1-3 selon les objectifs remplis
}

// ─── CHAPITRES ────────────────────────────────────────────────────────────────

/**
 * Charge les données d'un chapitre depuis les fichiers statiques.
 * À appeler côté serveur (Server Component ou API route).
 */
export async function loadChapter(chapterId: number): Promise<ChapterData | null> {
  try {
    const data = await import(`@/data/story/chapter_${chapterId}.json`)
    return data.default as ChapterData
  } catch {
    console.error(`[storyEngine] loadChapter: chapitre ${chapterId} introuvable`)
    return null
  }
}

/**
 * Retourne la liste de tous les chapitres disponibles (métadonnées).
 */
export async function loadAllChapters(): Promise<ChapterData[]> {
  const chapters: ChapterData[] = []
  let id = 1
  while (true) {
    const chapter = await loadChapter(id)
    if (!chapter) break
    chapters.push(chapter)
    id++
  }
  return chapters
}

// ─── PROGRESSION ──────────────────────────────────────────────────────────────

/**
 * Vérifie si un chapitre est débloqué pour un utilisateur.
 */
export async function isChapterUnlocked(
  userId: string,
  chapter: ChapterData
): Promise<boolean> {
  if (chapter.unlockAfter === null) return true // Premier chapitre toujours dispo

  const progress = await getUserStoryProgress(userId)
  return progress[chapter.unlockAfter] === true
}

/**
 * Complète un chapitre : sauvegarde la progression et distribue les récompenses.
 */
export async function completeChapter(
  userId: string,
  chapterId: number
): Promise<{ coinsEarned: number; isFirstTime: boolean }> {
  const progress = await getUserStoryProgress(userId)
  const isFirstTime = !progress[chapterId]

  // Sauvegarder
  await saveChapterProgress(userId, chapterId, true)

  // Récompenser
  const coinsEarned = await rewardStoryChapter(userId, isFirstTime)

  return { coinsEarned, isFirstTime }
}

// ─── ÉVALUATION DES OBJECTIFS ─────────────────────────────────────────────────

export interface MatchOutcome {
  playerScore: number
  opponentScore: number
  playerWon: boolean
}

/**
 * Vérifie si les objectifs d'un chapitre ont été atteints.
 * Retourne le nombre d'objectifs remplis (pour un système d'étoiles).
 */
export function evaluateObjectives(
  chapter: ChapterData,
  outcome: MatchOutcome
): { passed: boolean; objectivesMetCount: number; total: number } {
  let metCount = 0

  for (const obj of chapter.objectives) {
    switch (obj.type) {
      case 'win':
        if (outcome.playerWon) metCount++
        break
      case 'score_goals':
        if (outcome.playerScore >= (obj.value ?? 1)) metCount++
        break
      case 'clean_sheet':
        if (outcome.opponentScore === 0) metCount++
        break
      case 'win_by_margin':
        if (outcome.playerWon && outcome.playerScore - outcome.opponentScore >= (obj.value ?? 2)) metCount++
        break
    }
  }

  // L'objectif principal (win) doit toujours être rempli pour valider le chapitre
  const mainObjectivePassed = chapter.objectives
    .filter((o) => o.type === 'win')
    .every(() => outcome.playerWon)

  return {
    passed: mainObjectivePassed,
    objectivesMetCount: metCount,
    total: chapter.objectives.length,
  }
}

// ─── RÉSUMÉ CHAPITRES ─────────────────────────────────────────────────────────

/**
 * Retourne l'état de chaque chapitre (débloqué, complété) pour l'affichage.
 */
export async function getChaptersStatus(
  userId: string,
  chapters: ChapterData[]
): Promise<Array<ChapterData & { unlocked: boolean; completed: boolean }>> {
  const progress = await getUserStoryProgress(userId)

  return chapters.map((chapter) => ({
    ...chapter,
    unlocked: chapter.unlockAfter === null || progress[chapter.unlockAfter] === true,
    completed: progress[chapter.id] === true,
  }))
}

// ─── BUILDER D'ÉQUIPE ADVERSE ─────────────────────────────────────────────────

/**
 * Construit l'équipe adverse d'un chapitre avec formation et overall définis.
 * Utilisé pour créer les JSON de data/story sans dépendance à la DB.
 */
export function buildChapterOpponentTeam(params: {
  pseudo: string
  formation: Formation
  overallTarget: number
}): Team {
  // Import dynamique pour éviter une dépendance circulaire
  const { generateBotTeam } = require('./matchmaking')
  const team = generateBotTeam(params.overallTarget)

  return {
    ...team,
    pseudo: params.pseudo,
    formation: params.formation,
  }
}