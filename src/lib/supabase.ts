// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js'
import type { User, UserProfile } from '@/types/user'
import type { Card, OwnedCard } from '@/types/card'
import type { MatchResult, Formation } from '@/types/match'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

  const { rowToOwnedCard } = await import('./cardData')
  // ✅ FIXED: rowToOwnedCard est async, on attend toutes les promesses
  const results = await Promise.all((data ?? []).map((row: any) => rowToOwnedCard(row)))
  return results.filter((card): card is OwnedCard => card !== null)
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
      base_card_id: cardId,
      pack_source: packSource,
      obtained_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    console.error('[supabase] addCardToCollection:', error.message)
    return null
  }

  const { rowToOwnedCard } = await import('./cardData')
  // ✅ FIXED: await rowToOwnedCard
  return await rowToOwnedCard(data)
}

/**
 * Consomme des doublons identiques pour créer une carte au grade supérieur.
 * Passe par la fonction Postgres `craft_card_upgrade` (voir
 * supabase_migration_grades.sql) pour garantir que la consommation des
 * doublons et la création de la carte améliorée sont atomiques.
 */
export async function craftCardUpgrade(
  userId: string,
  baseCardId: string,
  sourceGrade: string | null,
  nextGrade: string,
  needCount: number
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('craft_card_upgrade', {
    p_user_id: userId,
    p_base_card_id: baseCardId,
    p_source_grade: sourceGrade,
    p_next_grade: nextGrade,
    p_need_count: needCount,
  })

  if (error) {
    console.error('[supabase] craftCardUpgrade:', error.message)
    return { success: false, error: 'Erreur serveur lors du craft.' }
  }
  if (!data?.success) {
    return { success: false, error: data?.error === 'not_enough_duplicates' ? 'Pas assez de doublons.' : 'Erreur lors du craft.' }
  }
  return { success: true }
}

/**
 * Vend les doublons classiques excédentaires d'une carte (une fois son Ω déjà
 * en poche). `quantity` null = vend tout le stock vendable.
 */
export async function sellCardDuplicates(
  userId: string,
  baseCardId: string,
  rarity: string,
  quantity: number | null = null
): Promise<{ success: boolean; sold?: number; gain?: number; error?: string }> {
  const { data, error } = await supabase.rpc('sell_card_duplicates', {
    p_user_id: userId,
    p_base_card_id: baseCardId,
    p_rarity: rarity,
    p_quantity: quantity,
  })

  if (error) {
    console.error('[supabase] sellCardDuplicates:', error.message)
    return { success: false, error: 'Erreur serveur lors de la vente.' }
  }
  if (!data?.success) {
    const messages: Record<string, string> = {
      no_omega: 'Il faut déjà posséder la version Ω de cette carte.',
      none: 'Aucun doublon classique à vendre.',
      not_sellable: 'Cette rareté ne peut pas être vendue.',
    }
    return { success: false, error: messages[data?.error] ?? 'Erreur lors de la vente.' }
  }
  return { success: true, sold: data.sold, gain: data.gain }
}

/**
 * Récompense un message de chat, avec limite anti-spam vérifiée côté
 * serveur (voir supabase_migration_chat_antispam.sql) — impossible à
 * contourner en appelant directement l'API depuis le client.
 * Retourne 0 si le délai n'est pas encore écoulé.
 */
export async function rewardChatMessageServer(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('reward_chat_message', { p_user_id: userId })

  if (error) {
    console.error('[supabase] rewardChatMessageServer:', error.message)
    return 0
  }
  if (!data?.success) return 0
  return data.amount ?? 0
}

// ─── ÉQUIPE ───────────────────────────────────────────────────────────────────
// Nécessite la table `user_teams` — voir supabase_migration_user_teams.sql à la
// racine du projet pour la créer dans Supabase (SQL Editor).

export interface StoredTeamSlot {
  position: string
  owned_id: string | null
}

export interface StoredTeam {
  formation: Formation
  slots: StoredTeamSlot[]
}

