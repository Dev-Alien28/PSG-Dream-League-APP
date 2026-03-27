// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { User, UserProfile } from '@/types/user'
import type { Card, OwnedCard } from '@/types/card'
import type { MatchResult } from '@/types/match'
import { allCards } from '../../data/packs'  // ← chemin alias corrigé

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── HELPER ───────────────────────────────────────────────────────────────────

function calculerOverall(stats: Record<string, number>): number {
  const valeurs = Object.values(stats).filter((v) => typeof v === 'number')
  return Math.round(valeurs.reduce((a, b) => a + b, 0) / valeurs.length)
}

function rowVersOwnedCard(row: any): OwnedCard | null {
  const carteJSON = (allCards as any[]).find((c) => c.id === row.card_id)
  if (!carteJSON) return null

  return {
    id: carteJSON.id,
    name: carteJSON.nom,
    category: carteJSON.type,
    rarity: carteJSON.rareté,
    position: carteJSON.position,
    image: carteJSON.image,
    stats: {
      ...carteJSON.stats,
      overall: calculerOverall(carteJSON.stats),
    },
    owned_id: row.owned_id,
    user_id: row.user_id,
    obtained_at: row.obtained_at,
    pack_source: row.pack_source,
  }
}

// ─── USER ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[supabase] getUserProfile:', error.message)
    return null
  }
  return data as UserProfile
}

export async function updateUserPseudo(userId: string, pseudo: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ pseudo })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] updateUserPseudo:', error.message)
    return false
  }
  return true
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] updateUserAvatar:', error.message)
    return false
  }
  return true
}

export async function updateUserLanguages(
  userId: string,
  primaryLanguage: string,
  secondaryLanguages: string[]
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      primary_language: primaryLanguage,
      secondary_languages: secondaryLanguages,
    })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] updateUserLanguages:', error.message)
    return false
  }
  return true
}

// ─── COINS ────────────────────────────────────────────────────────────────────

export async function getUserCoins(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('coins')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[supabase] getUserCoins:', error.message)
    return 0
  }
  return data.coins ?? 0
}

export async function updateUserCoins(userId: string, coins: number): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ coins })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] updateUserCoins:', error.message)
    return false
  }
  return true
}

export async function incrementUserCoins(userId: string, amount: number): Promise<boolean> {
  const current = await getUserCoins(userId)
  return updateUserCoins(userId, current + amount)
}

export async function decrementUserCoins(userId: string, amount: number): Promise<boolean> {
  const current = await getUserCoins(userId)
  if (current < amount) return false
  return updateUserCoins(userId, current - amount)
}

// ─── COLLECTION ───────────────────────────────────────────────────────────────

export async function getUserCollection(userId: string): Promise<OwnedCard[]> {
  const { data, error } = await supabase
    .from('owned_cards')
    .select('*')
    .eq('user_id', userId)
    .order('obtained_at', { ascending: false })

  if (error) {
    console.error('[supabase] getUserCollection:', error.message)
    return []
  }

  return (data ?? []).flatMap((row: any) => {
    const carte = rowVersOwnedCard(row)
    return carte ? [carte] : []
  })
}

export async function addCardToCollection(
  userId: string,
  cardId: string,
  packSource: string
): Promise<OwnedCard | null> {
  const { data, error } = await supabase
    .from('owned_cards')
    .insert({
      user_id: userId,
      card_id: cardId,
      pack_source: packSource,
      obtained_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    console.error('[supabase] addCardToCollection:', error.message)
    return null
  }

  return rowVersOwnedCard(data)
}

// ─── CHAT ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  user_id: string
  pseudo: string
  avatar_url: string | null
  lang: string
  content: string
  created_at: string
}

export async function getChatMessages(lang: string, limit = 50): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('lang', lang)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[supabase] getChatMessages:', error.message)
    return []
  }
  return (data ?? []).reverse() as ChatMessage[]
}

export async function sendChatMessage(
  userId: string,
  pseudo: string,
  avatarUrl: string | null,
  lang: string,
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      pseudo,
      avatar_url: avatarUrl,
      lang,
      content,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('[supabase] sendChatMessage:', error.message)
    return null
  }
  return data as ChatMessage
}

export function subscribeToChatMessages(
  lang: string,
  onMessage: (msg: ChatMessage) => void
) {
  return supabase
    .channel(`chat:${lang}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `lang=eq.${lang}` },
      (payload) => onMessage(payload.new as ChatMessage)
    )
    .subscribe()
}

// ─── MATCHS ───────────────────────────────────────────────────────────────────

export async function saveMatchResult(result: MatchResult): Promise<boolean> {
  const { error } = await supabase.from('matches').insert({
    id: result.id,
    home_user_id: result.home.user_id,
    away_user_id: result.away.user_id,
    home_pseudo: result.home.pseudo,
    away_pseudo: result.away.pseudo,
    home_score: result.score_home,
    away_score: result.score_away,
    events: result.events,
    winner: result.winner,
    coins_earned: result.coins_earned,
    played_at: result.played_at,
    is_bot: result.is_bot,
  })

  if (error) {
    console.error('[supabase] saveMatchResult:', error.message)
    return false
  }
  return true
}

export async function getUserMatchHistory(userId: string, limit = 20): Promise<MatchResult[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`home_user_id.eq.${userId},away_user_id.eq.${userId}`)
    .order('played_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[supabase] getUserMatchHistory:', error.message)
    return []
  }
  return data as unknown as MatchResult[]
}

// ─── CLASSEMENT ───────────────────────────────────────────────────────────────

export async function getLeaderboard(limit = 100): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('wins', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[supabase] getLeaderboard:', error.message)
    return []
  }
  return data as UserProfile[]
}

// ─── HISTOIRE ─────────────────────────────────────────────────────────────────

export async function getUserStoryProgress(userId: string): Promise<Record<number, boolean>> {
  const { data, error } = await supabase
    .from('story_progress')
    .select('current_chapter, completed_chapters')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[supabase] getUserStoryProgress:', error.message)
    return {}
  }

  const completed: Record<number, boolean> = {}
  for (const ch of data?.completed_chapters ?? []) {
    completed[ch] = true
  }
  return completed
}

export async function saveChapterProgress(
  userId: string,
  chapitre: number,
  _completed: boolean = true  // ← paramètre ajouté pour correspondre aux appels dans storyEngine
): Promise<boolean> {
  const { data: current } = await supabase
    .from('story_progress')
    .select('completed_chapters, current_chapter')
    .eq('user_id', userId)
    .single()

  const completed = current?.completed_chapters ?? []
  if (!completed.includes(chapitre)) completed.push(chapitre)
  const nextChapter = Math.max(current?.current_chapter ?? 1, chapitre + 1)

  const { error } = await supabase
    .from('story_progress')
    .upsert({
      user_id: userId,
      current_chapter: nextChapter,
      completed_chapters: completed,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('[supabase] saveChapterProgress:', error.message)
    return false
  }
  return true
}

// ─── ÉQUIPE ───────────────────────────────────────────────────────────────────

export async function getUserTeam(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[supabase] getUserTeam:', error.message)
    return null
  }
  return data
}

export async function saveUserTeam(
  userId: string,
  formation: string,
  slots: any[],
  overall: number
): Promise<boolean> {
  const { error } = await supabase
    .from('teams')
    .upsert(
      {
        user_id: userId,
        formation,
        slots,
        overall,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[supabase] saveUserTeam:', error.message)
    return false
  }
  return true
}