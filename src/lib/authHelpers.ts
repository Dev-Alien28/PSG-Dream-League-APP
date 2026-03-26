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

  // 1. Créer le compte Auth Supabase (le trigger handle_new_user crée le profil automatiquement)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo, primary_language: primaryLanguage },
    },
  })

  if (authError || !authData.user) {
    return { user: null, error: authError?.message ?? 'Erreur lors de la création du compte.' }
  }

  // 2. Mettre à jour les secondary_languages (le trigger ne les gère pas)
  if (secondaryLanguages.length > 0) {
    await supabase
      .from('profiles')
      .update({ secondary_languages: secondaryLanguages })
      .eq('id', authData.user.id)
  }

  // 3. Récupérer le profil créé par le trigger
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  if (userError) {
    console.error('[authHelpers] register - fetch profile:', userError.message)
    return { user: null, error: 'Erreur lors de la récupération du profil.' }
  }

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
    localStorage.setItem('psg_remember_me', '1')
  } else {
    localStorage.removeItem('psg_remember_me')
  }

  const { data: userData, error: userError } = await supabase
    .from('profiles')
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
    .from('profiles')
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