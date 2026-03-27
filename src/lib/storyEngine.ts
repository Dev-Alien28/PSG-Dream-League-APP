// src/lib/storyEngine.ts

import type { Team, Formation } from '@/types/match'
import type { PlayerPosition } from '@/types/card'
import { saveChapterProgress, getUserStoryProgress } from './supabase'
import { rewardStoryChapter } from './coinEngine'
import { generateBotTeam } from './matchmaking'  // ← import direct, plus de require()

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface StoryObjective {
  type: 'win' | 'score_goals' | 'clean_sheet' | 'win_by_margin'
  value?: number
  label: string
}

export interface ChapterData {
  id: number
  title: string
  subtitle: string
  description: string
  coverImage: string
  opponent: Team
  objectives: StoryObjective[]
  unlockAfter: number | null
  reward: number
}

export interface ChapterProgress {
  chapitre: number
  completed: boolean
  stars?: number
}

// ─── CHAPITRES ────────────────────────────────────────────────────────────────

export async function loadChapter(chapterId: number): Promise<ChapterData | null> {
  try {
    const data = await import(`@/data/story/chapter_${chapterId}.json`)
    return data.default as ChapterData
  } catch {
    console.error(`[storyEngine] loadChapter: chapitre ${chapterId} introuvable`)
    return null
  }
}

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

export async function isChapterUnlocked(
  userId: string,
  chapter: ChapterData
): Promise<boolean> {
  if (chapter.unlockAfter === null) return true

  const progress = await getUserStoryProgress(userId)
  return progress[chapter.unlockAfter] === true
}

export async function completeChapter(
  userId: string,
  chapterId: number
): Promise<{ coinsEarned: number; isFirstTime: boolean }> {
  const progress = await getUserStoryProgress(userId)
  const isFirstTime = !progress[chapterId]

  await saveChapterProgress(userId, chapterId, )
  const coinsEarned = await rewardStoryChapter(userId, isFirstTime)

  return { coinsEarned, isFirstTime }
}

// ─── ÉVALUATION DES OBJECTIFS ─────────────────────────────────────────────────

export interface MatchOutcome {
  playerScore: number
  opponentScore: number
  playerWon: boolean
}

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

export function buildChapterOpponentTeam(params: {
  pseudo: string
  formation: Formation
  overallTarget: number
}): Team {
  const team = generateBotTeam(params.overallTarget)

  return {
    ...team,
    pseudo: params.pseudo,
    formation: params.formation,
  }
}