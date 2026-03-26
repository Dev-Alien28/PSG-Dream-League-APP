// src/i18n/config.ts

import type { Language } from '@/types/user'

export const SUPPORTED_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'pt-BR', label: 'Português (BR)', flag: '🇧🇷' },
]

export const DEFAULT_LANGUAGE: Language = 'fr'

export function getLanguageLabel(code: Language): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code
}

export function getLanguageFlag(code: Language): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.flag ?? '🌐'
}