export async function getUserTeam(userId: string): Promise<StoredTeam | null> {
  const { data, error } = await supabase
    .from('user_teams')
    .select('formation, slots')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[supabase] getUserTeam:', error.message)
    return null
  }
  if (!data) return null
  return { formation: data.formation as Formation, slots: (data.slots as StoredTeamSlot[]) ?? [] }
}

export async function saveUserTeam(
  userId: string,
  formation: Formation,
  slots: StoredTeamSlot[]
): Promise<boolean> {
  const { error } = await supabase
    .from('user_teams')
    .upsert(
      { user_id: userId, formation, slots, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[supabase] saveUserTeam:', error.message)
    return false
  }
  return true
}

// ─── BOUTIQUE : BOOSTS DE COINS ────────────────────────────────────────────────
// Nécessite les colonnes ajoutées par supabase_migration_boutique.sql.

export async function activateCoinBoost(userId: string, durationMs: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + durationMs).toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({ boost_expires_at: expiresAt })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] activateCoinBoost:', error.message)
    return false
  }
  return true
}

export async function isCoinBoostActive(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('boost_expires_at')
    .eq('id', userId)
    .single()

  if (error || !data?.boost_expires_at) return false
  return new Date(data.boost_expires_at).getTime() > Date.now()
}

// ─── BOUTIQUE : COULEURS D'ÉQUIPE ──────────────────────────────────────────────

export async function unlockTeamColor(userId: string, colorKey: string, currentUnlocked: string[]): Promise<boolean> {
  const updated = Array.from(new Set([...currentUnlocked, colorKey]))
  const { error } = await supabase
    .from('profiles')
    .update({ unlocked_colors: updated })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] unlockTeamColor:', error.message)
    return false
  }
  return true
}

export async function setSelectedTeamColor(userId: string, colorKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ selected_color: colorKey })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] setSelectedTeamColor:', error.message)
    return false
  }
  return true
}

// ─── PITY (garantie Legend) ─────────────────────────────────────────────────
// Nécessite la colonne ajoutée par supabase_migration_pity.sql.
// Compteur incrémenté à chaque ouverture du Pack Légende sans carte Legend,
// remis à 0 dès qu'une est obtenue (par chance ou par garantie).

export async function getPityLegend(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('pity_legend')
    .eq('id', userId)
    .single()

  if (error || !data) return 0
  return data.pity_legend ?? 0
}

export async function setPityLegend(userId: string, value: number): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ pity_legend: Math.max(0, value) })
    .eq('id', userId)

  if (error) {
    console.error('[supabase] setPityLegend:', error.message)
    return false
  }
  return true
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

export async function getChatMessages(lang: string, limit = 80): Promise<ChatMessage[]> {
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
    })
    .select()
    .single()

  if (error) {
    console.error('[supabase] sendChatMessage:', error.message)
    return null
  }
  return data as ChatMessage
}

// ✅ FIXED: subscribeToChatMessages — retourne le channel avant .subscribe()
// et accepte un callback onStatus pour éviter la double subscription
export function subscribeToChatMessages(
  lang: string,
  onMessage: (msg: ChatMessage) => void,
  onStatus?: (status: string) => void
) {
  const channel = supabase
    .channel(`chat-room-${lang}`, {
      config: {
        broadcast: { self: false },
      },
    })
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `lang=eq.${lang}`,
      },
      (payload: any) => {
        if (payload.new) {
          onMessage(payload.new as ChatMessage)
        }
      }
    )

  // ✅ Une seule subscription, avec le callback de statut intégré
  channel.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[chat] ✅ Realtime connecté pour lang=${lang}`)
    }
    if (status === 'CHANNEL_ERROR') {
      console.error(`[chat] ❌ Erreur Realtime pour lang=${lang}`)
    }
    if (status === 'TIMED_OUT') {
      console.warn(`[chat] ⏰ Timeout Realtime pour lang=${lang}`)
    }
    onStatus?.(status)
  })

  // ✅ Retourne le channel (et non le résultat de .subscribe())
  return channel
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
  chapitre: number
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
    .upsert(
      {
        user_id: userId,
        current_chapter: nextChapter,
        completed_chapters: completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('[supabase] saveChapterProgress:', error.message)
    return false
  }
  return true
}