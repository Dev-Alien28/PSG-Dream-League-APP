// src/lib/authHelpers.ts

import { supabase } from './supabase'
import type { User } from '@/types/user'
import type { Language } from '@/types/user'

export interface RegisterPayload {
  email: string
  password: string
  pseudo: string
  primaryLanguage: Language
  secondaryLanguages: Language[]
}

// ─── INSCRIPTION ──────────────────────────────────────────────────────────────

export async function register(payload: RegisterPayload): Promise<{ user: User | null; error: string | null }> {
  const { email, password, pseudo, primaryLanguage, secondaryLanguages } = payload

  // 1. Créer le compte Auth Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo },
    },
  })

  if (authError || !authData.user) {
    return { user: null, error: authError?.message ?? 'Erreur lors de la création du compte.' }
  }

  // 2. Insérer le profil utilisateur dans la table `users`
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      pseudo,
      coins: 500, // Coins de départ
      primary_language: primaryLanguage,
      secondary_languages: secondaryLanguages,
      avatar_url: null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (userError) {
    console.error('[authHelpers] register - insert user:', userError.message)
    return { user: null, error: 'Erreur lors de la création du profil.' }
  }

  // 3. Initialiser les stats de match dans `user_profiles`
  await supabase.from('user_profiles').insert({
    id: authData.user.id,
    total_matches: 0,
    wins: 0,
    losses: 0,
    rank: 0,
  })

  return { user: userData as User, error: null }
}

// ─── CONNEXION ────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Email ou mot de passe incorrect.' }
  }

  if (rememberMe) {
    // Supabase gère la persistance via localStorage par défaut avec persistSession: true
    // On stocke un flag pour l'UX
    localStorage.setItem('psg_remember_me', '1')
  } else {
    localStorage.removeItem('psg_remember_me')
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (userError) {
    return { user: null, error: 'Impossible de récupérer le profil.' }
  }

  return { user: userData as User, error: null }
}

// ─── DÉCONNEXION ──────────────────────────────────────────────────────────────

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
  localStorage.removeItem('psg_remember_me')
}

// ─── SESSION ──────────────────────────────────────────────────────────────────

export async function getSession(): Promise<{ userId: string | null; rememberMe: boolean }> {
  const { data } = await supabase.auth.getSession()
  const rememberMe = localStorage.getItem('psg_remember_me') === '1'

  if (!data.session) return { userId: null, rememberMe: false }
  return { userId: data.session.user.id, rememberMe }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (error) return null
  return userData as User
}

export function onAuthStateChange(callback: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null)
  })
}