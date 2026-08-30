// src/lib/langInit.ts
// ✅ Appeler cette fonction après login et au démarrage de l'app
// pour synchroniser la langue Supabase → localStorage → UI

import type { User } from '@/types/user'
import { setAppLanguage } from '@/i18n/useTranslation'

export function initUserLanguage(user: User) {
  setAppLanguage(user.primary_language)
}